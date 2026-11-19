# Backend · FastAPI

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

## 主要接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查 |
| POST | `/api/infer` | 上传图片推理 |
| GET | `/api/ledger` | 台账列表 |
| GET | `/api/ledger/export?fmt=xlsx\|csv` | 导出台账 |
| DELETE | `/api/ledger` | 清空台账 |

Swagger：`http://127.0.0.1:18765/docs`
