import { describe, it, expect } from '@jest/globals';
import path from 'path';
import fs from 'fs';
import { MohoSpeechPhonemeBaker } from '../src/services/mohoSpeechPhonemeBaker/index.js';
import { MohoBroadcastTimelineComposer } from '../src/services/mohoBroadcastTimelineComposer/index.js';

describe('Moho Speech Phoneme Baker & Broadcast Timeline Composer', () => {
  it('bakes acoustic dialogue phonemes, volume heights, and eyebrow pitch into timeline', () => {
    const baked = MohoSpeechPhonemeBaker.bakeSpeechTrack({
      transcriptText: 'Aw jeez Rick, I dont know about this universe!',
      durationSeconds: 3.0,
      fps: 24,
      characterName: 'Morty_Smith'
    });

    expect(baked.totalFrames).toBe(72);
    expect(baked.phonemeTimeline.length).toBe(72);
    expect(baked.summary.wordsCount).toBe(9);
    expect(baked.phonemeTimeline[0].phoneme).toBeDefined();
    expect(baked.phonemeTimeline[0].mouthOpenHeight).toBeGreaterThanOrEqual(0.3);
  });

  it('composes multi-shot OpenTimelineIO and FCPXML broadcast edit with dialogue tracks', () => {
    const otioPath = path.resolve(process.cwd(), 'output/Episode_101_Edit.otio');
    const xmlPath = path.resolve(process.cwd(), 'output/Episode_101_Edit.fcpxml');

    const timeline = MohoBroadcastTimelineComposer.composeTimeline({
      timelineName: 'Rick_And_Morty_Ep101',
      fps: 24,
      shots: [
        {
          shotName: 'Shot_01_Establishing',
          durationFrames: 72,
          cameraMotionType: 'DramaticPushIn',
          dialogueSubtitle: 'Rick: We need to go, Morty!'
        },
        {
          shotName: 'Shot_02_Morty_Reaction',
          durationFrames: 48,
          cameraMotionType: 'WhipPan',
          dialogueSubtitle: 'Morty: Aw jeez...'
        },
        {
          shotName: 'Shot_03_Summer_Action',
          durationFrames: 96,
          cameraMotionType: 'TrackingShot',
          dialogueSubtitle: 'Summer: Are you guys serious?'
        }
      ],
      outputOtioPath: otioPath,
      outputXmlPath: xmlPath
    });

    expect(timeline.totalShotsCount).toBe(3);
    expect(timeline.totalDurationFrames).toBe(216);
    expect(timeline.timecodeDuration).toBe('00:00:09:00');
    expect(fs.existsSync(otioPath)).toBe(true);
    expect(fs.existsSync(xmlPath)).toBe(true);
  });
});
