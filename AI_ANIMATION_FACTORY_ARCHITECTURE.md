# AI Animation Factory — Architecture Baseline

Дата: 2026-07-12. Ветка: `main`.

## Phase 1 boundaries

```text
MCP control plane (Node.js)
├── factory tools + Zod input validation
├── token RBAC
├── durable job DAG + checkpoints (SQLite dev backend)
├── model/dataset registry
├── content-addressed artifact store (SHA-256)
└── metrics records
        ↓ HTTP
Python reconstruction worker
├── /health/live, /health/ready, /metrics
├── real OpenCV video observation
├── real WAV feature extraction
├── existing motion retargeting
└── verified SVG previews
```

Тяжёлая обработка не загружается в MCP-процесс. SQLite и локальный object store разрешены только как dev backend. PostgreSQL, Redis, GPU scheduler и tenant isolation пока не реализованы.

## Factual baseline

| Подсистема | Статус | Доказательство |
|---|---|---|
| MCP control plane | verified_real | build, tool registration, real worker call |
| Durable jobs/checkpoints | verified_real (dev) | restart test на SQLite |
| Artifact integrity | verified_real (local) | SHA-256 и повторный ingest |
| Auth/RBAC | verified_real | configured-token tests и authenticated demo |
| Model/dataset registry | implemented_unverified | SQLite contract есть; production registry backend отсутствует |
| Observability | verified_real (baseline) | job IDs, metrics table, health/ready/metrics worker endpoints |
| OpenCV silhouette inference | verified_real, degraded quality | реальные пиксели MP4; не анатомическая pose-модель |
| Audio features | verified_real | настоящий PCM WAV, RMS energy |
| Retargeting | verified_real locally | реальные observed landmarks → transform manifest → SVG |
| Native Harmony/TVG | requires_real_harmony | не проверено, Phase 2 |
| PostgreSQL/Redis/object storage service | not_implemented | только интерфейсные границы и SQLite/local backend |

Phase 1 не доказывает анатомическую pose estimation, нативную Harmony-сцену или промышленную готовность.
