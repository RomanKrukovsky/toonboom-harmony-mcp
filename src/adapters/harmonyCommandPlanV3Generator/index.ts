import {
  commandPlanV3Schema,
  commandOperationSchema,
  HARMONY_COMMAND_PLAN_V3_SCHEMA_VERSION,
  type CommandPlanV3,
  type CommandOperation
} from '../../schemas/harmonyCommandPlanV3.js';
import type { HarmonyManifestV3 } from '../../schemas/harmonyManifestV3.js';

export class HarmonyCommandPlanV3Generator {
  generate(manifest: HarmonyManifestV3): CommandPlanV3 {
    const planId = `plan_${manifest.manifestId}_${Date.now()}`;
    const operations: CommandOperation[] = [];
    let order = 0;

    // 1. Create palette if present
    if (manifest.palettes && manifest.palettes.length > 0) {
      for (const palette of manifest.palettes) {
        operations.push(this.createOperation('create_palette', order++, {
          paletteId: palette.paletteId,
          name: palette.name
        }, `Create palette: ${palette.name}`));

        for (const color of palette.colors) {
          operations.push(this.createOperation('add_palette_swatch', order++, {
            paletteId: palette.paletteId,
            colorId: color.colorId,
            name: color.name,
            r: color.r,
            g: color.g,
            b: color.b,
            a: color.a
          }, `Add color ${color.name} to palette`));
        }
      }
    }

    // 2. Create groups for each character
    const characterGroups = new Set<string>();
    if (manifest.partDecomposition) {
      characterGroups.add(manifest.partDecomposition.characterId);
    }
    if (manifest.digitalActors) {
      for (const actor of manifest.digitalActors) {
        if (actor.characterId) characterGroups.add(actor.characterId);
      }
    }

    for (const characterId of characterGroups) {
      operations.push(this.createOperation('create_group', order++, {
        groupName: characterId,
        type: 'character'
      }, `Create group for character: ${characterId}`));
    }

    // 3. Create drawing elements and drawings
    if (manifest.drawings) {
      for (const drawing of manifest.drawings) {
        operations.push(this.createOperation('create_drawing_element', order++, {
          partId: drawing.partId,
          elementName: `${drawing.partId}_element`
        }, `Create drawing element for ${drawing.partId}`));

        operations.push(this.createOperation('create_drawing', order++, {
          drawingId: drawing.drawingId,
          partId: drawing.partId,
          name: drawing.name,
          path: drawing.path
        }, `Create drawing: ${drawing.name}`));
      }
    }

    // 4. Create pegs for each part
    const partIds = new Set<string>();
    if (manifest.partDecomposition) {
      for (const part of manifest.partDecomposition.parts) {
        partIds.add(part.partId);
      }
    }

    for (const partId of partIds) {
      operations.push(this.createOperation('create_peg', order++, {
        partId,
        pegName: `${partId}_peg`
      }, `Create peg for ${partId}`));

      operations.push(this.createOperation('set_pivot', order++, {
        partId,
        x: 0,
        y: 0
      }, `Set pivot for ${partId}`));
    }

    // 5. Attach drawings to pegs
    if (manifest.drawings) {
      for (const drawing of manifest.drawings) {
        operations.push(this.createOperation('attach_drawing_to_peg', order++, {
          drawingId: drawing.drawingId,
          partId: drawing.partId
        }, `Attach drawing ${drawing.drawingId} to ${drawing.partId}`));
      }
    }

    // 6. Set motion tracks (transform keyframes)
    if (manifest.motionTracks) {
      for (const track of manifest.motionTracks) {
        for (const keyframe of track.keyframes) {
          operations.push(this.createOperation('set_transform_keyframe', order++, {
            partId: track.partId,
            frame: keyframe.frame,
            position: keyframe.position,
            rotation: keyframe.rotation,
            scale: keyframe.scale
          }, `Set keyframe at frame ${keyframe.frame} for ${track.partId}`));

          operations.push(this.createOperation('set_transform_interpolation', order++, {
            partId: track.partId,
            frame: keyframe.frame,
            interpolation: keyframe.interpolation
          }, `Set interpolation at frame ${keyframe.frame} for ${track.partId}`));
        }
      }
    }

    // 7. Set exposure blocks
    if (manifest.exposureBlocks) {
      for (const exposure of manifest.exposureBlocks) {
        operations.push(this.createOperation('set_exposure', order++, {
          partId: exposure.partId,
          startFrame: exposure.startFrame,
          endFrame: exposure.endFrame,
          drawingId: exposure.drawingId
        }, `Set exposure for ${exposure.partId}`));
      }
    }

    // 8. Create deformers based on routing plan
    if (manifest.representationSegments) {
      const deformerSegments = manifest.representationSegments.filter(seg =>
        ['curve_deformer', 'envelope_deformer', 'bone_deformer'].includes(seg.representation)
      );

      for (const seg of deformerSegments) {
        operations.push(this.createOperation('create_deformer', order++, {
          partId: seg.partId,
          type: seg.representation.replace('_deformer', ''),
          startFrame: seg.startFrame,
          endFrame: seg.endFrame
        }, `Create ${seg.representation} for ${seg.partId}`));
      }
    }

    // 9. Create camera
    if (manifest.cameraTrack) {
      operations.push(this.createOperation('create_camera', order++, {
        cameraName: 'main_camera'
      }, 'Create main camera'));

      for (const keyframe of manifest.cameraTrack.keyframes || []) {
        operations.push(this.createOperation('set_camera_key', order++, {
          frame: keyframe.frame,
          position: keyframe.position,
          scale: keyframe.scale,
          interpolation: keyframe.interpolation
        }, `Set camera keyframe at frame ${keyframe.frame}`));
      }
    }

    // 10. Lock elements for artist review
    if (manifest.criticReports) {
      const humanReviewRequired = manifest.criticReports.some((r: any) => r.humanReviewRequired);
      if (humanReviewRequired) {
        operations.push(this.createOperation('lock_element', order++, {
          elementName: 'scene_root',
          reason: 'Human review required'
        }, 'Lock scene for human review'));
      }
    }

    // 11. Save version
    operations.push(this.createOperation('save_version', order++, {
      versionName: 'v1_ai_studio'
    }, 'Save initial version'));

    // 12. Render preview (optional, commented out for safety)
    // operations.push(this.createOperation('render_preview', order++, {
    //   outputPath: 'preview.png'
    // }, 'Render preview'));

    return commandPlanV3Schema.parse({
      schemaVersion: '3.0',
      planId,
      manifestId: manifest.manifestId,
      createdAt: new Date().toISOString(),
      operations,
      totalOperations: operations.length,
      estimatedExecutionTimeMs: operations.length * 100, // Rough estimate
      requiresHarmony: true,
      whitelistOnly: true,
      provenance: {
        compiler: 'HarmonyCommandPlanV3Generator v1',
        version: HARMONY_COMMAND_PLAN_V3_SCHEMA_VERSION,
        manifestSchemaVersion: '3.0'
      },
      rollbackPlan: {
        supported: true,
        strategy: 'restore_snapshot'
      }
    });
  }

  private createOperation(
    operation: string,
    order: number,
    parameters: Record<string, any>,
    description: string
  ): CommandOperation {
    return commandOperationSchema.parse({
      operation,
      order,
      parameters,
      description,
      rollbackStrategy: 'restore_snapshot'
    });
  }
}
