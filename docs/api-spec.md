# API Spec（摘要）

> **真源是仓库根目录 `AGENTS.md`（当前契约 v1.1.0）**。本文仅作速查；冲突以 `AGENTS.md` 为准。

## 通则

- 前缀：`/api/v1`
- 信封：`{ "code": 0, "message": "ok", "data": ... }`
- WebSocket：**唯一**端点 `/ws/v1`（按 `event` 区分消息，不拆子路径）

## REST 速查

| 方法 | 路径 |
|---|---|
| GET | `/api/v1/health` |
| POST | `/api/v1/infer` |
| GET/POST/PATCH | `/api/v1/tasks`、`/api/v1/tasks/{task_id}` |
| GET/DELETE | `/api/v1/records`、`/api/v1/records/{record_id}` |
| GET | `/api/v1/records/export?fmt=xlsx\|csv` |
| GET | `/api/v1/map`、`/stations`、`/path/planned`、`/path/traveled`、`/robot/pose` |
| GET/PUT | `/api/v1/config` |

## 计数张量

- 图像 W×H = **640×360**
- ONNX NCHW = **`1×3×360×640`**
