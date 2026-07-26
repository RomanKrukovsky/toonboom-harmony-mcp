import importlib.util
from pathlib import Path

import pytest


BRIDGE_PATH = Path(__file__).resolve().parents[3] / "scripts" / "python" / "harmony_bridge.py"
SPEC = importlib.util.spec_from_file_location("harmony_bridge_helpers", BRIDGE_PATH)
BRIDGE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(BRIDGE)


class FakeDrawingAttribute:
    def __init__(self):
        self.values = []

    def set_value(self, frame, drawing):
        self.values.append((frame, drawing))


class FakeCel:
    def __init__(self):
        self.paths = []

    def write(self, path):
        self.paths.append(path)


class FakeScene:
    frame_count = 1
    framerate = 24.0


class FakeResolution:
    x = 1920
    y = 1080


class FakeProject:
    resolution = FakeResolution()


def test_exposure_range_writes_every_frame_for_deduplicated_hold():
    attribute = FakeDrawingAttribute()
    drawing = object()

    BRIDGE.set_drawing_exposure_range(attribute, 3, 4, drawing)

    assert attribute.values == [(3, drawing), (4, drawing), (5, drawing), (6, drawing)]


@pytest.mark.parametrize("start,duration", [(0, 1), (1, 0), (-1, 2)])
def test_exposure_range_rejects_invalid_values(start, duration):
    with pytest.raises(ValueError):
        BRIDGE.set_drawing_exposure_range(FakeDrawingAttribute(), start, duration, object())


def test_rendered_cel_uses_documented_write_method(tmp_path):
    cel = FakeCel()
    output = tmp_path / "preview_0001.png"

    BRIDGE.write_rendered_cel(cel, str(output))

    assert cel.paths == [str(output)]


def test_scene_settings_use_documented_timing_and_resolution_properties():
    scene = FakeScene()
    project = FakeProject()

    BRIDGE.set_project_scene_settings(project, scene, 12, 23.976, 1280, 720)

    assert scene.frame_count == 12
    assert scene.framerate == 23.976
    assert project.resolution.x == 1280
    assert project.resolution.y == 720
