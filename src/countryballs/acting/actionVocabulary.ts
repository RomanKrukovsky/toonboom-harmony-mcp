import { CountryballEyeState } from '../../schemas/countryballs/seriesBible.js';

export type ActionCategory =
  | 'locomotion'
  | 'reaction_take'
  | 'emotional_idle'
  | 'gaze_micro'
  | 'slapstick_gag'
  | 'dialogue_gesture';

export interface ActionDefinition {
  id: string;
  category: ActionCategory;
  defaultDurationFrames: number;
  recommendedEyeState: CountryballEyeState;
  squashFactor: number;   // < 1.0 is squash, > 1.0 is stretch
  stretchFactor: number;
  rotationWobbleDeg: number;
  yOffsetPx: number;
  xOffsetPx: number;
  description: string;
}

// 1. Locomotion & Entrances/Exits (60 actions)
const locomotionActions: ActionDefinition[] = [
  { id: 'enter_fast_right', category: 'locomotion', defaultDurationFrames: 14, recommendedEyeState: 'normal', squashFactor: 0.85, stretchFactor: 1.25, rotationWobbleDeg: -12, yOffsetPx: -10, xOffsetPx: -350, description: 'Quick slide-in entrance from stage right' },
  { id: 'enter_fast_left', category: 'locomotion', defaultDurationFrames: 14, recommendedEyeState: 'normal', squashFactor: 0.85, stretchFactor: 1.25, rotationWobbleDeg: 12, yOffsetPx: -10, xOffsetPx: 350, description: 'Quick slide-in entrance from stage left' },
  { id: 'exit_fast_right', category: 'locomotion', defaultDurationFrames: 12, recommendedEyeState: 'wide_shock', squashFactor: 0.8, stretchFactor: 1.3, rotationWobbleDeg: 15, yOffsetPx: -5, xOffsetPx: 400, description: 'Frantic zip-out exit to stage right' },
  { id: 'exit_fast_left', category: 'locomotion', defaultDurationFrames: 12, recommendedEyeState: 'wide_shock', squashFactor: 0.8, stretchFactor: 1.3, rotationWobbleDeg: -15, yOffsetPx: -5, xOffsetPx: -400, description: 'Frantic zip-out exit to stage left' },
  { id: 'hop_forward', category: 'locomotion', defaultDurationFrames: 18, recommendedEyeState: 'normal', squashFactor: 0.75, stretchFactor: 1.2, rotationWobbleDeg: 6, yOffsetPx: -40, xOffsetPx: 70, description: 'Characteristic countryball hop' },
  { id: 'hop_backward', category: 'locomotion', defaultDurationFrames: 18, recommendedEyeState: 'squint_suspicious', squashFactor: 0.75, stretchFactor: 1.2, rotationWobbleDeg: -6, yOffsetPx: -35, xOffsetPx: -60, description: 'Timid or startled hop backwards' },
  { id: 'roll_fast', category: 'locomotion', defaultDurationFrames: 24, recommendedEyeState: 'dizzy_spiral', squashFactor: 0.95, stretchFactor: 1.05, rotationWobbleDeg: 360, yOffsetPx: 0, xOffsetPx: 250, description: 'Full roll with angular spin' },
  { id: 'slide_in', category: 'locomotion', defaultDurationFrames: 16, recommendedEyeState: 'normal', squashFactor: 0.7, stretchFactor: 1.3, rotationWobbleDeg: 8, yOffsetPx: 5, xOffsetPx: 180, description: 'Skid-stop sliding entrance' },
  { id: 'stumble_back', category: 'locomotion', defaultDurationFrames: 20, recommendedEyeState: 'wide_shock', squashFactor: 0.8, stretchFactor: 1.15, rotationWobbleDeg: -18, yOffsetPx: -15, xOffsetPx: -80, description: 'Stumble backward after being startled' },
  { id: 'tiptoe_sneak', category: 'locomotion', defaultDurationFrames: 30, recommendedEyeState: 'squint_suspicious', squashFactor: 0.92, stretchFactor: 1.08, rotationWobbleDeg: 4, yOffsetPx: -12, xOffsetPx: 90, description: 'Sneaky slow rhythmic hopping' },
  { id: 'peek_from_bottom', category: 'locomotion', defaultDurationFrames: 22, recommendedEyeState: 'look_up_left', squashFactor: 0.85, stretchFactor: 1.2, rotationWobbleDeg: 0, yOffsetPx: -90, xOffsetPx: 0, description: 'Peeking up from below bottom screen edge' },
  { id: 'retreat_to_bottom', category: 'locomotion', defaultDurationFrames: 16, recommendedEyeState: 'deadpan_flat', squashFactor: 0.85, stretchFactor: 1.15, rotationWobbleDeg: 0, yOffsetPx: 90, xOffsetPx: 0, description: 'Sinking down below the frame out of sight' }
];

// Generate variants for locomotion
for (let i = 1; i <= 48; i++) {
  const speed = i % 3 === 0 ? 'fast' : i % 3 === 1 ? 'slow' : 'medium';
  const dir = i % 2 === 0 ? 'left' : 'right';
  locomotionActions.push({
    id: `hop_${speed}_${dir}_var_${i}`,
    category: 'locomotion',
    defaultDurationFrames: 12 + (i % 16),
    recommendedEyeState: i % 4 === 0 ? 'squint_suspicious' : 'normal',
    squashFactor: 0.7 + (i % 5) * 0.05,
    stretchFactor: 1.1 + (i % 5) * 0.05,
    rotationWobbleDeg: (dir === 'right' ? 1 : -1) * (5 + (i % 15)),
    yOffsetPx: -(20 + (i % 40)),
    xOffsetPx: (dir === 'right' ? 1 : -1) * (30 + (i % 80)),
    description: `Locomotion hop variant ${i} going ${dir} at ${speed} pace`
  });
}

// 2. Reactions & Takes (60 actions)
const reactionTakeActions: ActionDefinition[] = [
  { id: 'double_take', category: 'reaction_take', defaultDurationFrames: 24, recommendedEyeState: 'wide_shock', squashFactor: 0.65, stretchFactor: 1.4, rotationWobbleDeg: -15, yOffsetPx: -30, xOffsetPx: 0, description: 'Look away, pause, snap back with massive eye enlargement' },
  { id: 'shock_recoil', category: 'reaction_take', defaultDurationFrames: 18, recommendedEyeState: 'wide_shock', squashFactor: 0.7, stretchFactor: 1.35, rotationWobbleDeg: -22, yOffsetPx: -45, xOffsetPx: -40, description: 'Explosive jump-back recoil from shocking statement' },
  { id: 'awkward_side_eye', category: 'reaction_take', defaultDurationFrames: 20, recommendedEyeState: 'look_up_right', squashFactor: 0.98, stretchFactor: 1.02, rotationWobbleDeg: 2, yOffsetPx: 0, xOffsetPx: 0, description: 'Frozen ball with shifting suspicious eyes' },
  { id: 'eye_roll', category: 'reaction_take', defaultDurationFrames: 22, recommendedEyeState: 'look_up_left', squashFactor: 0.95, stretchFactor: 1.05, rotationWobbleDeg: -3, yOffsetPx: -4, xOffsetPx: 0, description: 'Exasperated heavy eye roll' },
  { id: 'cringe_squash', category: 'reaction_take', defaultDurationFrames: 16, recommendedEyeState: 'squint_suspicious', squashFactor: 0.6, stretchFactor: 1.4, rotationWobbleDeg: 0, yOffsetPx: 25, xOffsetPx: 0, description: 'Severe vertical compression in response to embarrassment' },
  { id: 'gasp_inflate', category: 'reaction_take', defaultDurationFrames: 18, recommendedEyeState: 'wide_shock', squashFactor: 1.25, stretchFactor: 1.25, rotationWobbleDeg: 0, yOffsetPx: -20, xOffsetPx: 0, description: 'Ball swells like a balloon taking in dramatic air' },
  { id: 'jaw_drop', category: 'reaction_take', defaultDurationFrames: 16, recommendedEyeState: 'wide_shock', squashFactor: 0.75, stretchFactor: 1.3, rotationWobbleDeg: 0, yOffsetPx: 10, xOffsetPx: 0, description: 'Bottom stretches down in absolute disbelief' },
  { id: 'monocle_pop', category: 'reaction_take', defaultDurationFrames: 20, recommendedEyeState: 'wide_shock', squashFactor: 0.8, stretchFactor: 1.25, rotationWobbleDeg: 18, yOffsetPx: -35, xOffsetPx: 0, description: 'British take where monocle shoots off' }
];

for (let i = 1; i <= 52; i++) {
  reactionTakeActions.push({
    id: `take_shock_variant_${i}`,
    category: 'reaction_take',
    defaultDurationFrames: 14 + (i % 12),
    recommendedEyeState: i % 2 === 0 ? 'wide_shock' : 'dramatic_wobble',
    squashFactor: 0.6 + (i % 6) * 0.04,
    stretchFactor: 1.2 + (i % 6) * 0.05,
    rotationWobbleDeg: ((i % 2 === 0 ? 1 : -1) * (10 + (i % 20))),
    yOffsetPx: -(15 + (i % 35)),
    xOffsetPx: ((i % 2 === 0 ? 1 : -1) * (i % 25)),
    description: `Dynamic comedic reaction take variant ${i}`
  });
}

// 3. Emotional Idles & States (60 actions)
const emotionalIdleActions: ActionDefinition[] = [
  { id: 'slow_bob', category: 'emotional_idle', defaultDurationFrames: 24, recommendedEyeState: 'normal', squashFactor: 0.95, stretchFactor: 1.05, rotationWobbleDeg: 0, yOffsetPx: -6, xOffsetPx: 0, description: 'Gentle idle breathing bob' },
  { id: 'anxious_quiver', category: 'emotional_idle', defaultDurationFrames: 18, recommendedEyeState: 'blink_stutter', squashFactor: 0.96, stretchFactor: 1.04, rotationWobbleDeg: 3, yOffsetPx: 0, xOffsetPx: 2, description: 'Rapid nervous jittering' },
  { id: 'angry_shake', category: 'emotional_idle', defaultDurationFrames: 16, recommendedEyeState: 'angry_slanted', squashFactor: 0.9, stretchFactor: 1.1, rotationWobbleDeg: 8, yOffsetPx: 0, xOffsetPx: 4, description: 'Furious red-faced vibration' },
  { id: 'deadpan_stare', category: 'emotional_idle', defaultDurationFrames: 24, recommendedEyeState: 'deadpan_flat', squashFactor: 1.0, stretchFactor: 1.0, rotationWobbleDeg: 0, yOffsetPx: 0, xOffsetPx: 0, description: 'Complete static silence and unblinking gaze' },
  { id: 'smug_hover', category: 'emotional_idle', defaultDurationFrames: 28, recommendedEyeState: 'normal', squashFactor: 1.05, stretchFactor: 0.95, rotationWobbleDeg: 4, yOffsetPx: -18, xOffsetPx: 0, description: 'Floating slightly with superior arrogance' },
  { id: 'deflate_sad', category: 'emotional_idle', defaultDurationFrames: 26, recommendedEyeState: 'tearful_puppy', squashFactor: 0.75, stretchFactor: 1.2, rotationWobbleDeg: 0, yOffsetPx: 20, xOffsetPx: 0, description: 'Collapsing flat like a deflated tire' }
];

for (let i = 1; i <= 54; i++) {
  emotionalIdleActions.push({
    id: `idle_emotion_var_${i}`,
    category: 'emotional_idle',
    defaultDurationFrames: 20 + (i % 16),
    recommendedEyeState: i % 3 === 0 ? 'squint_suspicious' : i % 3 === 1 ? 'happy_closed' : 'deadpan_flat',
    squashFactor: 0.92 + (i % 8) * 0.01,
    stretchFactor: 1.02 + (i % 8) * 0.01,
    rotationWobbleDeg: ((i % 2 === 0 ? 1 : -1) * (i % 6)),
    yOffsetPx: -(i % 12),
    xOffsetPx: 0,
    description: `Characterized idle variation ${i}`
  });
}

// 4. Gaze & Micro-expressions (60 actions)
const gazeMicroActions: ActionDefinition[] = [
  { id: 'blink_regular', category: 'gaze_micro', defaultDurationFrames: 4, recommendedEyeState: 'blink_regular', squashFactor: 0.98, stretchFactor: 1.02, rotationWobbleDeg: 0, yOffsetPx: 0, xOffsetPx: 0, description: 'Simple single frame blink' },
  { id: 'blink_stutter', category: 'gaze_micro', defaultDurationFrames: 10, recommendedEyeState: 'blink_stutter', squashFactor: 0.97, stretchFactor: 1.03, rotationWobbleDeg: 0, yOffsetPx: 0, xOffsetPx: 0, description: 'Rapid double flutter blink' },
  { id: 'suspicious_narrow', category: 'gaze_micro', defaultDurationFrames: 16, recommendedEyeState: 'squint_suspicious', squashFactor: 0.94, stretchFactor: 1.06, rotationWobbleDeg: 0, yOffsetPx: 0, xOffsetPx: 0, description: 'Slow narrowing of eyes toward target' },
  { id: 'glance_left', category: 'gaze_micro', defaultDurationFrames: 12, recommendedEyeState: 'look_up_left', squashFactor: 1.0, stretchFactor: 1.0, rotationWobbleDeg: -2, yOffsetPx: 0, xOffsetPx: 0, description: 'Quick dart of eyes to left' },
  { id: 'glance_right', category: 'gaze_micro', defaultDurationFrames: 12, recommendedEyeState: 'look_up_right', squashFactor: 1.0, stretchFactor: 1.0, rotationWobbleDeg: 2, yOffsetPx: 0, xOffsetPx: 0, description: 'Quick dart of eyes to right' }
];

for (let i = 1; i <= 55; i++) {
  gazeMicroActions.push({
    id: `micro_expression_var_${i}`,
    category: 'gaze_micro',
    defaultDurationFrames: 8 + (i % 14),
    recommendedEyeState: i % 4 === 0 ? 'blink_regular' : i % 4 === 1 ? 'squint_suspicious' : i % 4 === 2 ? 'look_up_right' : 'dramatic_wobble',
    squashFactor: 0.98,
    stretchFactor: 1.02,
    rotationWobbleDeg: ((i % 2 === 0 ? 1 : -1) * (i % 4)),
    yOffsetPx: 0,
    xOffsetPx: 0,
    description: `Micro facial expression variation ${i}`
  });
}

// 5. Slapstick Gags & Physical Humor (60 actions)
const slapstickGagActions: ActionDefinition[] = [
  { id: 'flatten_pancake', category: 'slapstick_gag', defaultDurationFrames: 24, recommendedEyeState: 'dizzy_spiral', squashFactor: 0.25, stretchFactor: 2.2, rotationWobbleDeg: 0, yOffsetPx: 45, xOffsetPx: 0, description: 'Completely crushed into a flat pancake' },
  { id: 'rocket_launch', category: 'slapstick_gag', defaultDurationFrames: 18, recommendedEyeState: 'wide_shock', squashFactor: 0.5, stretchFactor: 1.8, rotationWobbleDeg: 0, yOffsetPx: -600, xOffsetPx: 0, description: 'Shoots vertically into the stratosphere like a rocket' },
  { id: 'fall_from_sky', category: 'slapstick_gag', defaultDurationFrames: 20, recommendedEyeState: 'wide_shock', squashFactor: 0.4, stretchFactor: 1.6, rotationWobbleDeg: 12, yOffsetPx: 500, xOffsetPx: 0, description: 'Drops from top of screen and splats into ground' },
  { id: 'bounce_off_wall', category: 'slapstick_gag', defaultDurationFrames: 22, recommendedEyeState: 'dizzy_spiral', squashFactor: 0.6, stretchFactor: 1.4, rotationWobbleDeg: -45, yOffsetPx: -20, xOffsetPx: -200, description: 'Ricochets off edge of frame' },
  { id: 'spin_dizzy_fall', category: 'slapstick_gag', defaultDurationFrames: 28, recommendedEyeState: 'dizzy_spiral', squashFactor: 0.7, stretchFactor: 1.3, rotationWobbleDeg: 720, yOffsetPx: 25, xOffsetPx: 0, description: 'Spins around until falling over' }
];

for (let i = 1; i <= 55; i++) {
  slapstickGagActions.push({
    id: `slapstick_physical_var_${i}`,
    category: 'slapstick_gag',
    defaultDurationFrames: 16 + (i % 20),
    recommendedEyeState: i % 2 === 0 ? 'dizzy_spiral' : 'wide_shock',
    squashFactor: 0.35 + (i % 5) * 0.08,
    stretchFactor: 1.3 + (i % 5) * 0.1,
    rotationWobbleDeg: ((i % 2 === 0 ? 1 : -1) * (20 + (i % 90))),
    yOffsetPx: -(10 + (i % 120)),
    xOffsetPx: ((i % 2 === 0 ? 1 : -1) * (20 + (i % 150))),
    description: `Slapstick comedic collision/gag variant ${i}`
  });
}

export const ALL_COUNTRYBALL_ACTIONS: ActionDefinition[] = [
  ...locomotionActions,
  ...reactionTakeActions,
  ...emotionalIdleActions,
  ...gazeMicroActions,
  ...slapstickGagActions
];

export const ACTION_VOCABULARY_MAP = new Map<string, ActionDefinition>(
  ALL_COUNTRYBALL_ACTIONS.map(a => [a.id, a])
);

export function getActionDefinition(actionId: string): ActionDefinition {
  const found = ACTION_VOCABULARY_MAP.get(actionId);
  if (found) return found;
  // Fallback default
  return {
    id: actionId,
    category: 'emotional_idle',
    defaultDurationFrames: 16,
    recommendedEyeState: 'normal',
    squashFactor: 0.95,
    stretchFactor: 1.05,
    rotationWobbleDeg: 0,
    yOffsetPx: 0,
    xOffsetPx: 0,
    description: `Dynamic generated action: ${actionId}`
  };
}
