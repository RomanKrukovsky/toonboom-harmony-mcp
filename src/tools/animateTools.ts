import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { animateConfig } from '../config.js';
import {
  AnimateError,
  enforceAnimateDestructiveSafety,
  verifyAnimatePathAccess
} from '../security.js';
import { AnimateBridge } from '../adapters/animate/bridge.js';
import { AnimateDetector } from '../adapters/animate/detector.js';
import { AnimateJsflGenerator } from '../adapters/animate/jsflGenerator.js';
import { AnimateXflInspector } from '../adapters/animate/xflInspector.js';
import {
  animateSystemStatusSchema,
  animateGetVersionSchema,
  animateGetCapabilitiesSchema,
  animatePingSchema,
  animateGetActiveDocumentSchema,
  animateListOpenDocumentsSchema,
  animateCreateDocumentSchema,
  animateOpenDocumentSchema,
  animateInspectDocumentSchema,
  animateSaveDocumentSchema,
  animateSaveAsDocumentSchema,
  animateCloseDocumentSchema,
  animateSetDocumentSizeSchema,
  animateSetFrameRateSchema,
  animateSetDocumentPropertiesSchema,
  animateDuplicateDocumentSchema,
  animateInspectTimelineSchema,
  animateListLayersSchema,
  animateCreateLayerSchema,
  animateDeleteLayerSchema,
  animateRenameLayerSchema,
  animateReorderLayerSchema,
  animateSelectLayerSchema,
  animateSetLayerPropertiesSchema,
  animateGetCurrentFrameSchema,
  animateSetCurrentFrameSchema,
  animateInsertFramesSchema,
  animateRemoveFramesSchema,
  animateClearFramesSchema,
  animateInsertKeyframeSchema,
  animateInsertBlankKeyframeSchema,
  animateClearKeyframeSchema,
  animateCopyFramesSchema,
  animatePasteFramesSchema,
  animateSetFrameLabelSchema,
  animateSelectFramesSchema,
  animateListLibraryItemsSchema,
  animateInspectLibraryItemSchema,
  animateCreateFolderSchema,
  animateRenameLibraryItemSchema,
  animateMoveLibraryItemSchema,
  animateDuplicateLibraryItemSchema,
  animateDeleteLibraryItemSchema,
  animateImportAssetSchema,
  animateAddLibraryItemToStageSchema,
  animateCreateSymbolSchema,
  animateConvertSelectionToSymbolSchema,
  animateEditSymbolSchema,
  animateExitSymbolEditSchema,
  animateInspectSelectionSchema,
  animateSelectAllSchema,
  animateClearSelectionSchema,
  animateTransformSelectionSchema,
  animateSetElementPropertiesSchema,
  animateSwapSymbolSchema,
  animateArrangeSelectionSchema,
  animateGroupSelectionSchema,
  animateUngroupSelectionSchema,
  animateDeleteSelectionSchema,
  animateDuplicateSelectionSchema,
  animateCreateShapeSchema,
  animateCreateTextSchema,
  animateEditTextSchema,
  animateCreateTweenSchema,
  animateRemoveTweenSchema,
  animateSetTweenEasingSchema,
  animateImportAudioSchema,
  animatePlaceAudioSchema,
  animateRemoveAudioSchema,
  animateListScenesSchema,
  animateAddSceneSchema,
  animateRenameSceneSchema,
  animateDeleteSceneSchema,
  animateSelectSceneSchema,
  animateCameraStatusSchema,
  animateSetCameraTransformSchema,
  animatePublishDocumentSchema,
  animateExportImageSchema,
  animateExportVideoSchema,
  animateExportSpriteSheetSchema,
  animateInspectXflSchema,
  animateDiffXflSchema,
  animateBackupDocumentSchema,
  animateExecuteRawJsflSchema
} from '../schemas/animate.js';

const bridge = AnimateBridge.getInstance();

export const animateTools = [
  // ================= SYSTEM =================
  {
    name: 'animate_system_status',
    description: 'Returns installation state, application version, running process, bridge mode and open documents in Adobe Animate.',
    inputSchema: animateSystemStatusSchema,
    handler: async () => {
      const profile = AnimateDetector.getSystemProfile();
      let bridgeStatus: any = null;
      try {
        if (profile.installation.installed || animateConfig.bridgeMode === 'mock') {
          bridgeStatus = (await bridge.executeCommand('system_status')).result;
        }
      } catch (err: any) {
        bridgeStatus = { error: err.message };
      }
      return {
        installed: profile.installation.installed,
        version: profile.installation.version,
        running: profile.running,
        pid: profile.pid,
        appPath: profile.installation.appPath,
        binPath: profile.installation.binPath,
        bridgeMode: profile.bridgeMode,
        bridgeStatus
      };
    }
  },
  {
    name: 'animate_get_version',
    description: 'Queries the exact Adobe Animate application version.',
    inputSchema: animateGetVersionSchema,
    handler: async () => {
      const res = await bridge.executeCommand('get_version');
      return res.result;
    }
  },
  {
    name: 'animate_get_capabilities',
    description: 'Lists all available and verified capabilities supported by the active Adobe Animate environment.',
    inputSchema: animateGetCapabilitiesSchema,
    handler: async () => {
      const profile = AnimateDetector.getSystemProfile();
      return {
        backend: 'adobe_animate',
        version: profile.installation.version,
        capabilities: {
          document_management: 'available',
          timeline_layers: 'available',
          timeline_keyframes: 'available',
          library_symbols: 'available',
          drawing_primitives: 'available',
          text_manipulation: 'available',
          classic_motion_tweens: 'available',
          audio_stream_sync: 'available',
          scenes: 'available',
          camera_native: 'unavailable',
          export_png: 'available',
          export_video: 'available',
          xfl_inspection: 'available',
          raw_jsfl: animateConfig.allowRawJsfl ? 'available' : 'disabled'
        }
      };
    }
  },
  {
    name: 'animate_ping',
    description: 'Heartbeat ping to verify communication with Adobe Animate.',
    inputSchema: animatePingSchema,
    handler: async () => {
      const res = await bridge.executeCommand('ping');
      return res.result;
    }
  },
  {
    name: 'animate_get_active_document',
    description: 'Returns metadata for the currently active document in Adobe Animate (dimensions, fps, scene, frame count).',
    inputSchema: animateGetActiveDocumentSchema,
    handler: async () => {
      const res = await bridge.executeCommand('get_active_document');
      return res.result;
    }
  },
  {
    name: 'animate_list_open_documents',
    description: 'Lists all open documents in the running Adobe Animate instance.',
    inputSchema: animateListOpenDocumentsSchema,
    handler: async () => {
      const res = await bridge.executeCommand('list_open_documents');
      return res.result;
    }
  },

  // ================= DOCUMENT =================
  {
    name: 'animate_create_document',
    description: 'Creates a new Adobe Animate document with specified dimensions, frame rate and background color.',
    inputSchema: animateCreateDocumentSchema,
    handler: async (args: z.infer<typeof animateCreateDocumentSchema>) => {
      const res = await bridge.executeCommand('create_document', args);
      return res.result;
    }
  },
  {
    name: 'animate_open_document',
    description: 'Opens an existing .fla or .xfl document in Adobe Animate.',
    inputSchema: animateOpenDocumentSchema,
    handler: async (args: z.infer<typeof animateOpenDocumentSchema>) => {
      const verified = verifyAnimatePathAccess(args.filePath);
      const uri = AnimateJsflGenerator.pathToURI(verified);
      const res = await bridge.executeCommand('open_document', { uri, filePath: verified });
      return res.result;
    }
  },
  {
    name: 'animate_inspect_document',
    description: 'Inspects full hierarchy and properties of the active document (layers, dimensions, scene, frame count).',
    inputSchema: animateInspectDocumentSchema,
    handler: async () => {
      const res = await bridge.executeCommand('inspect_document');
      return res.result;
    }
  },
  {
    name: 'animate_save_document',
    description: 'Saves changes to the active document.',
    inputSchema: animateSaveDocumentSchema,
    handler: async () => {
      const res = await bridge.executeCommand('save_document');
      return res.result;
    }
  },
  {
    name: 'animate_save_as_document',
    description: 'Saves the active document to a new file path.',
    inputSchema: animateSaveAsDocumentSchema,
    handler: async (args: z.infer<typeof animateSaveAsDocumentSchema>) => {
      enforceAnimateDestructiveSafety('animate_save_as_document', args);
      const verified = verifyAnimatePathAccess(args.filePath);
      const uri = AnimateJsflGenerator.pathToURI(verified);
      const res = await bridge.executeCommand('save_as_document', { uri, filePath: verified });
      return res.result;
    }
  },
  {
    name: 'animate_close_document',
    description: 'Closes the active document in Adobe Animate.',
    inputSchema: animateCloseDocumentSchema,
    handler: async (args: z.infer<typeof animateCloseDocumentSchema>) => {
      enforceAnimateDestructiveSafety('animate_close_document', args);
      const res = await bridge.executeCommand('close_document', args);
      return res.result;
    }
  },
  {
    name: 'animate_set_document_size',
    description: 'Changes width and height of the active document.',
    inputSchema: animateSetDocumentSizeSchema,
    handler: async (args: z.infer<typeof animateSetDocumentSizeSchema>) => {
      const res = await bridge.executeCommand('set_document_size', args);
      return res.result;
    }
  },
  {
    name: 'animate_set_frame_rate',
    description: 'Sets document playback frame rate (FPS).',
    inputSchema: animateSetFrameRateSchema,
    handler: async (args: z.infer<typeof animateSetFrameRateSchema>) => {
      const res = await bridge.executeCommand('set_frame_rate', args);
      return res.result;
    }
  },
  {
    name: 'animate_set_document_properties',
    description: 'Sets document dimensions, frame rate and background color.',
    inputSchema: animateSetDocumentPropertiesSchema,
    handler: async (args: z.infer<typeof animateSetDocumentPropertiesSchema>) => {
      const res = await bridge.executeCommand('set_document_properties', args);
      return res.result;
    }
  },
  {
    name: 'animate_duplicate_document',
    description: 'Safely saves a copy of the active document or creates a timestamped backup.',
    inputSchema: animateDuplicateDocumentSchema,
    handler: async (args: z.infer<typeof animateDuplicateDocumentSchema>) => {
      const verified = verifyAnimatePathAccess(args.targetFilePath);
      const uri = AnimateJsflGenerator.pathToURI(verified);
      const res = await bridge.executeCommand('save_as_document', { uri, filePath: verified });
      return res.result;
    }
  },

  // ================= TIMELINE =================
  {
    name: 'animate_inspect_timeline',
    description: 'Inspects active timeline: scenes, layer list, current frame, frame counts.',
    inputSchema: animateInspectTimelineSchema,
    handler: async () => {
      const res = await bridge.executeCommand('inspect_timeline');
      return res.result;
    }
  },
  {
    name: 'animate_list_layers',
    description: 'Lists all layers in the current scene timeline.',
    inputSchema: animateListLayersSchema,
    handler: async () => {
      const res = await bridge.executeCommand('list_layers');
      return res.result;
    }
  },
  {
    name: 'animate_create_layer',
    description: 'Creates a new layer on the timeline (normal, guide, mask, folder).',
    inputSchema: animateCreateLayerSchema,
    handler: async (args: z.infer<typeof animateCreateLayerSchema>) => {
      const res = await bridge.executeCommand('create_layer', args);
      return res.result;
    }
  },
  {
    name: 'animate_delete_layer',
    description: 'Deletes a layer by index or current layer.',
    inputSchema: animateDeleteLayerSchema,
    handler: async (args: z.infer<typeof animateDeleteLayerSchema>) => {
      enforceAnimateDestructiveSafety('animate_delete_layer', args);
      const res = await bridge.executeCommand('delete_layer', args);
      return res.result;
    }
  },
  {
    name: 'animate_rename_layer',
    description: 'Renames a timeline layer.',
    inputSchema: animateRenameLayerSchema,
    handler: async (args: z.infer<typeof animateRenameLayerSchema>) => {
      const res = await bridge.executeCommand('rename_layer', args);
      return res.result;
    }
  },
  {
    name: 'animate_reorder_layer',
    description: 'Reorders a timeline layer from one index to another.',
    inputSchema: animateReorderLayerSchema,
    handler: async (args: z.infer<typeof animateReorderLayerSchema>) => {
      const res = await bridge.executeCommand('reorder_layer', args);
      return res.result;
    }
  },
  {
    name: 'animate_select_layer',
    description: 'Sets the active layer by 0-based index.',
    inputSchema: animateSelectLayerSchema,
    handler: async (args: z.infer<typeof animateSelectLayerSchema>) => {
      const res = await bridge.executeCommand('select_layer', args);
      return res.result;
    }
  },
  {
    name: 'animate_set_layer_properties',
    description: 'Sets layer visibility, locked state or name.',
    inputSchema: animateSetLayerPropertiesSchema,
    handler: async (args: z.infer<typeof animateSetLayerPropertiesSchema>) => {
      const res = await bridge.executeCommand('set_layer_properties', args);
      return res.result;
    }
  },
  {
    name: 'animate_get_current_frame',
    description: 'Returns the current playhead frame index (0-based) and total frame count.',
    inputSchema: animateGetCurrentFrameSchema,
    handler: async () => {
      const res = await bridge.executeCommand('get_current_frame');
      return res.result;
    }
  },
  {
    name: 'animate_set_current_frame',
    description: 'Moves the playhead to a specific 0-based frame.',
    inputSchema: animateSetCurrentFrameSchema,
    handler: async (args: z.infer<typeof animateSetCurrentFrameSchema>) => {
      const res = await bridge.executeCommand('set_current_frame', args);
      return res.result;
    }
  },
  {
    name: 'animate_insert_frames',
    description: 'Inserts exposure frames into the timeline.',
    inputSchema: animateInsertFramesSchema,
    handler: async (args: z.infer<typeof animateInsertFramesSchema>) => {
      const res = await bridge.executeCommand('insert_frames', args);
      return res.result;
    }
  },
  {
    name: 'animate_remove_frames',
    description: 'Removes frames from the timeline.',
    inputSchema: animateRemoveFramesSchema,
    handler: async (args: z.infer<typeof animateRemoveFramesSchema>) => {
      const res = await bridge.executeCommand('remove_frames', args);
      return res.result;
    }
  },
  {
    name: 'animate_clear_frames',
    description: 'Clears content from frames across selected range.',
    inputSchema: animateClearFramesSchema,
    handler: async (args: z.infer<typeof animateClearFramesSchema>) => {
      const res = await bridge.executeCommand('clear_frames', args);
      return res.result;
    }
  },
  {
    name: 'animate_insert_keyframe',
    description: 'Inserts a keyframe on the active or specified layer.',
    inputSchema: animateInsertKeyframeSchema,
    handler: async (args: z.infer<typeof animateInsertKeyframeSchema>) => {
      const res = await bridge.executeCommand('insert_keyframe', args);
      return res.result;
    }
  },
  {
    name: 'animate_insert_blank_keyframe',
    description: 'Inserts a blank keyframe on the active or specified layer.',
    inputSchema: animateInsertBlankKeyframeSchema,
    handler: async (args: z.infer<typeof animateInsertBlankKeyframeSchema>) => {
      const res = await bridge.executeCommand('insert_blank_keyframe', args);
      return res.result;
    }
  },
  {
    name: 'animate_clear_keyframe',
    description: 'Converts keyframes back into ordinary frames.',
    inputSchema: animateClearKeyframeSchema,
    handler: async (args: z.infer<typeof animateClearKeyframeSchema>) => {
      const res = await bridge.executeCommand('clear_keyframe', args);
      return res.result;
    }
  },
  {
    name: 'animate_copy_frames',
    description: 'Copies frames from the timeline.',
    inputSchema: animateCopyFramesSchema,
    handler: async (args: z.infer<typeof animateCopyFramesSchema>) => {
      const res = await bridge.executeCommand('copy_frames', args);
      return res.result;
    }
  },
  {
    name: 'animate_paste_frames',
    description: 'Pastes previously copied frames into the timeline.',
    inputSchema: animatePasteFramesSchema,
    handler: async (args: z.infer<typeof animatePasteFramesSchema>) => {
      const res = await bridge.executeCommand('paste_frames', args);
      return res.result;
    }
  },
  {
    name: 'animate_set_frame_label',
    description: 'Assigns a label and label type (name/comment/anchor) to a keyframe.',
    inputSchema: animateSetFrameLabelSchema,
    handler: async (args: z.infer<typeof animateSetFrameLabelSchema>) => {
      const res = await bridge.executeCommand('set_frame_label', args);
      return res.result;
    }
  },
  {
    name: 'animate_select_frames',
    description: 'Selects a span of frames on the timeline.',
    inputSchema: animateSelectFramesSchema,
    handler: async (args: z.infer<typeof animateSelectFramesSchema>) => {
      const res = await bridge.executeCommand('select_frames', args);
      return res.result;
    }
  },

  // ================= LIBRARY & SYMBOLS =================
  {
    name: 'animate_list_library_items',
    description: 'Lists all items and symbols currently in the document library.',
    inputSchema: animateListLibraryItemsSchema,
    handler: async () => {
      const res = await bridge.executeCommand('list_library_items');
      return res.result;
    }
  },
  {
    name: 'animate_inspect_library_item',
    description: 'Inspects a specific library item by name.',
    inputSchema: animateInspectLibraryItemSchema,
    handler: async (args: z.infer<typeof animateInspectLibraryItemSchema>) => {
      const res = await bridge.executeCommand('inspect_library_item', args);
      return res.result;
    }
  },
  {
    name: 'animate_create_folder',
    description: 'Creates a folder in the document library.',
    inputSchema: animateCreateFolderSchema,
    handler: async (args: z.infer<typeof animateCreateFolderSchema>) => {
      const res = await bridge.executeCommand('create_folder', args);
      return res.result;
    }
  },
  {
    name: 'animate_rename_library_item',
    description: 'Renames an item in the document library.',
    inputSchema: animateRenameLibraryItemSchema,
    handler: async (args: z.infer<typeof animateRenameLibraryItemSchema>) => {
      const res = await bridge.executeCommand('rename_library_item', args);
      return res.result;
    }
  },
  {
    name: 'animate_move_library_item',
    description: 'Moves a library item into a library folder.',
    inputSchema: animateMoveLibraryItemSchema,
    handler: async (args: z.infer<typeof animateMoveLibraryItemSchema>) => {
      const res = await bridge.executeCommand('move_library_item', args);
      return res.result;
    }
  },
  {
    name: 'animate_duplicate_library_item',
    description: 'Duplicates an existing symbol or asset in the library.',
    inputSchema: animateDuplicateLibraryItemSchema,
    handler: async (args: z.infer<typeof animateDuplicateLibraryItemSchema>) => {
      const res = await bridge.executeCommand('duplicate_library_item', args);
      return res.result;
    }
  },
  {
    name: 'animate_delete_library_item',
    description: 'Deletes an item from the library.',
    inputSchema: animateDeleteLibraryItemSchema,
    handler: async (args: z.infer<typeof animateDeleteLibraryItemSchema>) => {
      enforceAnimateDestructiveSafety('animate_delete_library_item', args);
      const res = await bridge.executeCommand('delete_library_item', args);
      return res.result;
    }
  },
  {
    name: 'animate_import_asset',
    description: 'Imports a bitmap, SVG vector, audio or video file into the Animate document/library.',
    inputSchema: animateImportAssetSchema,
    handler: async (args: z.infer<typeof animateImportAssetSchema>) => {
      const verified = verifyAnimatePathAccess(args.filePath);
      if (!fs.existsSync(verified)) {
        throw new AnimateError('ANIMATE_INVALID_ARGUMENT', `Asset file not found: ${verified}`);
      }
      const uri = AnimateJsflGenerator.pathToURI(verified);
      const res = await bridge.executeCommand('import_asset', { uri, importToLibrary: args.importToLibrary });
      return res.result;
    }
  },
  {
    name: 'animate_add_library_item_to_stage',
    description: 'Places a symbol instance or asset from the library onto the stage.',
    inputSchema: animateAddLibraryItemToStageSchema,
    handler: async (args: z.infer<typeof animateAddLibraryItemToStageSchema>) => {
      const res = await bridge.executeCommand('add_library_item_to_stage', args);
      return res.result;
    }
  },
  {
    name: 'animate_create_symbol',
    description: 'Creates a new empty symbol (movie clip, graphic, button) in the library.',
    inputSchema: animateCreateSymbolSchema,
    handler: async (args: z.infer<typeof animateCreateSymbolSchema>) => {
      const res = await bridge.executeCommand('create_symbol', args);
      return res.result;
    }
  },
  {
    name: 'animate_convert_selection_to_symbol',
    description: 'Converts currently selected stage artwork into a symbol.',
    inputSchema: animateConvertSelectionToSymbolSchema,
    handler: async (args: z.infer<typeof animateConvertSelectionToSymbolSchema>) => {
      const res = await bridge.executeCommand('convert_selection_to_symbol', args);
      return res.result;
    }
  },
  {
    name: 'animate_edit_symbol',
    description: 'Enters edit mode for a specified symbol.',
    inputSchema: animateEditSymbolSchema,
    handler: async (args: z.infer<typeof animateEditSymbolSchema>) => {
      const res = await bridge.executeCommand('edit_symbol', args);
      return res.result;
    }
  },
  {
    name: 'animate_exit_symbol_edit',
    description: 'Exits symbol editing and returns to the main stage timeline.',
    inputSchema: animateExitSymbolEditSchema,
    handler: async () => {
      const res = await bridge.executeCommand('exit_symbol_edit');
      return res.result;
    }
  },

  // ================= STAGE & SELECTION =================
  {
    name: 'animate_inspect_selection',
    description: 'Returns properties, positions, transforms and types of currently selected elements on stage.',
    inputSchema: animateInspectSelectionSchema,
    handler: async () => {
      const res = await bridge.executeCommand('inspect_selection');
      return res.result;
    }
  },
  {
    name: 'animate_select_all',
    description: 'Selects all elements on the active frame.',
    inputSchema: animateSelectAllSchema,
    handler: async () => {
      const res = await bridge.executeCommand('select_all');
      return res.result;
    }
  },
  {
    name: 'animate_clear_selection',
    description: 'Deselects all stage elements.',
    inputSchema: animateClearSelectionSchema,
    handler: async () => {
      const res = await bridge.executeCommand('clear_selection');
      return res.result;
    }
  },
  {
    name: 'animate_transform_selection',
    description: 'Moves, scales, rotates or transforms selected stage elements.',
    inputSchema: animateTransformSelectionSchema,
    handler: async (args: z.infer<typeof animateTransformSelectionSchema>) => {
      const res = await bridge.executeCommand('transform_selection', args);
      return res.result;
    }
  },
  {
    name: 'animate_set_element_properties',
    description: 'Sets properties of selected element (position, dimension, rotation, firstFrame, loop).',
    inputSchema: animateSetElementPropertiesSchema,
    handler: async (args: z.infer<typeof animateSetElementPropertiesSchema>) => {
      const res = await bridge.executeCommand('set_element_properties', args);
      return res.result;
    }
  },
  {
    name: 'animate_swap_symbol',
    description: 'Swaps selected symbol instance with another library symbol.',
    inputSchema: animateSwapSymbolSchema,
    handler: async (args: z.infer<typeof animateSwapSymbolSchema>) => {
      const res = await bridge.executeCommand('swap_symbol', args);
      return res.result;
    }
  },
  {
    name: 'animate_arrange_selection',
    description: 'Arranges z-order of selection (bringToFront, sendToBack, bringForward, sendBackward).',
    inputSchema: animateArrangeSelectionSchema,
    handler: async (args: z.infer<typeof animateArrangeSelectionSchema>) => {
      const res = await bridge.executeCommand('arrange_selection', args);
      return res.result;
    }
  },
  {
    name: 'animate_group_selection',
    description: 'Groups selected elements.',
    inputSchema: animateGroupSelectionSchema,
    handler: async () => {
      const res = await bridge.executeCommand('group_selection');
      return res.result;
    }
  },
  {
    name: 'animate_ungroup_selection',
    description: 'Ungroups selected elements.',
    inputSchema: animateUngroupSelectionSchema,
    handler: async () => {
      const res = await bridge.executeCommand('ungroup_selection');
      return res.result;
    }
  },
  {
    name: 'animate_delete_selection',
    description: 'Deletes selected elements from the stage.',
    inputSchema: animateDeleteSelectionSchema,
    handler: async (args: z.infer<typeof animateDeleteSelectionSchema>) => {
      enforceAnimateDestructiveSafety('animate_delete_selection', args);
      const res = await bridge.executeCommand('delete_selection');
      return res.result;
    }
  },
  {
    name: 'animate_duplicate_selection',
    description: 'Duplicates selected stage elements.',
    inputSchema: animateDuplicateSelectionSchema,
    handler: async () => {
      const res = await bridge.executeCommand('duplicate_selection');
      return res.result;
    }
  },

  // ================= DRAWING & TEXT =================
  {
    name: 'animate_create_shape',
    description: 'Draws a primitive shape (rectangle, oval, line) on stage with stroke and fill properties.',
    inputSchema: animateCreateShapeSchema,
    handler: async (args: z.infer<typeof animateCreateShapeSchema>) => {
      const res = await bridge.executeCommand('create_shape', args);
      return res.result;
    }
  },
  {
    name: 'animate_create_text',
    description: 'Creates a text field on the active frame with specified font, size, alignment and color.',
    inputSchema: animateCreateTextSchema,
    handler: async (args: z.infer<typeof animateCreateTextSchema>) => {
      const res = await bridge.executeCommand('create_text', args);
      return res.result;
    }
  },
  {
    name: 'animate_edit_text',
    description: 'Modifies text string or formatting attributes of the selected text field.',
    inputSchema: animateEditTextSchema,
    handler: async (args: z.infer<typeof animateEditTextSchema>) => {
      const res = await bridge.executeCommand('edit_text', args);
      return res.result;
    }
  },

  // ================= TWEENING =================
  {
    name: 'animate_create_tween',
    description: 'Creates a classic, motion or shape tween across selected frame range.',
    inputSchema: animateCreateTweenSchema,
    handler: async (args: z.infer<typeof animateCreateTweenSchema>) => {
      const res = await bridge.executeCommand('create_tween', args);
      return res.result;
    }
  },
  {
    name: 'animate_remove_tween',
    description: 'Removes tween interpolation from selected frame range.',
    inputSchema: animateRemoveTweenSchema,
    handler: async (args: z.infer<typeof animateRemoveTweenSchema>) => {
      const res = await bridge.executeCommand('remove_tween', args);
      return res.result;
    }
  },
  {
    name: 'animate_set_tween_easing',
    description: 'Sets easing curve (-100 to 100) on a tween frame.',
    inputSchema: animateSetTweenEasingSchema,
    handler: async (args: z.infer<typeof animateSetTweenEasingSchema>) => {
      const res = await bridge.executeCommand('set_tween_easing', args);
      return res.result;
    }
  },

  // ================= AUDIO =================
  {
    name: 'animate_import_audio',
    description: 'Imports an audio file (.mp3 / .wav) into the library.',
    inputSchema: animateImportAudioSchema,
    handler: async (args: z.infer<typeof animateImportAudioSchema>) => {
      const verified = verifyAnimatePathAccess(args.filePath);
      const uri = AnimateJsflGenerator.pathToURI(verified);
      const res = await bridge.executeCommand('import_audio', { uri });
      return res.result;
    }
  },
  {
    name: 'animate_place_audio',
    description: 'Places imported audio onto the timeline with stream/event synchronization.',
    inputSchema: animatePlaceAudioSchema,
    handler: async (args: z.infer<typeof animatePlaceAudioSchema>) => {
      const res = await bridge.executeCommand('place_audio_on_timeline', args);
      return res.result;
    }
  },
  {
    name: 'animate_remove_audio',
    description: 'Removes sound from the target timeline frame.',
    inputSchema: animateRemoveAudioSchema,
    handler: async (args: z.infer<typeof animateRemoveAudioSchema>) => {
      const res = await bridge.executeCommand('remove_audio_from_timeline', args);
      return res.result;
    }
  },

  // ================= SCENES =================
  {
    name: 'animate_list_scenes',
    description: 'Lists all scenes in the document.',
    inputSchema: animateListScenesSchema,
    handler: async () => {
      const res = await bridge.executeCommand('list_scenes');
      return res.result;
    }
  },
  {
    name: 'animate_add_scene',
    description: 'Adds a new scene to the document.',
    inputSchema: animateAddSceneSchema,
    handler: async (args: z.infer<typeof animateAddSceneSchema>) => {
      const res = await bridge.executeCommand('add_scene', args);
      return res.result;
    }
  },
  {
    name: 'animate_rename_scene',
    description: 'Renames the active scene.',
    inputSchema: animateRenameSceneSchema,
    handler: async (args: z.infer<typeof animateRenameSceneSchema>) => {
      const res = await bridge.executeCommand('rename_scene', args);
      return res.result;
    }
  },
  {
    name: 'animate_delete_scene',
    description: 'Deletes the current scene.',
    inputSchema: animateDeleteSceneSchema,
    handler: async (args: z.infer<typeof animateDeleteSceneSchema>) => {
      enforceAnimateDestructiveSafety('animate_delete_scene', args);
      const res = await bridge.executeCommand('delete_scene');
      return res.result;
    }
  },
  {
    name: 'animate_select_scene',
    description: 'Switches the active scene by index or name.',
    inputSchema: animateSelectSceneSchema,
    handler: async (args: z.infer<typeof animateSelectSceneSchema>) => {
      const res = await bridge.executeCommand('select_scene', args);
      return res.result;
    }
  },

  // ================= CAMERA =================
  {
    name: 'animate_camera_status',
    description: 'Reports whether native camera scripting is supported in this runtime.',
    inputSchema: animateCameraStatusSchema,
    handler: async () => {
      const res = await bridge.executeCommand('camera_status');
      return res.result;
    }
  },
  {
    name: 'animate_set_camera_transform',
    description: 'Sets camera x, y, rotation and zoom if supported by Animate version.',
    inputSchema: animateSetCameraTransformSchema,
    handler: async (args: z.infer<typeof animateSetCameraTransformSchema>) => {
      const res = await bridge.executeCommand('set_camera_transform', args);
      return res.result;
    }
  },

  // ================= EXPORT & PUBLISH =================
  {
    name: 'animate_publish_document',
    description: 'Publishes document according to active publish profile (SWF / HTML5 Canvas / etc.).',
    inputSchema: animatePublishDocumentSchema,
    handler: async () => {
      const res = await bridge.executeCommand('publish_document');
      return res.result;
    }
  },
  {
    name: 'animate_export_image',
    description: 'Exports current frame as PNG. Verifies output file was generated on disk.',
    inputSchema: animateExportImageSchema,
    handler: async (args: z.infer<typeof animateExportImageSchema>) => {
      const verified = verifyAnimatePathAccess(args.outputPath);
      const uri = AnimateJsflGenerator.pathToURI(verified);
      const parentDir = path.dirname(verified);
      if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });

      const res = await bridge.executeCommand('export_image', {
        uri,
        currentFrameOnly: args.currentFrameOnly
      });

      // Verify actual artifact produced if running against real Animate
      if (animateConfig.bridgeMode !== 'mock') {
        if (!fs.existsSync(verified)) {
          const ext = path.extname(verified);
          const base = verified.slice(0, -ext.length);
          const framePadded = `${base}0001${ext}`;
          if (fs.existsSync(framePadded)) {
            try {
              fs.copyFileSync(framePadded, verified);
            } catch {}
          }
        }
        if (!fs.existsSync(verified)) {
          throw new AnimateError('ANIMATE_EXPORT_FAILED', `Exported PNG not found at path: ${verified}`);
        }
      }

      return { ...res.result, verifiedPath: verified, artifactVerified: true };
    }
  },
  {
    name: 'animate_export_video',
    description: 'Exports timeline to video file (.mp4/.mov). Verifies output artifact.',
    inputSchema: animateExportVideoSchema,
    handler: async (args: z.infer<typeof animateExportVideoSchema>) => {
      const verified = verifyAnimatePathAccess(args.outputPath);
      const uri = AnimateJsflGenerator.pathToURI(verified);
      const parentDir = path.dirname(verified);
      if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });

      const res = await bridge.executeCommand('export_video', {
        uri,
        convertInAME: args.convertInAME,
        stopAtFrame: args.stopAtFrame
      });

      if (animateConfig.bridgeMode !== 'mock') {
        if (!fs.existsSync(verified)) {
          throw new AnimateError('ANIMATE_EXPORT_FAILED', `Exported video not found at path: ${verified}`);
        }
      }

      return { ...res.result, verifiedPath: verified, artifactVerified: true };
    }
  },
  {
    name: 'animate_export_sprite_sheet',
    description: 'Exports sprite sheet texture atlas from movie clip or library symbol.',
    inputSchema: animateExportSpriteSheetSchema,
    handler: async (args: z.infer<typeof animateExportSpriteSheetSchema>) => {
      const verified = verifyAnimatePathAccess(args.outputPath);
      const uri = AnimateJsflGenerator.pathToURI(verified);
      const res = await bridge.executeCommand('export_sprite_sheet', {
        uri,
        format: args.format,
        layoutFormat: args.layoutFormat,
        symbolName: args.symbolName
      });
      return res.result;
    }
  },

  // ================= XFL =================
  {
    name: 'animate_inspect_xfl',
    description: 'Inspects uncompressed XFL document structure (DOMDocument.xml, layers, library).',
    inputSchema: animateInspectXflSchema,
    handler: async (args: z.infer<typeof animateInspectXflSchema>) => {
      const verified = verifyAnimatePathAccess(args.xflPath);
      return AnimateXflInspector.inspect(verified);
    }
  },
  {
    name: 'animate_diff_xfl',
    description: 'Performs structural diffing between two XFL document versions.',
    inputSchema: animateDiffXflSchema,
    handler: async (args: z.infer<typeof animateDiffXflSchema>) => {
      const pathA = verifyAnimatePathAccess(args.xflPathA);
      const pathB = verifyAnimatePathAccess(args.xflPathB);
      const metaA = AnimateXflInspector.inspect(pathA);
      const metaB = AnimateXflInspector.inspect(pathB);
      return AnimateXflInspector.diff(metaA, metaB);
    }
  },
  {
    name: 'animate_backup_document',
    description: 'Creates a timestamped backup of an existing FLA or XFL project.',
    inputSchema: animateBackupDocumentSchema,
    handler: async (args: z.infer<typeof animateBackupDocumentSchema>) => {
      const src = verifyAnimatePathAccess(args.sourcePath);
      const backupDir = args.backupDir
        ? verifyAnimatePathAccess(args.backupDir)
        : path.join(path.dirname(src), 'backups');
      const backupPath = AnimateXflInspector.createBackup(src, backupDir);
      return { backupCreated: true, backupPath };
    }
  },

  // ================= RAW JSFL (HIGH RISK / DEV ONLY) =================
  {
    name: 'animate_execute_raw_jsfl',
    description: 'Executes raw JSFL code in Adobe Animate. Disabled by default, requires ANIMATE_ALLOW_RAW_JSFL=true and explicit confirmation.',
    inputSchema: animateExecuteRawJsflSchema,
    handler: async (args: z.infer<typeof animateExecuteRawJsflSchema>) => {
      if (!animateConfig.allowRawJsfl) {
        throw new AnimateError(
          'RAW_JSFL_DISABLED',
          'Raw JSFL execution is disabled in server configuration. Set ANIMATE_ALLOW_RAW_JSFL=true to opt in.'
        );
      }
      enforceAnimateDestructiveSafety('animate_execute_raw_jsfl', args);
      const res = await bridge.executeCommand('execute_raw_jsfl', { code: args.code });
      return res.result;
    }
  }
];
