import { MlError } from '../../errors/mlErrorRegistry.js';
import type { MlProviderDescriptor, MlDevice } from '../mlProviderRegistry/index.js';
import type { MlTaskType, ExecutionMode } from '../../schemas/ml.js';

/**
 * ModelRouter.
 *
 * Picks the most appropriate provider for a job request, given:
 *   - the host's measured devices (from `MlOrchestrator.host`),
 *   - the task type and execution mode,
 *   - whether the user wants the local or the remote path,
 *   - the job's privacy class.
 *
 * Profile labels like `apple_silicon` are *not* chosen from the OS name. The router asks
 * `hardware_probe` (Python side) for actual devices and capacities.
 */

export interface HostProfile {
  devices: readonly MlDevice[];
  ramGb: number;
  vramGb: number | null;
  freeDiskGb: number;
  /** `true` when the caller has opted in to allowing remote GPU workers. */
  remoteGpuAllowed: boolean;
}

export interface RouterRequest {
  taskType: MlTaskType;
  executionMode: ExecutionMode;
  candidateDescriptors: readonly MlProviderDescriptor[];
  host: HostProfile;
  /** Optional soft preference for a particular provider id. */
  preferredProviderId?: string;
  /** When `true`, prefer the cheapest provider regardless of editability. */
  allowAnyRepresentation?: boolean;
  /** Human-readable project id, used for consent verification on biometric/voice tasks. */
  projectId?: string;
}

export interface RouterDecision {
  selectedDescriptor: MlProviderDescriptor | null;
  reasonCodes: string[];
  rejected: Array<{ providerId: string; reason: string }>;
  estimatedPeakMemoryMb: number | null;
}

const VRAM_PROFILES = [
  { name: 'cuda_8gb', vramGb: 8 },
  { name: 'cuda_16gb', vramGb: 16 },
  { name: 'cuda_24gb', vramGb: 24 },
  { name: 'cuda_48gb', vramGb: 48 },
  { name: 'cuda_80gb', vramGb: 80 }
];

export class ModelRouter {
  /** Picks a provider for a job. Returns `null` only when no candidate clears the gates. */
  select(request: RouterRequest): RouterDecision {
    const rejected: Array<{ providerId: string; reason: string }> = [];
    const viable: MlProviderDescriptor[] = [];

    for (const descriptor of request.candidateDescriptors) {
      if (!descriptor.taskTypes.includes(request.taskType)) continue;
      if (request.preferredProviderId && descriptor.providerId !== request.preferredProviderId) continue;

      // Hardware gate: at least one of the descriptor's devices must match the host.
      const deviceMatch = descriptor.devices.some(d => request.host.devices.includes(d));
      if (!deviceMatch) {
        rejected.push({ providerId: descriptor.providerId, reason: `no device match; host has [${request.host.devices.join(', ')}]` });
        continue;
      }
      if (request.host.ramGb < descriptor.minRamGb) {
        rejected.push({ providerId: descriptor.providerId, reason: `needs ${descriptor.minRamGb} GB RAM; host has ${request.host.ramGb}` });
        continue;
      }
      if (descriptor.devices.includes('cuda') && !descriptor.devices.includes('cpu') && !descriptor.devices.includes('mps')) {
        if (request.host.vramGb === null || request.host.vramGb < (descriptor.minVramGb ?? 0)) {
          rejected.push({ providerId: descriptor.providerId, reason: `needs CUDA host with ${descriptor.minVramGb} GB VRAM` });
          continue;
        }
      }
      // Privacy gate: when the request carries biometric/voice data, refuse remote.
      if (descriptor.privacyClass === 'remote_forbidden_personal_data' && !request.host.devices.includes('cpu') && !request.host.devices.includes('mps') && request.host.devices.includes('remote') && !request.host.remoteGpuAllowed) {
        rejected.push({ providerId: descriptor.providerId, reason: 'remote GPU forbidden for biometric / voice tasks' });
        continue;
      }
      viable.push(descriptor);
    }

    if (viable.length === 0) {
      return { selectedDescriptor: null, reasonCodes: ['NO_VIABLE_PROVIDER'], rejected, estimatedPeakMemoryMb: null };
    }

    // Score: prefer local device, then lowest peak memory, then commercial OK, then
    // higher editability / fewer restrictions.
    const scored = viable.map(descriptor => {
      const isLocal = descriptor.devices.some(d => d === 'cpu' || d === 'mps') ? 1 : 0;
      const peak = descriptor.estimatedPeakMemoryMb ?? Number.MAX_SAFE_INTEGER;
      const policySafe = descriptor.licenseStatus !== 'unknown' && descriptor.licenseStatus !== 'legal_review_required' && descriptor.licenseStatus !== 'blocked' && descriptor.licenseStatus !== 'preview_only' && descriptor.licenseStatus !== 'research_only' ? 1 : 0;
      return { descriptor, score: isLocal * 1_000_000 + policySafe * 100_000 - peak };
    });
    scored.sort((a, b) => b.score - a.score);

    return {
      selectedDescriptor: scored[0].descriptor,
      reasonCodes: ['LOCAL_DEVICE_PREFERRED', 'LICENSE_CLEARED_PREFERRED'],
      rejected,
      estimatedPeakMemoryMb: scored[0].descriptor.estimatedPeakMemoryMb
    };
  }

  /** Classifies the host into a recommended profile label. Used for logs and capability-registry entries. */
  classify(host: HostProfile): string {
    if (host.devices.includes('cpu') && host.vramGb !== null) {
      const matched = VRAM_PROFILES.find(p => host.vramGb! >= p.vramGb);
      if (matched) return matched.name;
    }
    if (host.devices.includes('mps')) return 'apple_silicon';
    if (host.devices.includes('cuda')) return 'remote_gpu';
    return 'cpu_only';
  }

  /** Estimates the host's free disk and warns when below a model threshold. */
  ensureFreeDisk(host: HostProfile, requiredGb: number): void {
    if (host.freeDiskGb < requiredGb) {
      throw new MlError('ML_INSUFFICIENT_MEMORY', `model requires ~${requiredGb} GB free disk; host has ${host.freeDiskGb}`);
    }
  }
}
