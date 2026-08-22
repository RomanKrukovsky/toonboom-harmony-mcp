import fs from 'fs';
import { config } from '../../config.js';
import { HarmonyPython } from '../../adapters/harmonyPython.js';
export class CapabilityRegistry {
    static capabilityMatrix = {
        'open_project': {
            operation: 'open_project',
            status: 'adapter_contract_verified',
            description: 'Open or probe an existing Harmony .xstage project',
            backend: 'python_api',
            requiresLicense: true,
            requiresRealHarmony: true
        },
        'create_project': {
            operation: 'create_project',
            status: 'adapter_contract_verified',
            description: 'Create a new Harmony project directory and .xstage structure',
            backend: 'harmony_cli',
            requiresLicense: true,
            requiresRealHarmony: true
        },
        'create_composite_display_write_chain': {
            operation: 'create_composite_display_write_chain',
            status: 'adapter_contract_verified',
            description: 'Build core Composite -> Display and Composite -> Write node connections',
            backend: 'python_api',
            requiresLicense: true,
            requiresRealHarmony: true
        },
        'import_image_as_drawing': {
            operation: 'import_image_as_drawing',
            status: 'adapter_contract_verified',
            description: 'Import PNG/PSD asset into a new Drawing/Read node',
            backend: 'python_api',
            requiresLicense: true,
            requiresRealHarmony: true
        },
        'create_node': {
            operation: 'create_node',
            status: 'adapter_contract_verified',
            description: 'Create Peg, Drawing, Camera, Composite, or Effect node',
            backend: 'python_api',
            requiresLicense: true,
            requiresRealHarmony: true
        },
        'connect_nodes': {
            operation: 'connect_nodes',
            status: 'adapter_contract_verified',
            description: 'Establish node port connections',
            backend: 'python_api',
            requiresLicense: true,
            requiresRealHarmony: true
        },
        'set_node_position': {
            operation: 'set_node_position',
            status: 'adapter_contract_verified',
            description: 'Set X, Y, Z coordinates on Peg or Drawing nodes',
            backend: 'python_api',
            requiresLicense: true,
            requiresRealHarmony: true
        },
        'set_node_scale': {
            operation: 'set_node_scale',
            status: 'adapter_contract_verified',
            description: 'Set scaling factors on Peg or Drawing nodes',
            backend: 'python_api',
            requiresLicense: true,
            requiresRealHarmony: true
        },
        'set_node_attr': {
            operation: 'set_node_attr',
            status: 'adapter_contract_verified',
            description: 'Set node attribute values or keyframe values',
            backend: 'python_api',
            requiresLicense: true,
            requiresRealHarmony: true
        },
        'render_preview': {
            operation: 'render_preview',
            status: 'adapter_contract_verified',
            description: 'Render frame or movie via Harmony render CLI or Python API',
            backend: 'harmony_cli',
            requiresLicense: true,
            requiresRealHarmony: true
        },
        'create_master_controllers': {
            operation: 'create_master_controllers',
            status: 'simulation_verified',
            description: 'Generate Master Controller UI widgets via Qt Script injection',
            backend: 'qt_script',
            requiresLicense: true,
            requiresRealHarmony: true
        },
        'ui_automation_click': {
            operation: 'ui_automation_click',
            status: 'simulation_verified',
            description: 'Accessibility tree or vision-based UI interaction fallback',
            backend: 'ui_automation',
            requiresLicense: false,
            requiresRealHarmony: true,
            notes: 'Requires HARMONY_ALLOW_UI_AUTOMATION=true and visual confidence >= 0.75'
        }
    };
    async detectCapabilities() {
        const binExists = !!config.harmonyBin && fs.existsSync(config.harmonyBin);
        let pythonApiAvailable = false;
        let version = undefined;
        if (binExists) {
            try {
                const pyRes = await HarmonyPython.runCommand('detect', {});
                if (pyRes.status === 'success') {
                    pythonApiAvailable = true;
                    version = pyRes.capabilities?.product_version || '25.0';
                }
            }
            catch {
                pythonApiAvailable = false;
            }
        }
        return {
            isHarmonyInstalled: binExists,
            harmonyVersion: version,
            harmonyBin: config.harmonyBin,
            pythonApiAvailable,
            controlCenterCliAvailable: binExists,
            renderCliAvailable: binExists,
            webccAvailable: false,
            supportedOperations: Object.keys(CapabilityRegistry.capabilityMatrix),
            matrix: CapabilityRegistry.capabilityMatrix
        };
    }
    getOperationStatus(operation) {
        return CapabilityRegistry.capabilityMatrix[operation]?.status || 'experimental';
    }
}
