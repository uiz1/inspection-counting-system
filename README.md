# 光巡计数 · 巡检机器人目标计数系统

基于光照自适应预处理的巡检机器人目标计数系统设计与实现。

面向工业车间半室外高反光环境，提供「光照感知动态路由 + 轻量化密集计数」的 Web 监控与推理框架。

## 功能（本阶段）

- Vue 3 + Element Plus 监控终端：上传采图、光照路由、校正前后对比、密度叠加、单帧耗时、台账导出
- FastAPI 推理服务：特征提取 → 三分类路由 → 三分支预处理 → 密度计数占位 → 台账
- 算法层可替换占位：Zero-DCE++ / 高光抑制+CLAHE 近似；密度图回归占位（后续接 MobileCount ONNX）
- 后端不可用时，前端自动切换浏览器本地演示管线

## 仓库结构

```
algorithms/          # 光照路由 / 预处理 / 计数算法
backend/             # FastAPI 服务
frontend/            # Vue 3 监控前端
data/                # 上传与台账运行时数据
scripts/             # 开发启动脚本
docs/                # 设计说明
```

## 本地运行

### 1. 后端

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
./scripts/dev-backend.sh
```

服务地址：`http://127.0.0.1:18765`（Swagger：`/docs`）

### 2. 前端

```bash
cd frontend
npm install
npm run dev
```

打开：`http://127.0.0.1:5178`

### 一键脚本

```bash
./scripts/dev-all.sh
```

## 技术路线（四环节）

1. 巡检采图平台（ROS2 Humble + Nav2 + 2D SLAM，本阶段预留）
2. 异构光照动态路由（normal / low / high）
3. 轻量化密度图回归（MobileCount ≤1M，后续 ONNX）
4. 可视化交互部署（本阶段已交付框架）

## 说明

当前计数与部分预处为**框架可运行占位**，用于联调与演示；正式模型权重与 ROS2 采图联调将在后续分块接入。
