import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Valid 1x1 RGBA PNG buffer
const createPng = (r, g, b, a = 255) => {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.from([
    0, 0, 0, 1, // width 1
    0, 0, 0, 1, // height 1
    8,          // bit depth 8
    6,          // color type 6 (RGBA)
    0,          // compression 0
    0,          // filter 0
    0           // interlace 0
  ]);
  const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
  const ihdrChunk = Buffer.concat([
    Buffer.from([0, 0, 0, 13]),
    Buffer.from('IHDR'),
    ihdrData,
    ihdrCrc
  ]);

  const rawPixel = Buffer.from([0, r, g, b, a]);
  const s1 = (1 + r + g + b + a) % 65521;
  const s2 = (1 + (1 + r) + (1 + r + g) + (1 + r + g + b) + (1 + r + g + b + a)) % 65521;
  const adler = Buffer.alloc(4);
  adler.writeUInt32BE(((s2 << 16) | s1) >>> 0, 0);

  const zlibData = Buffer.concat([
    Buffer.from([0x78, 0x01, 0x01, 0x05, 0x00, 0xfa, 0xff]),
    rawPixel,
    adler
  ]);
  const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), zlibData]));
  const idatChunk = Buffer.concat([
    Buffer.alloc(4),
    Buffer.from('IDAT'),
    zlibData,
    idatCrc
  ]);
  idatChunk.writeUInt32BE(zlibData.length, 0);

  const iendCrc = crc32(Buffer.from('IEND'));
  const iendChunk = Buffer.concat([
    Buffer.from([0, 0, 0, 0]),
    Buffer.from('IEND'),
    iendCrc
  ]);

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
};

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  const res = Buffer.alloc(4);
  res.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 0);
  return res;
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

const baseDir = path.resolve('fixtures/moho95/characters');
fs.mkdirSync(baseDir, { recursive: true });

const mouthChoices = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'X'];
const eyeChoices = ['open', 'closed'];
const handChoices = ['open', 'fist', 'point'];

for (let i = 1; i <= 20; i++) {
  const indexStr = String(i).padStart(2, '0');
  const charDirName = `character-${indexStr}`;
  const charId = `licensed-character-${indexStr}`;
  const shotId = `shot-char-${indexStr}`;
  const charPath = path.join(baseDir, charDirName);
  const assetsPath = path.join(charPath, 'assets');
  fs.mkdirSync(assetsPath, { recursive: true });

  const assetBuffers = {
    'body.png': createPng(40, 100, 200),
    'head.png': createPng(240, 180, 140),
    'arm_l.png': createPng(200, 50, 50),
    'arm_r.png': createPng(200, 50, 50),
    'leg_l.png': createPng(50, 50, 150),
    'leg_r.png': createPng(50, 50, 150)
  };

  for (const choice of mouthChoices) {
    assetBuffers[`mouth_${choice}.png`] = createPng(200, 40, 40);
  }
  for (const choice of eyeChoices) {
    assetBuffers[`eye_${choice}.png`] = createPng(20, 20, 20);
  }
  for (const choice of handChoices) {
    assetBuffers[`hand_${choice}.png`] = createPng(220, 160, 120);
  }

  const hashes = {};
  for (const [name, buf] of Object.entries(assetBuffers)) {
    fs.writeFileSync(path.join(assetsPath, name), buf);
    hashes[name] = sha256(buf);
  }

  const fixture = {
    characterId: charId,
    manualMohoEdits: 0,
    startFrame: 1,
    endFrame: 24,
    fps: 24,
    width: 1280,
    height: 720
  };
  fs.writeFileSync(path.join(charPath, 'fixture.json'), JSON.stringify(fixture, null, 2));

  const layers = [
    {
      layerId: 'body',
      kind: 'body',
      choiceName: null,
      sourcePath: 'assets/body.png',
      parentLayerId: null,
      jointOverlapPx: 0,
      sha256: hashes['body.png']
    },
    {
      layerId: 'head',
      kind: 'head',
      choiceName: null,
      sourcePath: 'assets/head.png',
      parentLayerId: 'body',
      jointOverlapPx: 0,
      sha256: hashes['head.png']
    },
    {
      layerId: 'arm_l',
      kind: 'limb',
      choiceName: null,
      sourcePath: 'assets/arm_l.png',
      parentLayerId: 'body',
      jointOverlapPx: 16,
      sha256: hashes['arm_l.png']
    },
    {
      layerId: 'arm_r',
      kind: 'limb',
      choiceName: null,
      sourcePath: 'assets/arm_r.png',
      parentLayerId: 'body',
      jointOverlapPx: 16,
      sha256: hashes['arm_r.png']
    },
    {
      layerId: 'leg_l',
      kind: 'limb',
      choiceName: null,
      sourcePath: 'assets/leg_l.png',
      parentLayerId: 'body',
      jointOverlapPx: 16,
      sha256: hashes['leg_l.png']
    },
    {
      layerId: 'leg_r',
      kind: 'limb',
      choiceName: null,
      sourcePath: 'assets/leg_r.png',
      parentLayerId: 'body',
      jointOverlapPx: 16,
      sha256: hashes['leg_r.png']
    },
    ...mouthChoices.map(choice => ({
      layerId: `mouth_${choice}`,
      kind: 'mouth',
      choiceName: choice,
      sourcePath: `assets/mouth_${choice}.png`,
      parentLayerId: 'head',
      jointOverlapPx: 0,
      sha256: hashes[`mouth_${choice}.png`]
    })),
    ...eyeChoices.map(choice => ({
      layerId: `eye_${choice}`,
      kind: 'eye',
      choiceName: choice,
      sourcePath: `assets/eye_${choice}.png`,
      parentLayerId: 'head',
      jointOverlapPx: 0,
      sha256: hashes[`eye_${choice}.png`]
    })),
    ...handChoices.map(choice => ({
      layerId: `hand_${choice}`,
      kind: 'hand',
      choiceName: choice,
      sourcePath: `assets/hand_${choice}.png`,
      parentLayerId: 'arm_l',
      jointOverlapPx: 0,
      sha256: hashes[`hand_${choice}.png`]
    }))
  ];

  const characterPack = {
    schemaVersion: '1.0',
    characterId: charId,
    canvas: { width: 1920, height: 1080 },
    views: ['front', 'three_quarter', 'side'],
    layers
  };
  fs.writeFileSync(path.join(charPath, 'character-pack.json'), JSON.stringify(characterPack, null, 2));

  const artworkParts = [
    { partId: 'body', characterRef: charId, sourcePath: 'assets/body.png', maskPath: null, zIndex: 10, confidence: 1.0, pivot: { x: 0, y: 0 }, synthesized: false, view: 'front' },
    { partId: 'head', characterRef: charId, sourcePath: 'assets/head.png', maskPath: null, zIndex: 20, confidence: 1.0, pivot: { x: 0, y: 150 }, synthesized: false, view: 'front' },
    { partId: 'arm_l', characterRef: charId, sourcePath: 'assets/arm_l.png', maskPath: null, zIndex: 15, confidence: 1.0, pivot: { x: -50, y: 80 }, synthesized: false, view: 'front' },
    { partId: 'arm_r', characterRef: charId, sourcePath: 'assets/arm_r.png', maskPath: null, zIndex: 5, confidence: 1.0, pivot: { x: 50, y: 80 }, synthesized: false, view: 'front' },
    { partId: 'leg_l', characterRef: charId, sourcePath: 'assets/leg_l.png', maskPath: null, zIndex: 8, confidence: 1.0, pivot: { x: -30, y: -100 }, synthesized: false, view: 'front' },
    { partId: 'leg_r', characterRef: charId, sourcePath: 'assets/leg_r.png', maskPath: null, zIndex: 7, confidence: 1.0, pivot: { x: 30, y: -100 }, synthesized: false, view: 'front' }
  ];

  const drawingAssets = [
    ...mouthChoices.map(choice => ({
      drawingId: `mouth_${choice}`,
      kind: 'mouth',
      choiceName: choice,
      sourcePath: `assets/mouth_${choice}.png`,
      confidence: 1.0
    })),
    ...eyeChoices.map(choice => ({
      drawingId: `eye_${choice}`,
      kind: 'eye',
      choiceName: choice,
      sourcePath: `assets/eye_${choice}.png`,
      confidence: 1.0
    })),
    ...handChoices.map(choice => ({
      drawingId: `hand_${choice}`,
      kind: 'hand',
      choiceName: choice,
      sourcePath: `assets/hand_${choice}.png`,
      confidence: 1.0
    }))
  ];

  const artworkPack = {
    schemaVersion: '3.0',
    shotId,
    parts: artworkParts,
    occlusionGraph: [
      { frontPartId: 'head', backPartId: 'body' },
      { frontPartId: 'arm_l', backPartId: 'body' }
    ],
    joints: [
      { jointId: 'neck', parentPartId: 'body', childPartId: 'head', x: 0, y: 150, confidence: 1.0 },
      { jointId: 'shoulder_l', parentPartId: 'body', childPartId: 'arm_l', x: -50, y: 80, confidence: 1.0 },
      { jointId: 'shoulder_r', parentPartId: 'body', childPartId: 'arm_r', x: 50, y: 80, confidence: 1.0 },
      { jointId: 'hip_l', parentPartId: 'body', childPartId: 'leg_l', x: -30, y: -100, confidence: 1.0 },
      { jointId: 'hip_r', parentPartId: 'body', childPartId: 'leg_r', x: 30, y: -100, confidence: 1.0 }
    ],
    requiredViews: ['front', 'three_quarter', 'side'],
    drawingSets: {
      mouth: mouthChoices,
      eyes: eyeChoices,
      hands: handChoices
    },
    drawingAssets,
    overallConfidence: 1.0,
    provenance: {
      provider: 'openrouter',
      model: 'benchmark-v3',
      callId: `art-${indexStr}`
    }
  };
  fs.writeFileSync(path.join(charPath, 'artwork-pack-v3.json'), JSON.stringify(artworkPack, null, 2));

  const rigBlueprint = {
    schemaVersion: '3.0',
    shotId,
    bones: [
      { boneId: 'root', name: 'Root', parentBoneId: null, x: 0, y: 0, angleDeg: 0, lengthPx: 50 },
      { boneId: 'torso', name: 'Torso', parentBoneId: 'root', x: 0, y: 50, angleDeg: 90, lengthPx: 100 },
      { boneId: 'head', name: 'Head', parentBoneId: 'torso', x: 0, y: 150, angleDeg: 90, lengthPx: 60 },
      { boneId: 'arm_l', name: 'Arm_L', parentBoneId: 'torso', x: -50, y: 130, angleDeg: -90, lengthPx: 80 },
      { boneId: 'arm_r', name: 'Arm_R', parentBoneId: 'torso', x: 50, y: 130, angleDeg: -90, lengthPx: 80 },
      { boneId: 'leg_l', name: 'Leg_L', parentBoneId: 'root', x: -30, y: 0, angleDeg: -90, lengthPx: 100 },
      { boneId: 'leg_r', name: 'Leg_R', parentBoneId: 'root', x: 30, y: 0, angleDeg: -90, lengthPx: 100 }
    ],
    bindings: [
      { partId: 'body', boneId: 'torso', mode: 'layer' },
      { partId: 'head', boneId: 'head', mode: 'layer' },
      { partId: 'arm_l', boneId: 'arm_l', mode: 'layer' },
      { partId: 'arm_r', boneId: 'arm_r', mode: 'layer' },
      { partId: 'leg_l', boneId: 'leg_l', mode: 'layer' },
      { partId: 'leg_r', boneId: 'leg_r', mode: 'layer' }
    ],
    constraints: [],
    switches: [
      {
        switchId: 'mouth_switch',
        layerName: 'Mouth',
        choices: mouthChoices.map(c => ({ choiceId: c, partId: `mouth_${c}` }))
      },
      {
        switchId: 'eye_switch',
        layerName: 'Eyes',
        choices: eyeChoices.map(c => ({ choiceId: c, partId: `eye_${c}` }))
      },
      {
        switchId: 'hand_switch',
        layerName: 'Hands',
        choices: handChoices.map(c => ({ choiceId: c, partId: `hand_${c}` }))
      }
    ],
    actions: [],
    warpMeshes: [],
    controlPoses: [],
    vitruvianGroups: [],
    provenance: {
      provider: 'openrouter',
      model: 'benchmark-v3',
      callId: `rig-${indexStr}`
    }
  };
  fs.writeFileSync(path.join(charPath, 'rig-blueprint-v3.json'), JSON.stringify(rigBlueprint, null, 2));

  const expectedStructure = {
    saved_bone_ids: ['arm_l', 'arm_r', 'head', 'leg_l', 'leg_r', 'root', 'torso'],
    saved_layer_ids: ['arm_l', 'arm_r', 'body', 'eye_switch', 'head', 'leg_l', 'leg_r', 'mouth_switch'],
    saved_layer_order: ['body', 'head', 'arm_l', 'arm_r', 'leg_l', 'leg_r'],
    parent_bone_pairs: [
      { boneId: 'torso', parentBoneId: 'root' },
      { boneId: 'head', parentBoneId: 'torso' },
      { boneId: 'arm_l', parentBoneId: 'torso' },
      { boneId: 'arm_r', parentBoneId: 'torso' },
      { boneId: 'leg_l', parentBoneId: 'root' },
      { boneId: 'leg_r', parentBoneId: 'root' }
    ],
    binding_pairs: [
      { partId: 'body', boneId: 'torso' },
      { partId: 'head', boneId: 'head' },
      { partId: 'arm_l', boneId: 'arm_l' },
      { partId: 'arm_r', boneId: 'arm_r' },
      { partId: 'leg_l', boneId: 'leg_l' },
      { partId: 'leg_r', boneId: 'leg_r' }
    ],
    switch_choices: {
      Mouth: mouthChoices,
      Eyes: eyeChoices,
      Hands: handChoices
    },
    action_driver_targets: [],
    mesh_point_counts: {},
    vitruvian_membership: {}
  };
  fs.writeFileSync(path.join(charPath, 'expected-native-structure.json'), JSON.stringify(expectedStructure, null, 2));
}

console.log('Successfully generated 20 licensed character packs in fixtures/moho95/characters/');
