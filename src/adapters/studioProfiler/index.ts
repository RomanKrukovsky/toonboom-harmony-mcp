import {
  studioProfileSchema,
  type StudioProfile
} from '../../schemas/studioIntelligence.js';
import { config } from '../../config.js';
import fs from 'fs';
import path from 'path';

export class StudioProfiler {
  private profilesDir: string;
  private profiles: Map<string, StudioProfile> = new Map();

  constructor(profilesDir?: string) {
    this.profilesDir = profilesDir || path.join(config.logDir, 'studio_profiles');
    this.loadProfiles();
  }

  private loadProfiles(): void {
    if (!fs.existsSync(this.profilesDir)) {
      fs.mkdirSync(this.profilesDir, { recursive: true });
      this.createDefaultProfiles();
      return;
    }

    const files = fs.readdirSync(this.profilesDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(this.profilesDir, file), 'utf-8');
        const profile = studioProfileSchema.parse(JSON.parse(content));
        this.profiles.set(profile.profileId, profile);
      } catch (e) {
        console.warn(`Failed to load studio profile ${file}:`, e);
      }
    }

    if (this.profiles.size === 0) {
      this.createDefaultProfiles();
    }
  }

  private createDefaultProfiles(): void {
    const defaults: StudioProfile[] = [
      {
        profileId: 'studio_standard',
        name: 'Standard Studio Pipeline',
        description: 'Balanced editability and quality for general production',
        editability: {
          priority: 0.5,
          maxDeformersPerPart: 3,
          preferredRepresentation: 'peg_transform',
          frameByFrameAllowed: true
        },
        namingConventions: {
          drawingPrefix: 'drw_',
          pegPrefix: 'peg_',
          groupPrefix: 'grp_',
          compositePrefix: 'cmp_',
          cameraPrefix: 'cam_',
          deformerPrefix: 'def_'
        },
        colorManagement: {
          defaultColorSpace: 'sRGB',
          paletteNamingStandard: 'studio_standard'
        },
        qualityThresholds: {
          minSilhouetteQuality: 0.7,
          maxKeyframeReductionError: 0.05,
          requireVectorTypeTVG: true,
          requireEditableGeometry: true
        },
        pipelineDefaults: {
          defaultFps: 24,
          defaultResolution: { width: 1920, height: 1080 },
          defaultDurationSeconds: 6
        }
      },
      {
        profileId: 'studio_highend',
        name: 'High-End Feature Pipeline',
        description: 'Maximum quality, accepts more complex rigs',
        editability: {
          priority: 0.3,
          maxDeformersPerPart: 6,
          preferredRepresentation: 'curve_deformer',
          frameByFrameAllowed: true
        },
        namingConventions: {
          drawingPrefix: 'drw_',
          pegPrefix: 'peg_',
          groupPrefix: 'grp_',
          compositePrefix: 'cmp_',
          cameraPrefix: 'cam_',
          deformerPrefix: 'def_'
        },
        qualityThresholds: {
          minSilhouetteQuality: 0.85,
          maxKeyframeReductionError: 0.02,
          requireVectorTypeTVG: true,
          requireEditableGeometry: false
        },
        pipelineDefaults: {
          defaultFps: 24,
          defaultResolution: { width: 1920, height: 1080 },
          defaultDurationSeconds: 8
        }
      },
      {
        profileId: 'studio_tv_series',
        name: 'TV Series Pipeline',
        description: 'Optimized for speed and reuse across episodes',
        editability: {
          priority: 0.7,
          maxDeformersPerPart: 2,
          preferredRepresentation: 'peg_transform',
          frameByFrameAllowed: false
        },
        namingConventions: {
          drawingPrefix: 'drw_',
          pegPrefix: 'peg_',
          groupPrefix: 'grp_',
          compositePrefix: 'cmp_',
          cameraPrefix: 'cam_',
          deformerPrefix: 'def_'
        },
        qualityThresholds: {
          minSilhouetteQuality: 0.65,
          maxKeyframeReductionError: 0.08,
          requireVectorTypeTVG: true,
          requireEditableGeometry: true
        },
        pipelineDefaults: {
          defaultFps: 24,
          defaultResolution: { width: 1920, height: 1080 },
          defaultDurationSeconds: 4
        }
      }
    ];

    for (const profile of defaults) {
      this.profiles.set(profile.profileId, profile);
      this.saveProfile(profile);
    }
  }

  getProfile(profileId: string): StudioProfile | undefined {
    return this.profiles.get(profileId);
  }

  getAllProfiles(): StudioProfile[] {
    return Array.from(this.profiles.values());
  }

  createProfile(profile: Omit<StudioProfile, 'profileId'> & { profileId?: string }): StudioProfile {
    const profileId = profile.profileId || `studio_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const fullProfile: StudioProfile = { ...profile, profileId };
    const validated = studioProfileSchema.parse(fullProfile);
    this.profiles.set(profileId, validated);
    this.saveProfile(validated);
    return validated;
  }

  saveProfile(profile: StudioProfile): void {
    const filePath = path.join(this.profilesDir, `${profile.profileId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(profile, null, 2), 'utf-8');
  }

  deleteProfile(profileId: string): boolean {
    if (this.profiles.delete(profileId)) {
      const filePath = path.join(this.profilesDir, `${profileId}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return true;
    }
    return false;
  }

  validateAgainstProfile(manifest: any, profileId: string): { passed: boolean; issues: string[] } {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      return { passed: false, issues: [`Profile ${profileId} not found`] };
    }

    const issues: string[] = [];

    // Check vector type
    if (profile.qualityThresholds?.requireVectorTypeTVG) {
      const vectorType = manifest.diagnostics?.capability?.vectorBackend;
      if (vectorType !== 'harmony_vectorize' && vectorType !== 'python_dom_shapes') {
        issues.push(`Vector type ${vectorType} does not meet TVG requirement`);
      }
    }

    // Check keyframe reduction error
    if (profile.qualityThresholds?.maxKeyframeReductionError !== undefined) {
      // This would need motion track data to validate
    }

    // Check naming conventions
    if (profile.namingConventions) {
      // Could validate node names against conventions
    }

    return { passed: issues.length === 0, issues };
  }
}