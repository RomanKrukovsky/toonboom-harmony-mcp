"""The /infer/animeinbet endpoint must answer honestly when blocked.

Regression: the blocked provider payload (status=not_implemented) failed
InbetweenResponse validation, so FastAPI turned the honest refusal into a
generic HTTP 500. Callers must see a structured 200 with
realInferenceExecuted=false and the blocking reason instead.
"""

from fastapi.testclient import TestClient

from app import app

client = TestClient(app)


def test_blocked_inbetween_returns_structured_200():
    r = client.post(
        "/infer/animeinbet",
        json={"frame_a_path": "missing_a.png", "frame_b_path": "missing_b.png", "count": 3},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "not_implemented"
    assert body["realInferenceExecuted"] is False
    assert body["artifactCreated"] is False
    assert body["inbetweens"] == []
    assert body["blockingReason"]


def test_response_model_rejects_fake_success():
    import pytest
    from schemas import InbetweenResponse

    with pytest.raises(Exception):
        InbetweenResponse(
            status="completed",
            realInferenceExecuted=False,
            inbetweens=[{"frame": 2}],
        )
