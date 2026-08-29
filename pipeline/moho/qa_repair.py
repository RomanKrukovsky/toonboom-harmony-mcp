import os
import json
from dataclasses import dataclass
from typing import List, Dict, Any, Tuple

@dataclass
class QADefect:
    issue_type: str
    frame: int
    severity: str
    description: str
    layer_id: str = None
    bone_id: str = None
    meta: Dict[str, Any] = None

class MohoVisualQARepairEngine:
    def __init__(self, project_path: str, max_passes: int = 5):
        self.project_path = project_path
        self.max_passes = max_passes
        self.current_pass = 0
        self.defects = []
        self.repair_log = []

    def audit_frames(self, frames_data: List[Dict[str, Any]]) -> List[QADefect]:
        defects = []
        blink_tracker = 0
        
        for idx, frame in enumerate(frames_data):
            f_num = frame.get('frame_number', idx)
            # Empty frames
            visible_pixels = frame.get('visible_pixels', 0)
            canvas_area = frame.get('canvas_area', 1920 * 1080)
            if visible_pixels / canvas_area < 0.01:
                defects.append(QADefect('empty_frame', f_num, 'high', 'Frame is empty or <1% visible pixels'))
            
            # Character clipping
            if frame.get('is_clipping', False):
                defects.append(QADefect('character_clipping', f_num, 'medium', 'Character is clipped or off-screen'))
            
            # Position jumps
            if idx > 0:
                prev_pos = frames_data[idx-1].get('position', (0, 0))
                curr_pos = frame.get('position', (0, 0))
                dist = ((curr_pos[0]-prev_pos[0])**2 + (curr_pos[1]-prev_pos[1])**2)**0.5
                if dist > frame.get('max_allowed_jump', 100):
                    defects.append(QADefect('position_jump', f_num, 'high', 'Sudden position jump / popping'))
                    
            # Silhouette explosion
            if idx > 0:
                prev_area = frames_data[idx-1].get('silhouette_area', 1000)
                curr_area = frame.get('silhouette_area', 1000)
                if prev_area > 0 and (curr_area / prev_area > 1.5 or curr_area / prev_area < 0.5):
                    defects.append(QADefect('silhouette_explosion', f_num, 'high', 'Extreme silhouette area explosion/collapse'))
            
            # Foot sliding
            if frame.get('ground_contact', False) and frame.get('foot_sliding', False):
                defects.append(QADefect('foot_sliding', f_num, 'medium', 'Foot sliding during ground contact'))
            
            # Joint seam tears
            for joint in frame.get('joints', []):
                if joint.get('has_gap', False):
                    defects.append(QADefect('joint_seam_tear', f_num, 'high', 'Joint seam tear/transparent gap', bone_id=joint.get('id')))
            
            # Facial drift
            if frame.get('facial_drift', False):
                defects.append(QADefect('facial_drift', f_num, 'high', 'Facial feature drift from skull contour'))
            
            # Z-order errors
            if frame.get('z_order_error', False):
                defects.append(QADefect('z_order_error', f_num, 'high', 'Z-order layer sorting error'))
                
            # Blinks and frozen mouth
            is_speaking = frame.get('is_speaking', False)
            mouth_frozen = frame.get('mouth_frozen', False)
            if is_speaking and mouth_frozen:
                defects.append(QADefect('frozen_mouth', f_num, 'medium', 'Frozen mouth during dialogue'))
                
            if not frame.get('is_blinking', False):
                blink_tracker += 1
                fps = frame.get('fps', 24)
                if blink_tracker > 5 * fps:
                    defects.append(QADefect('missing_blink', f_num, 'medium', 'Missing eye blinks > 5 sec'))
            else:
                blink_tracker = 0
                
            # Animator control bones
            if frame.get('control_bones_visible', False):
                defects.append(QADefect('control_bones_visible', f_num, 'high', 'Animator control bones leaking into render'))
                
            # Native corruption
            if frame.get('native_corruption', False):
                defects.append(QADefect('native_corruption', f_num, 'critical', 'Native Moho corruption/warning'))
                
        return defects

    def apply_fixes(self, defects: List[QADefect]) -> int:
        fixes_applied = 0
        for defect in defects:
            fix_action = None
            if defect.issue_type == 'joint_seam_tear':
                fix_action = f"Adjust joint overlap padding (+15% circular expansion) for bone {defect.bone_id}"
            elif defect.issue_type in ['position_jump', 'silhouette_explosion']:
                fix_action = f"Clamp extreme joint angles and IK targets at frame {defect.frame}"
            elif defect.issue_type == 'missing_blink':
                fix_action = f"Insert natural blink keys at frame {defect.frame}"
            elif defect.issue_type == 'frozen_mouth':
                fix_action = f"Insert neutral/rest mouth phonemes at frame {defect.frame}"
            elif defect.issue_type == 'z_order_error':
                fix_action = f"Fix Z-order layer sorting and bone parent connections at frame {defect.frame}"
            elif defect.issue_type in ['empty_frame', 'native_corruption']:
                fix_action = f"Restore missing visibility and reset corrupted frame 0 channels"
            elif defect.issue_type == 'control_bones_visible':
                fix_action = f"Hide control bones from final render at frame {defect.frame}"
                
            if fix_action:
                self.repair_log.append({"frame": defect.frame, "issue": defect.issue_type, "action": fix_action})
                fixes_applied += 1
                
        return fixes_applied

    def run_repair_loop(self, get_frames_cb) -> Tuple[bool, List[Dict[str, Any]]]:
        """
        get_frames_cb: function that triggers a render/compilation and returns frames data.
        Returns (is_certified, repair_log)
        """
        for self.current_pass in range(1, self.max_passes + 1):
            frames_data = get_frames_cb(self.current_pass)
            self.defects = self.audit_frames(frames_data)
            
            if not self.defects:
                self.repair_log.append({"pass": self.current_pass, "status": "certified", "message": "No defects found."})
                return True, self.repair_log
                
            fixes_applied = self.apply_fixes(self.defects)
            self.repair_log.append({
                "pass": self.current_pass,
                "defects_found": len(self.defects),
                "fixes_applied": fixes_applied
            })
            
        return False, self.repair_log
