#!/usr/bin/env python3
"""Build a gesture-library entry from mocap keypoints (JSONL).

Reads per-frame keypoints (rows: {frame, points:[{name,x,y,confidence}]}),
extracts the joint ANGLE curve for each --joint-pairs pair
(parent -> joint -> child), smooths it, resamples to --duration frames and
emits a GestureTrackLibrary JSON (schema: src/schemas/gestureTracks.ts) with
provenance 'motion_capture'.

Honest failures: a joint missing from >50% of frames exits 2 with the reason.
Deterministic: sorted keys, fixed 2-decimal rounding, stdlib only.
"""

import argparse
import json
import math
import sys


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--keypoints', required=True)
    p.add_argument('--output', required=True)
    p.add_argument('--gesture-id', required=True)
    p.add_argument('--duration', type=int, default=0, help='resample target frames (0 = frame count)')
    p.add_argument('--character-id', default='char_main_v1')
    p.add_argument('--joint-pairs', required=True,
                   help='repeatable-ish: comma list joint:parent,child')
    p.add_argument('--controller-map', default='',
                   help='comma list joint:CONTROLLER_ID (default ARM_POINT)')
    return p.parse_args()


def main() -> int:
    args = parse_args()
    pairs = []
    # Pair format: 'joint:parent,child'. A pair itself contains a comma, so
    # tokens are accumulated until the next token that introduces a new
    # 'joint:' prefix.
    raw_tokens = [t.strip() for t in args.joint_pairs.split(',') if t.strip()]
    acc = None
    for tok in raw_tokens:
        if ':' in tok:
            if acc is not None:
                pairs.append(acc)
            joint, rest = tok.split(':', 1)
            acc = [joint.strip(), rest.strip()]
        else:
            if acc is None:
                print(json.dumps({'error': f'orphan token "{tok}" in --joint-pairs'}))
                return 2
            acc[1] += ',' + tok
    if acc is not None:
        pairs.append(acc)
    parsed_pairs = []
    for joint, rest in pairs:
        parent, child = rest.split(',', 1)
        parsed_pairs.append((joint.strip(), parent.strip(), child.strip()))
    pairs = parsed_pairs

    cmap = {}
    for chunk in args.controller_map.split(','):
        chunk = chunk.strip()
        if chunk:
            joint, ctrl = chunk.split(':', 1)
            cmap[joint.strip()] = ctrl.strip()

    frames = []
    with open(args.keypoints, 'r', encoding='utf-8') as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            pts = {p['name']: p for p in row.get('points', [])}
            frames.append(pts)

    if not frames:
        print(json.dumps({'error': 'no keypoint frames parsed'}))
        return 2

    def angle_deg(frame_idx, joint, parent, child):
        pts = frames[frame_idx]
        pj, pp, pc = pts[joint], pts[parent], pts[child]
        ax, ay = pj['x'] - pp['x'], pj['y'] - pp['y']
        bx, by = pc['x'] - pj['x'], pc['y'] - pj['y']
        a = math.degrees(math.atan2(ax * by - ay * bx, ax * bx + ay * by))
        return a

    tracks = []
    for joint, parent, child in pairs:
        missing = sum(1 for pts in frames if joint not in pts or parent not in pts or child not in pts)
        if missing > len(frames) * 0.5:
            print(json.dumps({'error': f'joint "{joint}" missing from {missing}/{len(frames)} frames'}))
            return 2
        raw = [angle_deg(i, joint, parent, child) if (joint in pts and parent in pts and child in pts) else None
               for i, pts in enumerate(frames)]
        # Fill gaps by nearest previous value.
        last = 0.0
        filled = []
        for v in raw:
            if v is None:
                v = last
            last = v
            filled.append(v)
        # 3-tap moving average.
        smooth = []
        for i in range(len(filled)):
            a = filled[max(0, i - 1)]
            b = filled[i]
            c = filled[min(len(filled) - 1, i + 1)]
            smooth.append((a + b + c) / 3.0)

        duration = args.duration or len(frames)
        keys = []
        for k in range(duration):
            t = k / max(1, duration - 1)
            src = t * (len(smooth) - 1)
            i0 = int(math.floor(src))
            i1 = min(len(smooth) - 1, i0 + 1)
            frac = src - i0
            val = smooth[i0] * (1 - frac) + smooth[i1] * frac
            keys.append({'offsetFrame': k, 'rotation': round(val, 2), 'interpolation': 'LINEAR'})

        tracks.append({
            'controllerId': cmap.get(joint, 'ARM_POINT'),
            'keys': keys
        })

    lib = {
        'schemaVersion': '1.0',
        'characterId': args.character_id,
        'gestures': [{
            'gestureId': args.gesture_id,
            'description': f'Motion-capture derived joint-angle curve (image-space signed degrees) from {args.keypoints}',
            'durationFrames': args.duration or len(frames),
            'provenance': 'motion_capture',
            'tracks': tracks
        }]
    }
    with open(args.output, 'w', encoding='utf-8') as fh:
        json.dump(lib, fh, indent=2, sort_keys=True)
        fh.write('\n')
    print(json.dumps({'ok': True, 'output': args.output, 'gestures': 1}))
    return 0


if __name__ == '__main__':
    sys.exit(main())
