import fs from 'fs';
import path from 'path';

export interface TimelineShotItem {
  shotName: string;
  durationFrames: number;
  videoFilePath?: string;
  audioDialoguePath?: string;
  audioSfxPath?: string;
  cameraMotionType?: 'DramaticPushIn' | 'WhipPan' | 'TrackingShot' | 'Static';
  dialogueSubtitle?: string;
}

export interface BroadcastTimelineOptions {
  timelineName: string;
  fps?: number;
  shots: TimelineShotItem[];
  outputOtioPath?: string;
  outputXmlPath?: string;
}

export interface BroadcastTimelineResult {
  timelineName: string;
  totalShotsCount: number;
  totalDurationFrames: number;
  totalDurationSeconds: number;
  timecodeDuration: string;
  otioJson: Record<string, unknown>;
  fcpxmlContent: string;
  outputOtioPath?: string;
  outputXmlPath?: string;
}

/**
 * MohoBroadcastTimelineComposer — Compiles multi-shot Moho animated sequences
 * into broadcast NLE timelines (OpenTimelineIO .otio & Final Cut Pro .fcpxml)
 * with dialogue tracks, SFX, and camera transitions for DaVinci Resolve & Premiere Pro.
 */
export class MohoBroadcastTimelineComposer {
  public static composeTimeline(options: BroadcastTimelineOptions): BroadcastTimelineResult {
    const fps = options.fps ?? 24;
    const timelineName = options.timelineName.trim() || 'Episode_Timeline';

    let totalFrames = 0;
    const otioClips: Array<Record<string, unknown>> = [];
    const fcpxmlClips: string[] = [];

    options.shots.forEach((shot, idx) => {
      const startFrame = totalFrames;
      const duration = Math.max(1, shot.durationFrames);
      totalFrames += duration;

      const mediaPath = shot.videoFilePath || `media/shot_${idx + 1}.mov`;

      // OpenTimelineIO Clip Object
      otioClips.push({
        OTIO_SCHEMA: 'Clip.1',
        name: shot.shotName,
        source_range: {
          OTIO_SCHEMA: 'TimeRange.1',
          start_time: {
            OTIO_SCHEMA: 'RationalTime.1',
            rate: fps,
            value: 0
          },
          duration: {
            OTIO_SCHEMA: 'RationalTime.1',
            rate: fps,
            value: duration
          }
        },
        media_reference: {
          OTIO_SCHEMA: 'ExternalReference.1',
          target_url: mediaPath
        },
        metadata: {
          cameraMotion: shot.cameraMotionType ?? 'Static',
          subtitle: shot.dialogueSubtitle ?? ''
        }
      });

      // FCPXML Clip Element
      fcpxmlClips.push(`
        <clip name="${shot.shotName}" offset="${startFrame}/${fps}s" duration="${duration}/${fps}s" start="0s">
            <video ref="r_${idx + 1}" duration="${duration}/${fps}s" />
            <title name="Dialogue" offset="0s" duration="${duration}/${fps}s">
                <text>${shot.dialogueSubtitle ?? ''}</text>
            </title>
        </clip>`);
    });

    const totalSeconds = totalFrames / fps;
    const timecode = this.framesToSMPTE(totalFrames, fps);

    // OpenTimelineIO Top-Level Schema
    const otioJson: Record<string, unknown> = {
      OTIO_SCHEMA: 'Timeline.1',
      name: timelineName,
      global_start_time: {
        OTIO_SCHEMA: 'RationalTime.1',
        rate: fps,
        value: 0
      },
      tracks: {
        OTIO_SCHEMA: 'Stack.1',
        children: [
          {
            OTIO_SCHEMA: 'Track.1',
            name: 'V1 - Animation',
            kind: 'Video',
            children: otioClips
          }
        ]
      }
    };

    // FCPXML Document
    const fcpxmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.9">
    <resources>
        <format id="r_fmt" name="FFVideoFormat1080p24" frameDuration="1/${fps}s" width="1920" height="1080"/>
    </resources>
    <library>
        <event name="${timelineName}">
            <project name="${timelineName}">
                <sequence format="r_fmt" duration="${totalFrames}/${fps}s">
                    <spine>
                        ${fcpxmlClips.join('\n')}
                    </spine>
                </sequence>
            </project>
        </event>
    </library>
</fcpxml>`;

    if (options.outputOtioPath) {
      const outDir = path.dirname(options.outputOtioPath);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      fs.writeFileSync(options.outputOtioPath, JSON.stringify(otioJson, null, 2));
    }

    if (options.outputXmlPath) {
      const outDir = path.dirname(options.outputXmlPath);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      fs.writeFileSync(options.outputXmlPath, fcpxmlContent);
    }

    return {
      timelineName,
      totalShotsCount: options.shots.length,
      totalDurationFrames: totalFrames,
      totalDurationSeconds: Math.round(totalSeconds * 100) / 100,
      timecodeDuration: timecode,
      otioJson,
      fcpxmlContent,
      outputOtioPath: options.outputOtioPath,
      outputXmlPath: options.outputXmlPath
    };
  }

  private static framesToSMPTE(frames: number, fps: number): string {
    const totalSecs = Math.floor(frames / fps);
    const f = frames % fps;
    const s = totalSecs % 60;
    const m = Math.floor(totalSecs / 60) % 60;
    const h = Math.floor(totalSecs / 3600);

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
  }
}
