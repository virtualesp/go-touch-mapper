# 重构计划

## 现状问题

| 文件 | 行数 | 问题 |
|------|------|------|
| `main.go` | 1077 | CLI + 设备检测 + 远程发送 + 模式选择 + 协程编排 + 信号处理全部混在一起 |
| `handler.go` | 1369 | 触控映射 + 视角移动 + 轮盘 + WASD + 手柄处理 + 配置热重载，god object |
| `defines.go` | 746 | 常量 + ioctl + keycode映射 + uinput结构体，职责不清 |
| `v_mouse.go` | 289 | 虚拟鼠标耦合全局状态 |
| 所有文件 | - | 平铺在 `package main`，无包结构 |
| 配置传递 | - | 全靠 `simplejson` 动态类型，无类型安全 |
| 输出后端 | - | 5 个 backend 无统一接口 |
| 全局状态 | - | `global_close_signal`, `global_screen_x` 等散落各处 |

## 目标架构

```
                         ┌─────────────────────────────────┐
                         │            Input Sources         │
                         │  (evdev / UDP / UDS / Remote)    │
                         └──────────┬──────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────┐
│                     Plugin Chain (可选)                       │
│  拦截特定事件 → 转换/生成新事件 → 返回给 Core                   │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                         Core (纯逻辑)                         │
│                                                              │
│  输入: KeyboardEvent / MouseEvent / JoystickEvent / TouchIn  │
│  状态: touch slots, view pos, wheel pos, map on/off          │
│  输出: TouchOutputEvent / VMouseKeyboardEvent                 │
│  控制: SetConfig / SwitchMap / ReloadConfig / ...             │
│                                                              │
│  不依赖任何 OS API，可独立编译到 Windows                        │
└──────────────────┬───────────────────┬───────────────────────┘
                   │                   │
                   ▼                   ▼
          TouchOutputEvent      VMouseKeyboardEvent
                   │                   │
    ┌──────────────┼──────────┐  ┌─────┴─────────┐
    │              │          │  │                │
    ▼              ▼          ▼  ▼                ▼
 uinput    inputmanager    ...  uinput          vPointer
```

## 包结构

```
go-touch-mapper/
├── cmd/go-touch-mapper/
│   └── main.go                    # 入口：CLI 解析 + 组装启动
│
├── core/                          # 平台无关的核心引擎
│   ├── core.go                    # Core struct + Run 主循环
│   ├── events.go                  # 输入/输出事件类型定义
│   ├── state.go                   # 内部状态管理
│   ├── control.go                 # 外部控制接口
│   ├── touch.go                   # 触控点分配/释放/移动
│   ├── touch_mixer.go             # 物理触摸 + 虚拟触摸混合
│   ├── view.go                    # 视角移动逻辑
│   ├── wheel.go                   # WASD 轮盘 + shift 轮盘
│   ├── keymap.go                  # 按键→触控映射
│   ├── joystick.go                # 手柄输入处理
│   └── command.go                 # 插件指令处理
│
├── input/                         # 输入源（平台相关）
│   ├── evdev/
│   │   ├── detect.go              # /dev/input 设备检测
│   │   ├── reader.go              # 事件读取 goroutine
│   │   └── remote.go              # UDP/UDS 远程事件注入
│   └── source.go                  # InputSource interface
│
├── output/                        # 输出端（平台相关）
│   ├── touch/
│   │   ├── backend.go             # TouchBackend interface
│   │   ├── uinput.go              # uinput 虚拟触屏
│   │   ├── inputmanager.go        # Android InputManager
│   │   ├── hid.go                 # 串口 HID (ESP32-S3)
│   │   ├── otg.go                 # OTG USB gadget
│   │   └── direct.go              # 直接写入真实设备
│   ├── vmouse/
│   │   ├── backend.go             # VMouseBackend interface
│   │   └── vpointer.go            # vPointer UDP 协议
│   └── uinput/
│       └── keyboard_mouse.go      # uinput 虚拟键鼠
│
├── config/                        # 配置管理
│   ├── config.go                  # 强类型 Config 结构体
│   ├── joystick.go                # 手柄配置加载
│   └── loader.go                  # JSON 加载 + 热重载
│
├── plugin/                        # 插件系统
│   ├── host/
│   │   ├── loader.go              # 加载 plugin.bin / plugin/*.so
│   │   ├── chain.go               # 插件链编排
│   │   └── process.go             # 进程间通信（UDS）
│   └── sdk/
│       ├── types.go               # 事件类型定义
│       └── plugin.go              # 插件基类
│
├── server/                        # HTTP 控制台
│   └── server.go                  # REST API + Web UI
│
├── ipc/                           # 可复用 IPC 原语
│   ├── udp.go                     # UDP reader/writer
│   └── uds.go                     # UDS reader/writer
│
├── configs/                       # 嵌入的配置模板
├── joystickInfos/                 # 手柄配置（运行时读取）
├── go-touch-mapper-gh-pages/      # Web UI（保持不变）
├── plugin/                        # 插件二进制（保持不变）
├── hid_touch/                     # ESP32 固件（保持不变）
└── remote_control/                # Python 发送端（保持不变）
```

## 核心模块设计

### 事件类型 (`core/events.go`)

平台无关的事件定义，所有输入/输出都用这些类型：

```go
package core

// ========== 输入事件 ==========

type InputEvent struct {
    Type     EventType
    Keyboard *KeyboardEvent
    Mouse    *MouseEvent
    Joystick *JoystickEvent
    Touch    *TouchInputEvent
    Cmd      *CommandEvent
}

type EventType int
const (
    EventKeyboard EventType = iota
    EventMouse
    EventJoystick
    EventTouch
    EventCmd
)

type KeyboardEvent struct {
    Code    uint16
    Value   int32 // 1=down, 0=up
    DevName string
}

type MouseEvent struct {
    RelX, RelY int32
    Wheel      int32
    Buttons    [3]bool
    DevName    string
}

type JoystickEvent struct {
    Axis     string  // LS_X, RS_X, HAT0X, BTN_A, etc.
    Value    float64 // 归一化 -1.0 ~ 1.0
    IsButton bool
    DevName  string
}

type TouchInputEvent struct {
    Slot    int32
    ID      int32 // tracking id, -1 = lift
    X, Y    int32 // 屏幕坐标
    DevName string
}

type CommandEvent struct {
    TouchDown *struct{ ID int32; X, Y int32 }
    TouchMove *struct{ ID int32; X, Y int32 }
    TouchUp   *struct{ ID int32 }
}

// ========== 输出事件 ==========

type TouchOutputEvent struct {
    Action TouchAction
    ID     int32
    X, Y   int32
}

type TouchAction int8
const (
    TouchDown  TouchAction = 0
    TouchUp    TouchAction = 1
    TouchMove  TouchAction = 2
)

type VMouseKeyboardEvent struct {
    MouseMove   *struct{ DX, DY int32 }
    MouseButton *struct{ Button int; Down bool }
    KeyPress    *struct{ Code uint16; Down bool }
}
```

### Core 引擎 (`core/core.go`)

```go
package core

type Core struct {
    config    *Config
    state     *State
    touchOut  chan<- TouchOutputEvent
    vmouseOut chan<- VMouseKeyboardEvent
}

func New(cfg *Config, touchOut chan<- TouchOutputEvent, vmouseOut chan<- VMouseKeyboardEvent) *Core {
    return &Core{
        config:    cfg,
        state:     NewState(cfg),
        touchOut:  touchOut,
        vmouseOut: vmouseOut,
    }
}

func (c *Core) Run(ctx context.Context, inputCh <-chan InputEvent) {
    for {
        select {
        case <-ctx.Done():
            return
        case evt := <-inputCh:
            c.handleEvent(evt)
        }
    }
}

func (c *Core) handleEvent(evt InputEvent) {
    switch evt.Type {
    case EventKeyboard:
        c.handleKeyboard(evt.Keyboard)
    case EventMouse:
        c.handleMouse(evt.Mouse)
    case EventJoystick:
        c.handleJoystick(evt.Joystick)
    case EventTouch:
        c.mixer.OnPhysicalTouch(evt.Touch)
    case EventCmd:
        c.handleCommand(evt.Cmd)
    }
}
```

### 输出后端接口 (`output/touch/backend.go`)

```go
package touch

type Backend interface {
    Init() error
    SendTouch(action int8, id, x, y int32) error
    Close() error
}
```

### 输入源接口 (`input/source.go`)

```go
package input

type Source interface {
    Run(ctx context.Context, out chan<- core.InputEvent)
}
```

## 插件系统设计

### 插件接口 (`plugin/sdk/plugin.go`)

```go
package sdk

type Plugin interface {
    Init(config PluginConfig) error
    HandleEvent(evt core.InputEvent) []core.InputEvent
    UpdateConfig(config PluginConfig) error
    Close() error
}

type PluginConfig struct {
    ID       string
    Template json.RawMessage
    User     json.RawMessage
}
```

### 插件行为模式

```go
// 1. 透传
func (p *Plugin) HandleEvent(evt InputEvent) []InputEvent {
    return []InputEvent{evt}
}

// 2. 拦截（消费事件，不传给 core）
func (p *Plugin) HandleEvent(evt InputEvent) []InputEvent {
    if shouldIntercept(evt) {
        return nil
    }
    return []InputEvent{evt}
}

// 3. 转换（修改事件后传给 core）
func (p *Plugin) HandleEvent(evt InputEvent) []InputEvent {
    if evt.Type == EventJoystick {
        evt.Joystick.Value *= 0.8 // 降低灵敏度
    }
    return []InputEvent{evt}
}

// 4. 注入（生成新事件给 core）
func (p *Plugin) HandleEvent(evt InputEvent) []InputEvent {
    if isWASD(evt) {
        return []InputEvent{{Type: EventCmd, Cmd: &CommandEvent{...}}}
    }
    return []InputEvent{evt}
}
```

### 插件链 (`plugin/host/chain.go`)

```go
type Chain struct {
    plugins []sdk.Plugin
}

func (c *Chain) Process(evt core.InputEvent) []core.InputEvent {
    events := []core.InputEvent{evt}
    for _, plugin := range c.plugins {
        var next []core.InputEvent
        for _, e := range events {
            next = append(next, plugin.HandleEvent(e)...)
        }
        events = next
        if len(events) == 0 {
            return nil // 被拦截
        }
    }
    return events
}
```

### 插件加载

```go
// host/loader.go
func LoadPlugins(dir string) (*Chain, error) {
    chain := &Chain{}
    // 查找 plugin.bin 或 plugins/*.so
    // 加载配置，初始化插件
    return chain, nil
}
```

## 迁移步骤

### 阶段 1：创建 `core/events.go`（新文件）

提取共享类型定义，零风险。

**涉及**：
- 新建 `core/events.go`
- 从 `main.go` 提取 `event_pack`, `touch_control_pack`, `dev_type`
- 从 `handler.go` 提取 `TouchAction` 常量

### 阶段 2：创建 `ipc/`（移动文件）

提取 UDP/UDS 原语，零风险。

**涉及**：
- 新建 `ipc/udp.go`, `ipc/uds.go`
- 移动 `ipc.go` 内容
- 更新 import

### 阶段 3：创建 `config/`（新文件）

定义强类型配置，中等风险。

**涉及**：
- 新建 `config/config.go` — `Config` struct
- 新建 `config/joystick.go` — 手柄配置加载
- 新建 `config/loader.go` — JSON 加载
- 替换 `simplejson` 为强类型访问

### 阶段 4：创建 `output/touch/`（重构）

统一 5 个 backend 接口，中等风险。

**涉及**：
- 新建 `output/touch/backend.go` — `Backend` interface
- 移动 `u_input_interface.go` → `output/touch/uinput.go`
- 移动 `input_manager_interface.go` → `output/touch/inputmanager.go`
- 移动 `tty_hid_manager.go` → `output/touch/hid.go`
- 移动 `otg_hid_manager.go` → `output/touch/otg.go`
- 移动 `direct_input_interface.go` → `output/touch/direct.go`
- 新建 `output/uinput/keyboard_mouse.go` — 虚拟键鼠输出
- 新建 `output/vmouse/` — 虚拟鼠标

### 阶段 5：拆分 `core/`（高风险）

将 `handler.go` 拆分为多个文件。

**涉及**：
- 新建 `core/core.go` — 精简后的 Core struct
- 新建 `core/state.go` — 内部状态
- 新建 `core/touch.go` — 触控点管理（`touch_require`, `touch_release`, `touch_move`）
- 新建 `core/touch_mixer.go` — 触摸混合
- 新建 `core/view.go` — 视角移动（`handel_view_move`, `auto_handel_view_release`）
- 新建 `core/wheel.go` — 轮盘逻辑（`handel_wheel_action`, `loop_handel_wasd_wheel`）
- 新建 `core/keymap.go` — 按键映射（`execute_key_action`, `handel_key_up_down`）
- 新建 `core/joystick.go` — 手柄处理（`loop_handel_rs_move`）
- 新建 `core/command.go` — CommandEvent 处理

### 阶段 6：创建 `input/`（中等风险）

提取设备检测和读取。

**涉及**：
- 新建 `input/evdev/detect.go` — 设备检测（`check_dev_type`, `get_possible_device_indexes`）
- 新建 `input/evdev/reader.go` — 事件读取（`dev_reader`, `touch_dev_reader`）
- 新建 `input/evdev/remote.go` — 远程事件注入（`udp_event_injector`, `uds_event_injector`）
- 新建 `input/source.go` — `Source` interface

### 阶段 7：创建 `plugin/`, `server/`（低风险）

**涉及**：
- 新建 `plugin/host/` — 插件加载和管理
- 新建 `plugin/sdk/` — 插件开发 SDK
- 新建 `server/server.go` — HTTP 控制台
- 移动 `server_ctrl.go` → `server/server.go`
- 移动 `load_plugin.go` → `plugin/host/`

### 阶段 8：精简 `main.go`（低风险）

将 `main.go` 精简为纯入口。

**涉及**：
- 移除所有业务逻辑
- 仅保留：CLI 解析 → 创建各组件 → 启动
- 预期从 1077 行减少到 ~150 行

## 关键设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| core 是否依赖 Linux API | 不依赖 | 可在 Windows 上独立编译运行 |
| 配置传递方式 | 强类型 Config struct | 类型安全，IDE 支持 |
| 插件通信方式 | 进程隔离 + UDS | 安全性，崩溃不影响主进程 |
| 插件输出 | 仅返回 []InputEvent | 简化接口，core 统一处理所有输出 |
| CommandEvent | 核心引擎直接处理 | 插件通过指令控制触控输出 |
| 触摸混合 | 在 core 内部处理 | 物理触摸和虚拟触摸合并后统一输出 |

## 依赖约束

### core 包（零外部依赖）

```go
// core/ 只依赖标准库
import (
    "context"
    "encoding/json"
    "math"
    "sync"
)
// 不依赖: syscall, evdev, serial, unix 等
```

### input/ 包（Linux 相关）

```go
import (
    "github.com/kenshaw/evdev"
    "golang.org/x/sys/unix"
)
```

### output/ 包（平台相关）

```go
import (
    "go.bug.st/serial"  // HID
    "golang.org/x/sys/unix"  // uinput
)
```

## 验证清单

- [ ] 所有包能独立编译
- [ ] core 包可在 Linux 和 Windows 上编译
- [ ] 现有功能全部保留
- [ ] 配置文件格式向后兼容
- [ ] 插件接口稳定
- [ ] 单元测试覆盖核心逻辑
