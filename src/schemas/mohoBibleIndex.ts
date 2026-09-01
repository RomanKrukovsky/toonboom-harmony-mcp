export * from './mohoShowBible.js';
export * from './mohoCharacterBible.js';
export * from './mohoCameraRules.js';
export * from './mohoMotionGrammar.js';
export * from './mohoPaletteManifest.js';
export * from './mohoQaThresholds.js';

import type { MohoCharacterBible } from './mohoCharacterBible.js';
import type { MohoCameraRules } from './mohoCameraRules.js';
import type { MohoMotionGrammar } from './mohoMotionGrammar.js';
import type { MohoPaletteManifest } from './mohoPaletteManifest.js';
import type { MohoQaThresholds } from './mohoQaThresholds.js';
import type { MohoShowBible } from './mohoShowBible.js';

export interface LoadedMohoShowBible {
  mohoShowBible: MohoShowBible;
  characterBibles: MohoCharacterBible[];
  cameraRules: MohoCameraRules;
  motionGrammar: MohoMotionGrammar;
  paletteManifest: MohoPaletteManifest;
  qaThresholds: MohoQaThresholds;
  fingerprint: string;
}