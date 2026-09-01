import sys
from pathlib import Path
REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO))
from pipeline.moho.emit import emit
from pipeline.pir.schema import Bone, Part, Rig

rig = Rig(name="skel", source_program="moho", source_version="1038",
          canvas={"mime_type": "application/x-vnd.lm_mohodoc", "version": 1038, "major_version": 1, "rev_version": 0, "doc_uuid": "", "comment": ""})
rig.bones = [Bone(id="Main", parent=None, position=(0.0, 0.0), angle=0.0, length=0.5)]
root = Part(id="root", name="skel", type="bone_container")
rig.root_parts = [root]
out = "test_skeleton.moho"
emit(rig, out)
