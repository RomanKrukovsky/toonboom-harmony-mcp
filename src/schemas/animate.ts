import { z } from 'zod';

export const confirmationParamsSchema = z.object({
  confirm: z.boolean().optional().describe('Set to true to confirm execution of destructive operation.'),
  confirmationText: z.string().optional().describe('Confirmation text verifying awareness of document mutation.')
});

// ---------------- SYSTEM ----------------
export const animateSystemStatusSchema = z.object({}).strict();
export const animateGetVersionSchema = z.object({}).strict();
export const animateGetCapabilitiesSchema = z.object({}).strict();
export const animatePingSchema = z.object({}).strict();
export const animateGetActiveDocumentSchema = z.object({}).strict();
export const animateListOpenDocumentsSchema = z.object({}).strict();

// ---------------- DOCUMENT ----------------
export const animateCreateDocumentSchema = z.object({
  name: z.string().optional().describe('Document title/name'),
  width: z.number().int().positive().default(1920).describe('Stage width in pixels'),
  height: z.number().int().positive().default(1080).describe('Stage height in pixels'),
  frameRate: z.number().positive().default(24).describe('Document frames per second (fps)'),
  backgroundColor: z.string().default('#FFFFFF').describe('Stage background color in hex (#FFFFFF)'),
  docType: z.enum(['timeline', 'html5Canvas', 'webgl']).default('timeline').describe('Document type')
});

export const animateOpenDocumentSchema = z.object({
  filePath: z.string().min(1).describe('Absolute or relative path to .fla or .xfl document')
});

export const animateInspectDocumentSchema = z.object({}).strict();
export const animateSaveDocumentSchema = z.object({}).strict();

export const animateSaveAsDocumentSchema = z.object({
  filePath: z.string().min(1).describe('Target file path to save the .fla or .xfl document')
}).merge(confirmationParamsSchema);

export const animateCloseDocumentSchema = z.object({
  promptToSave: z.boolean().default(false).describe('Whether to prompt to save before closing')
}).merge(confirmationParamsSchema);

export const animateSetDocumentSizeSchema = z.object({
  width: z.number().int().positive().describe('Stage width in pixels'),
  height: z.number().int().positive().describe('Stage height in pixels')
});

export const animateSetFrameRateSchema = z.object({
  frameRate: z.number().positive().describe('Target frame rate in frames per second')
});

export const animateSetDocumentPropertiesSchema = z.object({
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  frameRate: z.number().positive().optional(),
  backgroundColor: z.string().optional()
});

export const animateDuplicateDocumentSchema = z.object({
  targetFilePath: z.string().min(1).describe('Target destination for the duplicate document')
});

// ---------------- TIMELINE ----------------
export const animateInspectTimelineSchema = z.object({}).strict();
export const animateListLayersSchema = z.object({}).strict();

export const animateCreateLayerSchema = z.object({
  name: z.string().default('New Layer').describe('Name for the new layer'),
  layerType: z.enum(['normal', 'guide', 'guided', 'mask', 'masked', 'folder']).default('normal'),
  addAbove: z.boolean().default(true).describe('Whether to add above current layer')
});

export const animateDeleteLayerSchema = z.object({
  layerIndex: z.number().int().nonnegative().optional().describe('0-based index of layer to delete (defaults to current layer)')
}).merge(confirmationParamsSchema);

export const animateRenameLayerSchema = z.object({
  layerIndex: z.number().int().nonnegative().optional().describe('0-based index of layer (defaults to current)'),
  name: z.string().min(1).describe('New name for the layer')
});

export const animateReorderLayerSchema = z.object({
  fromIndex: z.number().int().nonnegative(),
  toIndex: z.number().int().nonnegative(),
  addBefore: z.boolean().default(true)
});

export const animateSelectLayerSchema = z.object({
  layerIndex: z.number().int().nonnegative().describe('0-based layer index to select')
});

export const animateSetLayerPropertiesSchema = z.object({
  layerIndex: z.number().int().nonnegative().optional(),
  name: z.string().optional(),
  visible: z.boolean().optional(),
  locked: z.boolean().optional()
});

export const animateGetCurrentFrameSchema = z.object({}).strict();

export const animateSetCurrentFrameSchema = z.object({
  frame: z.number().int().nonnegative().describe('0-based target frame number')
});

export const animateInsertFramesSchema = z.object({
  numFrames: z.number().int().positive().default(1),
  allLayers: z.boolean().default(false),
  frameNum: z.number().int().nonnegative().optional()
});

export const animateRemoveFramesSchema = z.object({
  startFrame: z.number().int().nonnegative().optional(),
  endFrame: z.number().int().nonnegative().optional()
});

export const animateClearFramesSchema = z.object({
  startFrame: z.number().int().nonnegative().optional(),
  endFrame: z.number().int().nonnegative().optional()
});

export const animateInsertKeyframeSchema = z.object({
  frame: z.number().int().nonnegative().optional().describe('0-based frame to insert keyframe at'),
  layerIndex: z.number().int().nonnegative().optional()
});

export const animateInsertBlankKeyframeSchema = z.object({
  frame: z.number().int().nonnegative().optional().describe('0-based frame to insert blank keyframe at'),
  layerIndex: z.number().int().nonnegative().optional()
});

export const animateClearKeyframeSchema = z.object({
  startFrame: z.number().int().nonnegative().optional(),
  endFrame: z.number().int().nonnegative().optional(),
  layerIndex: z.number().int().nonnegative().optional()
});

export const animateCopyFramesSchema = z.object({
  startFrame: z.number().int().nonnegative().optional(),
  endFrame: z.number().int().nonnegative().optional(),
  layerIndex: z.number().int().nonnegative().optional()
});

export const animatePasteFramesSchema = z.object({
  startFrame: z.number().int().nonnegative().optional(),
  endFrame: z.number().int().nonnegative().optional(),
  layerIndex: z.number().int().nonnegative().optional()
});

export const animateSetFrameLabelSchema = z.object({
  frame: z.number().int().nonnegative().optional(),
  layerIndex: z.number().int().nonnegative().optional(),
  label: z.string().describe('Label text for the keyframe'),
  labelType: z.enum(['none', 'name', 'comment', 'anchor']).default('name')
});

export const animateSelectFramesSchema = z.object({
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().nonnegative(),
  layerIndex: z.number().int().nonnegative().optional(),
  replaceSelection: z.boolean().default(true)
});

// ---------------- LIBRARY & SYMBOLS ----------------
export const animateListLibraryItemsSchema = z.object({}).strict();

export const animateInspectLibraryItemSchema = z.object({
  name: z.string().min(1).describe('Library item name or path')
});

export const animateCreateFolderSchema = z.object({
  name: z.string().min(1).describe('New folder path in library')
});

export const animateRenameLibraryItemSchema = z.object({
  oldName: z.string().min(1),
  newName: z.string().min(1)
});

export const animateMoveLibraryItemSchema = z.object({
  itemPath: z.string().min(1),
  folderPath: z.string().min(1),
  replace: z.boolean().default(true)
});

export const animateDuplicateLibraryItemSchema = z.object({
  name: z.string().min(1)
});

export const animateDeleteLibraryItemSchema = z.object({
  name: z.string().min(1)
}).merge(confirmationParamsSchema);

export const animateImportAssetSchema = z.object({
  filePath: z.string().min(1).describe('Path to image, SVG, audio or video asset'),
  importToLibrary: z.boolean().default(true)
});

export const animateAddLibraryItemToStageSchema = z.object({
  name: z.string().min(1).describe('Library item name to instantiate on stage'),
  x: z.number().default(0).describe('X coordinate on stage'),
  y: z.number().default(0).describe('Y coordinate on stage')
});

export const animateCreateSymbolSchema = z.object({
  name: z.string().min(1).describe('Symbol name'),
  type: z.enum(['movie clip', 'graphic', 'button']).default('movie clip')
});

export const animateConvertSelectionToSymbolSchema = z.object({
  name: z.string().min(1).describe('Symbol name'),
  type: z.enum(['movie clip', 'graphic', 'button']).default('movie clip'),
  registrationPoint: z.enum([
    'top left', 'top center', 'top right',
    'center left', 'center', 'center right',
    'bottom left', 'bottom center', 'bottom right'
  ]).default('center')
});

export const animateEditSymbolSchema = z.object({
  name: z.string().min(1).describe('Symbol name to enter edit mode')
});

export const animateExitSymbolEditSchema = z.object({}).strict();

// ---------------- STAGE & SELECTION ----------------
export const animateInspectSelectionSchema = z.object({}).strict();
export const animateSelectAllSchema = z.object({}).strict();
export const animateClearSelectionSchema = z.object({}).strict();

export const animateTransformSelectionSchema = z.object({
  moveX: z.number().optional().describe('Delta X to move selected elements'),
  moveY: z.number().optional().describe('Delta Y to move selected elements'),
  scaleX: z.number().optional().describe('Scale multiplier X'),
  scaleY: z.number().optional().describe('Scale multiplier Y'),
  rotation: z.number().optional().describe('Degrees to rotate selection')
});

export const animateSetElementPropertiesSchema = z.object({
  name: z.string().optional().describe('Instance name'),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  rotation: z.number().optional(),
  scaleX: z.number().optional(),
  scaleY: z.number().optional(),
  firstFrame: z.number().int().nonnegative().optional().describe('First frame for Graphic symbol instances'),
  loop: z.enum(['loop', 'play once', 'single frame']).optional()
});

export const animateSwapSymbolSchema = z.object({
  name: z.string().min(1).describe('Symbol name in library to swap selected instance with')
});

export const animateArrangeSelectionSchema = z.object({
  mode: z.enum(['bringToFront', 'sendToBack', 'bringForward', 'sendBackward'])
});

export const animateGroupSelectionSchema = z.object({}).strict();
export const animateUngroupSelectionSchema = z.object({}).strict();
export const animateDeleteSelectionSchema = z.object({}).merge(confirmationParamsSchema);
export const animateDuplicateSelectionSchema = z.object({}).strict();

// ---------------- DRAWING & TEXT ----------------
export const animateCreateShapeSchema = z.object({
  shapeType: z.enum(['rectangle', 'oval', 'line']).default('rectangle'),
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().default(100),
  height: z.number().default(100),
  x2: z.number().optional().describe('Second point X for line'),
  y2: z.number().optional().describe('Second point Y for line'),
  roundness: z.number().default(0).describe('Corner roundness for rectangle'),
  fillColor: z.string().optional().describe('Hex fill color (e.g. #FF0000)'),
  strokeColor: z.string().optional().describe('Hex stroke color (e.g. #000000)'),
  strokeSize: z.number().nonnegative().optional().describe('Stroke width in pixels')
});

export const animateCreateTextSchema = z.object({
  text: z.string().default(''),
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().default(200),
  height: z.number().default(50),
  fontSize: z.number().positive().optional(),
  fontFamily: z.string().optional(),
  fillColor: z.string().optional(),
  alignment: z.enum(['left', 'center', 'right', 'justify']).optional()
});

export const animateEditTextSchema = z.object({
  text: z.string().optional(),
  fontSize: z.number().positive().optional(),
  fontFamily: z.string().optional(),
  fillColor: z.string().optional(),
  alignment: z.enum(['left', 'center', 'right', 'justify']).optional()
});

// ---------------- TWEENING ----------------
export const animateCreateTweenSchema = z.object({
  tweenType: z.enum(['classic', 'motion', 'shape']).default('classic'),
  startFrame: z.number().int().nonnegative().optional(),
  endFrame: z.number().int().nonnegative().optional(),
  layerIndex: z.number().int().nonnegative().optional()
});

export const animateRemoveTweenSchema = z.object({
  startFrame: z.number().int().nonnegative().optional(),
  endFrame: z.number().int().nonnegative().optional(),
  layerIndex: z.number().int().nonnegative().optional()
});

export const animateSetTweenEasingSchema = z.object({
  easing: z.number().min(-100).max(100).describe('Easing value between -100 (ease in) and 100 (ease out)'),
  frame: z.number().int().nonnegative().optional(),
  layerIndex: z.number().int().nonnegative().optional()
});

// ---------------- AUDIO ----------------
export const animateImportAudioSchema = z.object({
  filePath: z.string().min(1).describe('Path to audio file (.mp3 or .wav)')
});

export const animatePlaceAudioSchema = z.object({
  soundName: z.string().min(1).describe('Name of imported audio item in library'),
  frame: z.number().int().nonnegative().default(0).describe('0-based frame to place audio at'),
  layerIndex: z.number().int().nonnegative().optional(),
  soundSync: z.enum(['stream', 'event', 'start', 'stop']).default('stream'),
  soundLoopMode: z.enum(['repeat', 'loop']).default('repeat'),
  soundLoop: z.number().int().positive().default(1)
});

export const animateRemoveAudioSchema = z.object({
  frame: z.number().int().nonnegative().optional(),
  layerIndex: z.number().int().nonnegative().optional()
});

// ---------------- SCENES ----------------
export const animateListScenesSchema = z.object({}).strict();

export const animateAddSceneSchema = z.object({
  name: z.string().optional().describe('Name for new scene')
});

export const animateRenameSceneSchema = z.object({
  name: z.string().min(1).describe('New scene name')
});

export const animateDeleteSceneSchema = z.object({}).merge(confirmationParamsSchema);

export const animateSelectSceneSchema = z.object({
  sceneIndex: z.number().int().nonnegative().optional(),
  sceneName: z.string().optional()
});

// ---------------- CAMERA ----------------
export const animateCameraStatusSchema = z.object({}).strict();

export const animateSetCameraTransformSchema = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  rotation: z.number().optional(),
  zoom: z.number().positive().optional()
});

// ---------------- EXPORT & PUBLISH ----------------
export const animatePublishDocumentSchema = z.object({}).strict();

export const animateExportImageSchema = z.object({
  outputPath: z.string().min(1).describe('Output PNG path'),
  currentFrameOnly: z.boolean().default(true)
});

export const animateExportVideoSchema = z.object({
  outputPath: z.string().min(1).describe('Output video path (e.g. .mp4 or .mov)'),
  convertInAME: z.boolean().default(false),
  stopAtFrame: z.number().int().positive().optional()
});

export const animateExportSpriteSheetSchema = z.object({
  outputPath: z.string().min(1).describe('Sprite sheet output path'),
  format: z.string().optional(),
  layoutFormat: z.string().optional(),
  symbolName: z.string().optional()
});

// ---------------- XFL & BACKUP ----------------
export const animateInspectXflSchema = z.object({
  xflPath: z.string().min(1).describe('Path to uncompressed XFL directory or DOMDocument.xml')
});

export const animateDiffXflSchema = z.object({
  xflPathA: z.string().min(1),
  xflPathB: z.string().min(1)
});

export const animateBackupDocumentSchema = z.object({
  sourcePath: z.string().min(1),
  backupDir: z.string().optional()
});

// ---------------- RAW JSFL (HIGH RISK) ----------------
export const animateExecuteRawJsflSchema = z.object({
  code: z.string().min(1).max(50000).describe('Raw JSFL code to execute')
}).merge(confirmationParamsSchema);
