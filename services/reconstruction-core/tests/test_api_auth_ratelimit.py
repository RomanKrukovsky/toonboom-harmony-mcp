import os
import pytest
from fastapi.testclient import TestClient
from reconstruction_core.api import app, request_counts

client = TestClient(app)

def test_health_unauthenticated():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["version"] is not None

def test_api_key_authentication(monkeypatch):
    monkeypatch.setenv("RECONSTRUCTION_API_KEY", "secret_test_key_123")
    
    # Request without header fails with 401
    resp_unauth = client.get("/v1/jobs/nonexistent")
    assert resp_unauth.status_code == 401
    assert resp_unauth.json()["code"] == "UNAUTHORIZED"
    
    # Request with invalid header fails with 401
    resp_bad = client.get("/v1/jobs/nonexistent", headers={"X-API-Key": "wrong_key"})
    assert resp_bad.status_code == 401
    
    # Request with correct header proceeds past auth (will return 404 for nonexistent job)
    resp_good = client.get("/v1/jobs/nonexistent", headers={"X-API-Key": "secret_test_key_123"})
    assert resp_good.status_code == 404

def test_rate_limiting(monkeypatch):
    monkeypatch.setenv("RECONSTRUCTION_RATE_LIMIT", "3")
    request_counts.clear()
    
    # Send 3 requests (allowed)
    for _ in range(3):
        res = client.get("/v1/jobs/test_ratelimit")
        assert res.status_code != 429
        
    # 4th request should return 429 Rate Limit Exceeded
    res_exceeded = client.get("/v1/jobs/test_ratelimit")
    assert res_exceeded.status_code == 429
    assert res_exceeded.json()["code"] == "RATE_LIMIT_EXCEEDED"
    
    request_counts.clear()
