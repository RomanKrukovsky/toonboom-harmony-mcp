import fs from 'fs';
import path from 'path';

const manifestPath = path.resolve('fixtures/moho95/benchmark-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const assetsBase = path.resolve('fixtures/moho95/assets');
fs.mkdirSync(assetsBase, { recursive: true });

const sampleWav = fs.readFileSync('fixtures/sample_audio.wav');

// Helper to create valid 1x1 RGBA PNG
function createPng(r, g, b, a = 255) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]);
  const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
  const ihdrChunk = Buffer.concat([Buffer.from([0, 0, 0, 13]), Buffer.from('IHDR'), ihdrData, ihdrCrc]);

  const rawPixel = Buffer.from([0, r, g, b, a]);
  const s1 = (1 + r + g + b + a) % 65521;
  const s2 = (1 + (1 + r) + (1 + r + g) + (1 + r + g + b) + (1 + r + g + b + a)) % 65521;
  const adler = Buffer.alloc(4);
  adler.writeUInt32BE(((s2 << 16) | s1) >>> 0, 0);

  const zlibData = Buffer.concat([Buffer.from([0x78, 0x01, 0x01, 0x05, 0x00, 0xfa, 0xff]), rawPixel, adler]);
  const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), zlibData]));
  const idatChunk = Buffer.concat([Buffer.alloc(4), Buffer.from('IDAT'), zlibData, idatCrc]);
  idatChunk.writeUInt32BE(zlibData.length, 0);

  const iendCrc = crc32(Buffer.from('IEND'));
  const iendChunk = Buffer.concat([Buffer.from([0, 0, 0, 0]), Buffer.from('IEND'), iendCrc]);

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

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

const mouthChoices = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'X'];

for (const shot of manifest.shots) {
  const shotDir = path.join(assetsBase, shot.shotId);
  fs.mkdirSync(shotDir, { recursive: true });

  if (shot.hasDialogue) {
    fs.writeFileSync(path.join(shotDir, 'dialogue.wav'), sampleWav);
  }

  if (shot.artworkMode === 'flat_scene') {
    fs.writeFileSync(path.join(shotDir, 'scene.png'), createPng(120, 180, 240));
  } else if (shot.artworkMode === 'flat_characters') {
    for (let i = 1; i <= shot.activeCharacterCount; i++) {
      const filename = `character-${String(i).padStart(2, '0')}.png`;
      fs.writeFileSync(path.join(shotDir, filename), createPng(80 * (i % 3 + 1), 60 * (i % 4 + 1), 50 * (i % 5 + 1)));
    }
  } else if (shot.artworkMode === 'layered_manifest') {
    const partsDir = path.join(shotDir, 'parts');
    fs.mkdirSync(partsDir, { recursive: true });

    const partNames = ['body', 'head', 'arm_l', 'arm_r', 'leg_l', 'leg_r'];
    for (const name of partNames) {
      fs.writeFileSync(path.join(partsDir, `${name}.png`), createPng(100, 150, 200));
    }
    for (const choice of mouthChoices) {
      fs.writeFileSync(path.join(partsDir, `mouth_${choice}.png`), createPng(200, 50, 50));
    }

    const layeredManifest = {
      schemaVersion: '3.0',
      parts: [
        { partId: 'body', characterRef: shot.characterId, sourcePath: 'parts/body.png', maskPath: null, zIndex: 10, confidence: 1.0, pivot: { x: 0, y: 0 }, view: shot.view || 'front' },
        { partId: 'head', characterRef: shot.characterId, sourcePath: 'parts/head.png', maskPath: null, zIndex: 20, confidence: 1.0, pivot: { x: 0, y: 150 }, view: shot.view || 'front' },
        { partId: 'arm_l', characterRef: shot.characterId, sourcePath: 'parts/arm_l.png', maskPath: null, zIndex: 15, confidence: 1.0, pivot: { x: -50, y: 80 }, view: shot.view || 'front' },
        { partId: 'arm_r', characterRef: shot.characterId, sourcePath: 'parts/arm_r.png', maskPath: null, zIndex: 5, confidence: 1.0, pivot: { x: 50, y: 80 }, view: shot.view || 'front' },
        { partId: 'leg_l', characterRef: shot.characterId, sourcePath: 'parts/leg_l.png', maskPath: null, zIndex: 8, confidence: 1.0, pivot: { x: -30, y: -100 }, view: shot.view || 'front' },
        { partId: 'leg_r', characterRef: shot.characterId, sourcePath: 'parts/leg_r.png', maskPath: null, zIndex: 7, confidence: 1.0, pivot: { x: 30, y: -100 }, view: shot.view || 'front' }
      ],
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
      drawingAssets: mouthChoices.map(c => ({
        drawingId: `mouth_${c}`,
        kind: 'mouth',
        choiceName: c,
        sourcePath: `parts/mouth_${c}.png`,
        confidence: 1.0
      })),
      overallConfidence: 1.0
    };
    fs.writeFileSync(path.join(shotDir, 'layered-manifest-v3.json'), JSON.stringify(layeredManifest, null, 2));
  }
}

console.log('Successfully generated shot assets for all 40 shots in fixtures/moho95/assets/');
