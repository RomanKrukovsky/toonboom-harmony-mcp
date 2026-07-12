import pytest
from pydantic import ValidationError

from reconstruction_core.models import ReconstructionRequest


def test_request_rejects_unknown_fields_and_bad_range():
    with pytest.raises(ValidationError):
        ReconstructionRequest(videoPath="x.mp4", startFrame=10, endFrame=2)
    with pytest.raises(ValidationError):
        ReconstructionRequest(videoPath="x.mp4", arbitraryCode="print('unsafe')")


def test_only_vertical_mode_is_accepted():
    with pytest.raises(ValidationError):
        ReconstructionRequest(videoPath="x.mp4", mode="hybrid")
