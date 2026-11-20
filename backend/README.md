# Backend · FastAPI

> 接口契约真源：仓库根目录 `AGENTS.md`（v1.1.0+）。速查见 `docs/api-spec.md`。

## 启动

在仓库根目录：

```bash
./scripts/dev-backend.sh
```

或：

```bash
export PYTHONPATH=.
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 18765 --reload
```

## 目标接口（契约）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/v1/health` | 健康检查 |
| POST | `/api/v1/infer` | 上传图片推理 |
| GET/PUT | `/api/v1/config` | 系统配置 |
| GET | `/api/v1/records` | 台账列表 |
| GET | `/api/v1/records/export?fmt=xlsx\|csv` | 导出台账 |
| WS | `/ws/v1` | 实时事件（单一端点） |

统一响应：`{code, message, data}`。

Swagger：`http://127.0.0.1:18765/docs`

## 迁移说明

当前仓库仍可能残留无版本 `/api/*` 旧路径；新代码只允许 `/api/v1/*`，迁移完成后删除旧路径。
