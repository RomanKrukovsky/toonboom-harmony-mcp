"""
Security middleware for Reconstruction Core API
Provides: API key auth, rate limiting, request size limits, timeouts, audit logging
"""

import os
import json
import time
import hashlib
import logging
import asyncio
import aiofiles
from pathlib import Path
from typing import Callable, Optional

from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class SecurityConfig:
    # API Key authentication
    API_KEYS: set[str] = set(
        k.strip() for k in os.environ.get("RECONSTRUCTION_API_KEYS", "").split(",") if k.strip()
    )
    API_KEY_HEADER = "X-API-Key"
    
    # Rate limiting
    RATE_LIMIT_REQUESTS = int(os.environ.get("RECONSTRUCTION_RATE_LIMIT", "60"))
    RATE_LIMIT_WINDOW_SEC = int(os.environ.get("RECONSTRUCTION_RATE_WINDOW", "60"))
    
    # Request size limits (MB)
    MAX_REQUEST_SIZE_MB = int(os.environ.get("RECONSTRUCTION_MAX_REQUEST_MB", "50"))
    MAX_UPLOAD_SIZE_MB = int(os.environ.get("RECONSTRUCTION_MAX_UPLOAD_MB", "500"))
    
    # Request timeout
    REQUEST_TIMEOUT_SEC = int(os.environ.get("RECONSTRUCTION_TIMEOUT", "300"))
    
    # Audit logging
    AUDIT_LOG_ENABLED = os.environ.get("RECONSTRUCTION_AUDIT_LOG", "true").lower() == "true"
    AUDIT_LOG_DIR = os.environ.get("RECONSTRUCTION_AUDIT_DIR", "./logs/audit")


# Rate limiter with in-memory sliding window
class RateLimiter:
    def __init__(self):
        self._cache: dict[str, list[float]] = {}
        self._locks: dict[str, asyncio.Lock] = {}
    
    def _get_lock(self, key: str) -> asyncio.Lock:
        if key not in self._locks:
            self._locks[key] = asyncio.Lock()
        return self._locks[key]
    
    async def is_allowed(self, key: str) -> tuple[bool, dict[str, str]]:
        """Check if request is allowed. Returns (allowed, headers)"""
        lock = self._get_lock(key)
        async with lock:
            now = time.time()
            window_start = now - SecurityConfig.RATE_LIMIT_WINDOW_SEC
            
            # Initialize or clean cache
            if key not in self._cache:
                self._cache[key] = []
            
            # Remove old entries
            self._cache[key] = [ts for ts in self._cache[key] if ts > window_start]
            
            count = len(self._cache[key])
            
            if count >= SecurityConfig.RATE_LIMIT_REQUESTS:
                return False, {
                    "X-RateLimit-Limit": str(SecurityConfig.RATE_LIMIT_REQUESTS),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(now + SecurityConfig.RATE_LIMIT_WINDOW_SEC)),
                    "Retry-After": str(SecurityConfig.RATE_LIMIT_WINDOW_SEC)
                }
            
            # Add current request
            self._cache[key].append(now)
            
            return True, {
                "X-RateLimit-Limit": str(SecurityConfig.RATE_LIMIT_REQUESTS),
                "X-RateLimit-Remaining": str(SecurityConfig.RATE_LIMIT_REQUESTS - count - 1),
                "X-RateLimit-Reset": str(int(now + SecurityConfig.RATE_LIMIT_WINDOW_SEC))
            }


# Global rate limiter
rate_limiter = RateLimiter()


async def verify_api_key(request: Request) -> Optional[str]:
    """Verify API key from header"""
    if not SecurityConfig.API_KEYS:
        return None  # No auth configured
    
    api_key = request.headers.get(SecurityConfig.API_KEY_HEADER)
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "MISSING_API_KEY", "message": f"Missing {SecurityConfig.API_KEY_HEADER} header"}
        )
    
    # Hash the provided key for comparison
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()
    
    # Check against stored hashes (support both plain and hashed)
    for stored_key in SecurityConfig.API_KEYS:
        if stored_key == key_hash or stored_key == api_key:
            return api_key
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={"code": "INVALID_API_KEY", "message": "Invalid API key"}
    )


class SecurityMiddleware(BaseHTTPMiddleware):
    """Combined security middleware for auth, rate limiting, size limits, timeouts, audit logging"""
    
    def __init__(self, app, exclude_paths: list[str] = None):
        super().__init__(app)
        self.exclude_paths = exclude_paths or ["/health", "/docs", "/openapi.json", "/redoc", "/metrics"]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        client_ip = request.client.host if request.client else "unknown"
        
        # Skip security for excluded paths
        if request.url.path in self.exclude_paths:
            return await call_next(request)
        
        # 1. API Key verification
        try:
            await verify_api_key(request)
        except HTTPException as e:
            return await self._audit_and_return(request, client_ip, start_time, e.status_code, e.detail)
        
        # 2. Rate limiting
        rate_key = f"ip:{client_ip}"
        allowed, rate_headers = await rate_limiter.is_allowed(rate_key)
        if not allowed:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"code": "RATE_LIMIT_EXCEEDED", "message": "Too many requests"},
                headers=rate_headers
            )
        
        # 3. Request size limit
        content_length = request.headers.get("content-length")
        if content_length:
            size_mb = int(content_length) / (1024 * 1024)
            max_size = SecurityConfig.MAX_UPLOAD_SIZE_MB if request.url.path.startswith("/v1/upload") else SecurityConfig.MAX_REQUEST_SIZE_MB
            if size_mb > max_size:
                return JSONResponse(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    content={"code": "REQUEST_TOO_LARGE", "message": f"Request size {size_mb:.1f}MB exceeds limit {max_size}MB"}
                )
        
        # 4. Process request with timeout
        try:
            response = await asyncio.wait_for(
                call_next(request),
                timeout=SecurityConfig.REQUEST_TIMEOUT_SEC
            )
        except asyncio.TimeoutError:
            return JSONResponse(
                status_code=504,
                content={"code": "REQUEST_TIMEOUT", "message": f"Request exceeded {SecurityConfig.REQUEST_TIMEOUT_SEC}s timeout"}
            )
        
        # Add rate limit headers
        for header, value in rate_headers.items():
            response.headers[header] = value
        
        # 5. Audit logging
        await self._audit_log(request, client_ip, start_time, response.status_code)
        
        return response
    
    async def _audit_and_return(self, request: Request, client_ip: str, start_time: float, status_code: int, detail: any) -> JSONResponse:
        """Log audit entry and return error response"""
        await self._audit_log(request, client_ip, start_time, status_code, detail=detail)
        return JSONResponse(status_code=status_code, content=detail)
    
    async def _audit_log(self, request: Request, client_ip: str, start_time: float, status_code: int, detail: any = None):
        """Write audit log entry"""
        if not SecurityConfig.AUDIT_LOG_ENABLED:
            return
        
        try:
            log_dir = Path(SecurityConfig.AUDIT_LOG_DIR)
            log_dir.mkdir(parents=True, exist_ok=True)
            
            log_file = log_dir / f"audit_{time.strftime('%Y-%m-%d')}.jsonl"
            
            entry = {
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ", time.gmtime()),
                "client_ip": client_ip,
                "method": request.method,
                "path": request.url.path,
                "query_params": dict(request.query_params),
                "status_code": status_code,
                "duration_ms": round((time.time() - start_time) * 1000, 2),
                "user_agent": request.headers.get("user-agent"),
                "api_key_prefix": (request.headers.get("X-API-Key", "")[:8] + "...") if request.headers.get("X-API-Key") else None,
                "error": detail if status_code >= 400 else None
            }
            
            # Redact sensitive fields
            entry_str = json.dumps(entry)
            if any(k in entry_str.lower() for k in ["password", "token", "secret", "api_key", "apikey"]):
                entry = {k: "***" if any(s in k.lower() for s in ["password", "token", "secret", "key"]) else v for k, v in entry.items()}
            
            # Atomic write
            async with aiofiles.open(log_file, "a") as f:
                await f.write(json.dumps(entry) + "\n")
                    
        except Exception as e:
            logger.error(f"Audit log error: {e}")


# Add missing imports at top
import os
import json
import time
import hashlib
import aiofiles
from typing import Optional


def setup_security_middleware(app, exclude_paths: list[str] = None):
    """Add security middleware to FastAPI app"""
    app.add_middleware(SecurityMiddleware, exclude_paths=exclude_paths)
    return app