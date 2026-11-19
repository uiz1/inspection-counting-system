# 架构说明（框架阶段）

## 数据流

```
采图/上传
  → 光照特征提取（5 维）
  → 动态路由（normal / low / high）
  → 预处理分支（identity / Zero-DCE++ / specular+CLAHE）
  → 密度图回归计数
  → Web 展示 + 台账
```

## 模块边界

| 目录 | 职责 |
|---|---|
| `algorithms/lighting` | 特征、路由、三分支预处理 |
| `algorithms/counting` | 密度计数（占位 → MobileCount ONNX） |
| `backend/app` | FastAPI API、台账、管线编排 |
| `frontend` | Vue3 监控终端 |

## 后续替换点

1. `algorithms/lighting/preprocess.py` → 正式 Zero-DCE++ 权重
2. `algorithms/counting/density.py` → MobileCount ONNX Runtime
3. 新增 `ros2_ws/` 采图节点，推送到 `/api/infer`
