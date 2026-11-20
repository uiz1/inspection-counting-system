# AGENTS.md — 光巡计数项目整体约束（契约真源）

> **地位**：本文件是前后端 / 算法 / 机器人联调的**唯一长期契约**。  
> **优先级**：高于口头约定、高于临时实现、高于 README 中的示例代码。  
> **变更规则**：任何接口字段、枚举值、目录约定、响应结构的变更，**必须先改本文件并升版，再改代码**。  
> **当前契约版本**：`v1.1.0`（2026-11-20，Asia/Shanghai）

---

## 0. 代理人执行协议（每次开发前必读）

1. 开始任何编码 / 重构 / 联调前，先完整阅读本文件对应章节。
2. 新增或修改 API、WebSocket、数据模型时，先在本文件更新契约，再写实现。
3. 前后端字段名、类型、枚举、单位必须与本文件**逐字一致**（含蛇形 / 驼峰转换规则）。
4. 若实现与本文件冲突：**以本文件为准**，改代码而不是改口头理解。
5. 提交 PR / push 前自检：响应信封、路径前缀、枚举值、图像约束是否违约。

---

## 1. 项目定位

| 项 | 内容 |
|---|---|
| 名称 | 基于光照自适应预处理的巡检机器人目标计数系统（产品名：**光巡计数**） |
| 目标 | 车间半室外高反光环境下，巡检机器人多工位采图 → 光照动态路由预处理 → 轻量密度计数 → Web 监控与台账 |
| 形态 | 前后端分离 + 边缘推理 +（可选）ROS2 采图节点 |
| 产品英文代号 | `lumi-inspect` |

### 1.1 范围边界

- **必做**：光照路由、三分支预处理、轻量计数、Web 监控（含态势地图）、台账导出
- **加强**：ROS2 Humble + Nav2 + 2D SLAM 真机 / 仿真采图
- **默认不做**：多机器人调度、在线持续学习、3D 重建、重型检测器全家桶（除非用户书面追加）

---

## 2. 技术栈（冻结）

### 2.1 前端 `frontend/`

- Vue 3 + TypeScript + Vite
- Element Plus
- Vue Router
- **Pinia**（全局状态：机器人位姿、任务、连接状态）
- **ECharts**（耗时瀑布、趋势、台账统计；地图主视图不用 ECharts）
- 地图态势：优先 **Canvas / SVG 自研组件**（拖拽平移、滚轮缩放）；禁止首屏卡片堆砌
- HTTP：Axios；实时：**WebSocket**
- 包管理：npm（锁文件 `package-lock.json` 入库）

### 2.2 后端 `backend/`

- FastAPI + Uvicorn
- Pydantic v2
- **SQLAlchemy 2.x + SQLite**（开发默认；路径 `data/app.db`）
- 图像：Pillow + NumPy；推理：ONNX Runtime（正式阶段）
- 导出：openpyxl（xlsx）

### 2.3 机器人 / 边缘 `robot/`

- ROS2 Humble 节点与启动文件（可先 mock）
- 与后端通过 HTTP 上传帧 + WebSocket 推送位姿/路径

### 2.4 算法 `algorithms/`（可被 backend / 训练脚本引用）

- 光照特征、路由、预处理、密度计数
- 训练与导出脚本可放 `algorithms/training/`（后续）

---

## 3. Monorepo 目录结构约定

```text
/
├── AGENTS.md                 # 本契约（真源）
├── README.md
├── .cursor/rules/            # Cursor 规则指针（指向本文件）
├── frontend/                 # Vue3 监控终端
├── backend/                  # FastAPI 服务
├── robot/                    # ROS2 / 边缘采图（可先骨架）
├── algorithms/               # 算法可复用包
├── data/                     # 运行时数据（uploads / ledger / app.db / samples）
├── docs/                     # 设计说明（非契约；冲突时以 AGENTS.md 为准）
└── scripts/                  # 开发启动脚本
```

### 3.1 禁止

- 在 `frontend/` 内复制后端业务规则的第二套「真相」而不走 API
- 在仓库根目录散落临时业务脚本（放入 `scripts/` 或 `algorithms/`）
- 提交：`.venv/`、`node_modules/`、`frontend/dist/`、`*.onnx` 大权重、真实密钥

### 3.2 端口（本地开发冻结）

| 服务 | 端口 |
|---|---|
| 前端 Vite | `5178` |
| 后端 FastAPI | `18765` |
| Vite 代理 | `/api` → `http://127.0.0.1:18765`（含 `/api/v1/*`）；`/ws` → 同主机（含 `/ws/v1`） |

---

## 4. 接口契约总则

### 4.1 Base URL

- HTTP API 前缀：**`/api/v1`**（强制版本化；禁止新代码再写无版本 `/api/*` 业务路径）
- WebSocket 端点：**`/ws/v1`**（**单一端点**承载全部事件；禁止再拆 `/ws/v1/robot` 等子路径）
- OpenAPI 文档：`/docs`（仅开发环境默认开启）
- 书面规格同步：凡提到 REST 的文档 / 笔记 / `docs/api-spec.md`，路径一律写 `/api/v1/...`，与本契约一致

### 4.2 统一响应信封（HTTP JSON）

所有业务 JSON 接口（含错误）必须使用：

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `code` | `int` | `0` 成功；非 0 失败（见错误码表） |
| `message` | `string` | 人类可读；成功固定 `"ok"` 或简短说明 |
| `data` | `object \| array \| null` | 业务载荷；失败时可为 `null` 或错误细节对象 |

**禁止**：直接裸返回业务对象；禁止用 HTTP 200 + 无 `code` 字段表示业务失败。

文件下载（xlsx/csv/图片二进制）可不包信封，但必须：

- 正确 `Content-Type`
- `Content-Disposition`（导出类）
- 失败时仍返回 JSON 信封（非 2xx 或 200+非0 code，二选一；**本项目约定：业务可判失败用 200 + code≠0；参数/鉴权用 4xx + 信封**）

### 4.3 错误码（节选，可扩展但不可复用含义）

| code | 含义 |
|---|---|
| 0 | 成功 |
| 40001 | 参数错误 / 校验失败 |
| 40002 | 不支持的媒体类型或文件过大 |
| 40401 | 资源不存在 |
| 40901 | 状态冲突（如任务已结束） |
| 50001 | 内部错误 |
| 50002 | 推理失败 |
| 50301 | 依赖不可用（模型未加载 / 机器人离线） |

### 4.4 字段命名互操作

| 层 | 风格 |
|---|---|
| JSON / Python / DB 列 | `snake_case` |
| TypeScript 类型与 Pinia | 与 JSON **同名 snake_case**（禁止前端擅自 camelCase 改写契约字段） |
| 枚举字面量 | 小写蛇形或约定英文小写（见各枚举） |

### 4.5 时间与时区

- 存储与 API 传输：ISO 8601，**UTC**，后缀 `Z`
- UI 展示：转换为 `Asia/Shanghai`，并在文案或 tooltip 标明「北京时间」

### 4.6 图像约定

- 上传：`multipart/form-data`，字段名 `file`
- 大小上限：`12MB`
- 类型：`image/jpeg`、`image/png`、`image/webp`
- 接口返回预览图：`data:image/jpeg;base64,...` **或** 可鉴权的相对 URL；同一接口内字段必须统一一种（推荐 data URL 用于单帧结果；地图瓦片用 URL）
- **预处理与计数不得改变几何尺寸**（宽高像素不变）

---

## 5. REST 接口清单（v1）

> 路径均相对 `/api/v1`。未列出的路径视为未发布，前端不得调用。

### 5.1 系统

| 方法 | 路径 | 说明 | data |
|---|---|---|---|
| GET | `/health` | 健康检查 | `HealthInfo` |

### 5.2 推理

| 方法 | 路径 | 说明 | 请求 | data |
|---|---|---|---|---|
| POST | `/infer` | 单帧推理（路由+预处理+计数） | `multipart: file, station_id?, task_id?, save_record?=true` | `CountingResult` |

### 5.3 任务与台账

| 方法 | 路径 | 说明 | data |
|---|---|---|---|
| GET | `/tasks` | 任务列表 | `Task[]` |
| GET | `/tasks/{task_id}` | 任务详情 | `Task` |
| POST | `/tasks` | 创建任务 | `Task` |
| PATCH | `/tasks/{task_id}` | 更新任务状态 | `Task` |
| GET | `/records` | 巡检记录（台账） | `Page<Record>` 或 `Record[]`（见查询参数） |
| GET | `/records/{record_id}` | 单条记录 | `Record` |
| DELETE | `/records` | 清空台账（需 `confirm=true`） | `{ "cleared": true }` |
| GET | `/records/export` | 导出 | 文件流；查询 `fmt=xlsx\|csv` |

**列表查询公共参数**：`limit`（默认 100，最大 500）、`offset`（默认 0）、`station_id?`、`task_id?`

### 5.4 地图与工位

| 方法 | 路径 | 说明 | data |
|---|---|---|---|
| GET | `/map` | 当前车间地图元数据 | `MapInfo` |
| GET | `/stations` | 工位列表 | `Station[]` |
| GET | `/path/planned` | 当前规划路径 | `Path` |
| GET | `/path/traveled` | 已走过轨迹（可分页/时间窗） | `Path` |
| GET | `/robot/pose` | 最新位姿快照 | `RobotPose` |

### 5.5 系统配置

| 方法 | 路径 | 说明 | data |
|---|---|---|---|
| GET | `/config` | 读取系统配置 | `SystemConfig` |
| PUT | `/config` | 全量替换系统配置 | `SystemConfig` |

### 5.6 兼容说明（迁移期）

旧实现若仍暴露 `/api/health`、`/api/infer` 等无版本前缀路径，迁移完成前可双挂；**新代码只允许调用 `/api/v1/*`**。迁移完成后删除旧路径。

---

## 6. WebSocket 事件清单（v1）

### 6.0 端点（冻结）

- **唯一连接地址**：`ws://<host>:18765/ws/v1`
- 经 Vite 代理：`ws://<vite-host>:5178/ws/v1` → 后端同路径
- **禁止**再增加 `/ws/v1/robot`、`/ws/v1/map` 等第二端点；扩展靠 `event` 字段，不靠拆 URL
- 消息格式：**每条均为 JSON 对象**，必须含 `event`、`ts`、`data`：

```json
{
  "event": "robot.pose",
  "ts": "2026-11-20T08:00:00.000Z",
  "data": {}
}
```

### 6.1 服务端 → 客户端

| event | data 类型 | 说明 | 建议频率 |
|---|---|---|---|
| `robot.pose` | `RobotPose` | 实时位姿 | ≤ 10 Hz |
| `robot.status` | `RobotStatus` | 在线/模式/电量等 | 状态变化或 1 Hz |
| `path.planned` | `Path` | 规划路径更新 | 变化时 |
| `path.traveled` | `PathPoint` 或增量点数组 | 轨迹追加 | ≤ 5 Hz |
| `station.arrived` | `{ station_id, task_id? }` | 到达工位 | 事件 |
| `capture.ready` | `{ station_id, frame_id, image_url? }` | 定点采图完成可推理 | 事件 |
| `counting.finished` | `CountingResult` | 计数完成推送 | 事件 |
| `alert` | `Alert` | 告警 | 事件 |
| `pong` | `{}` | 心跳应答 | 响应 `ping` |
| `config.updated` | `SystemConfig` | 系统配置变更广播 | 事件 |

### 6.2 客户端 → 服务端

| event | data | 说明 |
|---|---|---|
| `subscribe` | `{ topics: string[] }` | 订阅主题（可选；默认全订）。`topics` 取值如 `robot.*`、`path.*`、`counting.*`、`alert` |
| `map.viewport` | `{ follow: boolean }` | 可选上报；用于服务端裁剪推送 |
| `ping` | `{}` | 心跳；服务端回 `event=pong` |

### 6.3 连接约束

- 断线重连：前端指数退避（1s → 2s → … → 30s）
- 心跳：25s 无消息可发 `ping`
- 后端单进程开发环境允许；多 worker 时需共享 pub/sub（后续再定，不得 silently 丢事件）

---

## 7. 核心数据对象

> TypeScript 与 Pydantic 模型字段必须与下表一致。`id` 均为 UUID 字符串，除非另行说明。

### 7.1 `HealthInfo`

```ts
{
  status: "ok" | "degraded" | "down"
  service: string
  version: string
  mode: "mock" | "onnx" | "ros_bridge"
  robot_online: boolean
}
```

### 7.2 `LightingFeatures`（5 维，全部 float，范围见注释）

```ts
{
  l_mean: number   // 全局平均亮度 [0,1]
  r_dark: number   // 暗部像素占比 [0,1]
  r_sat: number    // 高光饱和像素占比 [0,1]
  l_std: number    // 亮度标准差 [0, ~0.5+]
  a_glare: number  // 最大高光连通域面积比 [0,1]
}
```

### 7.3 光照类别与分支（**强制 4 类，含 mixed**）

```ts
type RouteClass = "normal" | "low" | "high" | "mixed"
type BranchName = "identity" | "zero_dce_pp" | "specular_clahe"
```

**硬性规定（创新点，盯紧）**：

1. `RouteClass` **必须保留 4 值**；`mixed` 是一等公民，**禁止**再并入 `normal`。
2. 路由器在「高对比 / 暗角+局部高光并存」时必须输出 `route_class: "mixed"`，不得为省事改成 `normal`。
3. 前端展示、台账、评测、消融实验均需能筛选/对比 `mixed`。
4. 现状代码若仍 3 类，属于迁移债（§14），清理时优先修复，不得继续扩散。

**路由映射（冻结）**：

| RouteClass | BranchName | 说明 |
|---|---|---|
| `normal` | `identity` | 直通 |
| `low` | `zero_dce_pp` | 暗光增强（Zero-DCE++） |
| `high` | `specular_clahe` | 高光抑制 + CLAHE |
| `mixed` | 默认 `identity`；消融可切「分块路由后融合」 | 混合光照标签保留；主路径默认直通，分块融合作消融实验 |

> 阈值标定依据：验证集上 `α·MAE + β·Latency` 网格搜索；阈值常量集中在后端配置 / `algorithms/lighting/router.py`，前端只读展示与（经 API 的）可调配置，不得各写一套阈值。

### 7.4 `TimingBreakdown`

```ts
{
  feature_ms: number
  route_ms: number
  preprocess_ms: number
  count_ms: number
  total_ms: number
}
```

单位：毫秒；保留 2 位小数。

### 7.5 `CountingResult`

```ts
{
  id: string
  task_id: string | null
  station_id: string
  created_at: string
  route_class: RouteClass
  branch: BranchName
  features: LightingFeatures
  count: number              // 回归浮点
  count_rounded: number      // int
  timing: TimingBreakdown
  original_image: string     // data URL 或 URL
  corrected_image: string
  density_overlay: string
  mock: boolean
  note: string
}
```

### 7.6 `Record`（台账行，持久化）

```ts
{
  id: string
  task_id: string | null
  station_id: string
  created_at: string
  route_class: RouteClass
  branch: BranchName
  count: number
  count_rounded: number
  total_ms: number
  filename: string
  frame_id: string | null
}
```

### 7.7 `Task`

```ts
{
  id: string
  name: string
  status: "pending" | "running" | "paused" | "completed" | "failed" | "cancelled"
  station_ids: string[]      // 有序巡航序列
  current_station_id: string | null
  created_at: string
  updated_at: string
  progress: number           // [0,1]
}
```

### 7.8 `Station`

```ts
{
  id: string                 // 如 "station-a"
  name: string               // 如 "工位-A"
  x: number                  // 地图坐标（米或像素，与 MapInfo.frame 一致）
  y: number
  yaw: number                // 采图朝向 rad
  order_index: number
}
```

### 7.9 `MapInfo`

```ts
{
  id: string
  name: string
  frame: "map" | "world"
  resolution: number         // 米/像素；若纯像素图可为 1
  width: number
  height: number
  origin_x: number
  origin_y: number
  image_url: string          // 平面图
}
```

### 7.10 `RobotPose`

```ts
{
  x: number
  y: number
  yaw: number                // rad，逆时针，与地图同一坐标系
  speed: number              // m/s
  stamp: string              // ISO UTC
  localized: boolean         // false=定位丢失
  station_id: string | null  // 若处于工位附近
}
```

### 7.11 `Path` / `PathPoint`

```ts
type PathPoint = { x: number; y: number; stamp?: string }

type Path = {
  id: string
  kind: "planned" | "traveled"
  points: PathPoint[]
  task_id: string | null
}
```

### 7.12 `RobotStatus`

```ts
{
  online: boolean
  mode: "idle" | "cruising" | "capturing" | "charging" | "error"
  battery: number | null     // [0,1] 或 null
  message: string
}
```

### 7.13 `Alert`

```ts
{
  id: string
  level: "info" | "warn" | "error"
  code: string
  message: string
  station_id: string | null
  created_at: string
}
```

### 7.14 `SystemConfig`（`/system` 设置读写）

```ts
{
  route_thresholds: {
    low_l_mean: number
    low_r_dark: number
    high_r_sat: number
    high_a_glare: number
    mixed_l_std: number
  }
  camera: {
    jpeg_quality: number       // 1–100
    capture_dwell_sec: number  // 工位停留
    prefer_width: number       // 采图像素宽，可与计数输入解耦
    prefer_height: number
  }
  counting_input: {
    width: 640                 // 宽 W
    height: 360                // 高 H
    layout: "NCHW"             // ONNX 张量为 1×3×360×640，禁止写成 1×3×640×360
  }
}
```

---

## 8. 算法硬约束

### 8.1 光照特征提取

- 必须输出 §7.2 五维特征，键名不可增减别名
- 默认阈值（可标定，更改须更新本节版本说明）：
  - 暗部：`V < 0.18`
  - 高光：`V > 0.88` 且 `S < 0.22`

### 8.2 三分支预处理

| 分支 | 实现要点 |
|---|---|
| `identity` | 原样拷贝 RGB |
| `zero_dce_pp` | Zero-DCE++（正式权重）；框架阶段允许曲线近似，但 `branch` 仍报此名 |
| `specular_clahe` | 高光掩膜软衰减 → L 通道 CLAHE（或等价） |

**统一约束**：

1. 输入输出均为 **RGB `uint8`**
2. **禁止改变宽高**
3. 禁止引入过度锐化导致伪影作为默认开启项
4. 前端不得私自再做一套与后端不一致的「正式」预处理；本地 demo 管线必须标记 `mock: true`

### 8.3 计数模型

- 结构：MobileCount 或同等轻量编解码
- **参数量 ≤ 1M**
- **固定输入尺寸**（全局只允许一种；变更须升契约版本）：
  - 图像几何（宽×高，W×H）：**`640 × 360`**
  - 张量布局：**NCHW** = **`[N, 3, 360, 640]`**（即 `1×3×H×W` = `1×3×360×640`）
  - **禁止**把宽高写反成 `1×3×640×360`；预处理 resize、导出 ONNX、Runtime 推理、密度图还原必须同一约定
  - 文档中凡写「640×360」均指 **宽×高**；凡写 ONNX shape 必须显式带 NCHW
- 损失：密度图 MSE + 可选计数一致性项
- 导出：**ONNX，opset ≥ 11**
- 边缘推理：ONNX Runtime；树莓派可启用 INT8（可选）

### 8.4 评测协议（实现与论文口径一致）

对比：无增强 / 固定 CLAHE / 固定 Zero-DCE++ / 动态路由（**含 mixed 子集消融**）  
指标：MAE、RMSE、路由准确率（**4 类**）、平均时延、P95 时延、参数量、FPS

---

## 9. 前端 UI / 交互约束

### 9.1 页面（4 页，精简冻结）

| 路由 | 名称 | 职责 |
|---|---|---|
| `/` 与 `/map` | 态势地图 | 实时定位、巡航路径、拖拽视角（**默认首页**） |
| `/monitor` | 实时计数 | 上传/样例、校正对比、密度、耗时、特征 |
| `/ledger` | 巡检台账 | 记录列表与导出 |
| `/system` | 系统概览与设置 | 模块状态 + **系统设置**（见下） |

**不设第 5 个独立「系统设置」路由。** 原「系统设置」需求并入 `/system`，页面内分两块：

1. **概览**：模块状态、版本、机器人在线、启动说明  
2. **设置**（可折叠面板或 Tab）：
   - 光照路由阈值（`RouteThresholds`：如 `low_l_mean`、`low_r_dark`、`high_r_sat`、`high_a_glare`、`mixed_l_std`）
   - 相机/采图参数（分辨率偏好、JPEG 质量、工位停留秒数等）
   - 读写经 HTTP：`GET/PUT /api/v1/config`（对象 `SystemConfig`）；变更后可 WS 广播 `config.updated`

> 毕设阶段设置项以「可演示、可复位默认」为够用标准；不必做成完整运维后台。

### 9.2 态势地图

- 必须支持：机器人位姿、规划路径、已走轨迹、工位航点
- 必须支持：拖拽平移、滚轮缩放、复位；「跟随机器人 / 自由视角」
- 首屏禁止堆叠统计卡片抢视觉焦点
- 视觉规范：工业冷色（品牌青 `#0F3D3E` / 强调 `#0D9488`）；禁止紫渐变、奶油衬线风、霓虹光效作为主风格

### 9.3 状态源

- 位姿与路径：**WebSocket 为主，HTTP 快照为辅**（首屏拉取 + WS 增量）
- Pinia stores 建议：`robot` / `task` / `session`；禁止组件内各拉各的重复真相

---

## 10. 命名、代码风格、提交规范

### 10.1 命名

- 文件：前端 `PascalCase.vue` 组件、`camelCase.ts` 工具；后端模块 `snake_case.py`
- API 路径：名词复数、小写、连字符仅用于可读性（本项目优先单段小写：`/records`）
- 布尔：`is_` / `has_` / `mock` / `localized` / `online`

### 10.2 代码风格

- TypeScript：`strict` 开启；禁止隐式 `any`
- Python：类型注解；公共 schema 用 Pydantic
- 前端样式：CSS 变量承接品牌色；组件 scoped
- 不引入第二套 UI 组件库（仅 Element Plus）

### 10.3 Git 提交

格式：

```text
<type>: <summary>
```

`type`：`feat` | `fix` | `docs` | `refactor` | `chore` | `test` | `perf`

- 涉及契约变更：`docs(contract): ...` 或 `feat(api): ...`，且 **同提交或先提交必须包含 AGENTS.md 变更**
- 禁止：`update`、`临时`、`fix something` 等无信息提交

### 10.4 分支

- 默认在当前工作分支开发；新建分支使用 `cursor/` 前缀（若环境要求后缀则遵云端规则）

---

## 11. 数据库约定（SQLite + SQLAlchemy）

- DB 文件：`data/app.db`（gitignore 可忽略本地 db；提供迁移或 `create_all` 启动初始化）
- 表名：复数 `snake_case`（`tasks`、`records`、`stations`）
- 主键：**UUID 字符串**（规范做法，便于分布式/答辩口径；不改为自增 int，除非契约升 MAJOR）
- 迁移策略：初期可用 SQLAlchemy `create_all`；引入 Alembic 后迁移文件入库

---

## 12. 安全与隐私

- 禁止提交真实密钥；密钥走环境变量 / Cursor Secrets
- 上传文件写入 `data/uploads/`，文件名消毒（只留 basename）
- CORS：开发可 `*`；发布环境应收紧
- 字体：优先自托管；避免默认强依赖 Google Fonts CDN（隐私审查）
- 不在前端打包服务端私钥或数据库路径探测接口

---

## 13. 变更管理流程（强制）

```text
1. 在 AGENTS.md 修改契约（字段/枚举/路径/错误码）
2. 将「契约版本」按 semver 递增：
   - MAJOR：破坏性变更（删字段、改语义、改路径）
   - MINOR：新增可选字段/新接口（向后兼容）
   - PATCH：措辞澄清、示例修正
3. 同步修改：
   - backend Pydantic schemas
   - frontend types + api client
   - 如有 OpenAPI 生成物一并更新
4. 补充/更新最小联调用例（至少 curl 或前端 mock）
5. 提交说明中写明契约版本号，例如：contract v1.1.0
```

**破坏性变更窗口**：必须在 `message` 或 `docs/changelog-contract.md` 记录迁移说明；双版本并存不得超过一个迭代。

---

## 14. 现状差异清单（迁移债，确认后按序清理）

> 不作为可继续扩散的借口。**`mixed` 四分类恢复为 P0。**

| 现状 | 契约要求 | 优先级 |
|---|---|---|
| 响应多为裸 Pydantic 模型 | `{code,message,data}` | P0 |
| 路径 `/api/*` 无版本 | `/api/v1/*` | P0 |
| 光照 3 类（mixed 并入 normal） | **4 类，必须产出 `mixed`** | **P0** |
| 无 WebSocket / 或构思为 `/ws/v1/robot` | **单一端点 `/ws/v1`** | P0 |
| 未用 Pinia / ECharts | 引入 Pinia + ECharts | P1 |
| 台账 JSON 文件 | SQLAlchemy + SQLite（UUID PK） | P1 |
| 无 `robot/` 目录 | 建立骨架 | P2 |
| 无态势地图页 / 设置页 | `/` 地图 + `/system` 含设置 | P1 |
| 文档仍写 `/api/infer` 等 | 统一 `/api/v1/...` | P0 |

清理顺序：契约确认 → **恢复 4 类 mixed** → 响应信封 + `/api/v1` + `/config` → 类型同步 → `/ws/v1` + 地图 → DB → `robot/`。

---

## 15. 版本记录

| 版本 | 日期 (Asia/Shanghai) | 说明 |
|---|---|---|
| v1.1.0 | 2026-11-20 | 自审修订：WS 统一 `/ws/v1`；钉死 4 类 `mixed`；NCHW=`1×3×360×640`；`/system` 含设置 + `SystemConfig`；UUID 保留 |
| v1.0.0 | 2026-11-20 | 首版整体约束：信封、REST/WS、对象、算法与变更流程 |

---

**结束语**：不确定时，打开本文件；本文件没有的接口，就当作不存在。
