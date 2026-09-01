import sys
from pathlib import Path
REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO))
from pipeline.moho.emit import emit
from pipeline.pir.schema import Bone, Part, Rig
from pipeline.riggen.vector_shapes import COLOR_SHIRT, make_ellipse_mesh

rig = Rig(name="test", source_program="moho", source_version="1041",
          canvas={"mime_type": "application/x-vnd.lm_mohodoc", "version": 1041, "major_version": 1, "rev_version": 0, "doc_uuid": "", "comment": ""})
rig.bones = [Bone(id="Main", parent=None, position=(0.0, 0.0), angle=0.0, length=0.5)]
mesh = make_ellipse_mesh(0.0, 0.0, 0.5, 0.7, COLOR_SHIRT)
part = Part(id="mesh1", name="Circle", type="mesh")
part.geometry_raw = mesh
root = Part(id="root", name="test", type="bone_container")
root.children = [part]
rig.root_parts = [root]
emit(rig, "test_debug.moho")
print("Emitted test_debug.moho")
