# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

go-touch-mapper maps physical input devices (keyboard, mouse, gamepad, touchscreen) to virtual Android touchscreen events. Primary use case: playing mobile games with PC controllers. Written in Go 1.18 with an embedded React web config UI and supporting Arduino/Python components.

Requires root or adb shell access (reads `/dev/input/*`, creates uinput devices).

## Build Commands

```bash
# Go binary (simple, no CGO — for Linux targets)
CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w"

# Cross-compile for Android arm64 (needs NDK)
CGO_ENABLED=1 GOOS=android GOARCH=arm64 \
  CC=<ndk>/aarch64-linux-android24-clang \
  go build -ldflags="-s -w -X main.go_build_version=<VERSION>"

# Web UI (must build before Go — embedded via go:embed)
cd go-touch-mapper-gh-pages && yarn install && yarn build

# Plugin (separate Go module)
cd plugin && CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -tags plugin -o plugin.bin
```

## Running

```bash
./go-touch-mapper -c config.json                        # With config
./go-touch-mapper -m hid --tty-path /dev/ttyACM0       # HID serial (ESP32-S3)
./go-touch-mapper -m inputmanager                       # Android InputManager mode
./go-touch-mapper -m otg --rotation 1                   # OTG USB gadget mode
./go-touch-mapper -m direct                             # Direct touchscreen write
./go-touch-mapper -r -p 61069                           # Remote control receiver
./go-touch-mapper -s 192.168.1.64                       # Remote control sender
./go-touch-mapper --create-js-info                      # Interactive gamepad config generator
```

## Architecture

### Core Data Flow

```
Input Devices                    Processing                     Output
─────────────                    ──────────                     ──────
/dev/input/event*  ─┐
  (keyboard/mouse/  │
   gamepad/touch)   │
                    ├─→ event_pack channel ─→ TouchHandler ─→ touch_control_func
UDP remote events  ─┤                         (handler.go)     │
UDS remote events  ─┘                                          ├─→ uinput virtual touchscreen
                                                               ├─→ Android InputManager (UDS)
                                                               ├─→ Serial HID (ESP32-S3)
                                                               ├─→ OTG HID (/dev/hidg0)
                                                               └─→ Direct device write
```

### Key Files

- **`main.go`** — Entry point: CLI parsing, device detection, mode selection (mapper / remote sender / joystick config creator)
- **`handler.go`** — TouchHandler: the core mapping engine (1369 lines). Manages touch point slots, keyboard→touch mappings (WASD→virtual joystick wheel, keys→screen positions), gamepad→touch (sticks→view movement, buttons→touch), touch mixing (merges physical + virtual touch), and config hot-reload
- **`defines.go`** — Linux input event constants, ioctl helpers, keycode maps
- **`u_input_interface.go`** — Virtual touchscreen via Linux uinput (`/dev/uinput`), the recommended output mode
- **`input_manager_interface.go`** — Android InputManager via scrcpy's `app_process` + UDS
- **`tty_hid_manager.go`** — Serial HID touch output to ESP32-S3 microcontroller
- **`otg_hid_manager.go`** — OTG USB gadget HID output (`/dev/hidg0`)
- **`direct_input_interface.go`** — Direct write to real touchscreen device file
- **`v_mouse.go`** — Virtual mouse controller: mouse→touch cursor translation, communicates with vPointer Android app via UDP
- **`server_ctrl.go`** — Embedded HTTP server: serves React config UI (go:embed), REST API (`GET /configure/get`, `POST /configure/set`), `GET /screen.png` (screencap), plugin config endpoints
- **`load_plugin.go`** — Plugin system: launches `plugin.bin` subprocess, UDS IPC (`@uds_go_touch_mapper_plugin`), protocol commands `0xF1`/`0xF2`/`0xF3`
- **`ipc.go`** — UDP and Unix Domain Socket I/O primitives

### Plugin System

Plugins are separate Go binaries (`plugin/go.mod`) communicating via UDS. Protocol: plugin sends ID + config template on connect; main sends user config. The default plugin (`custom_plugin.go`) generates curved swipe movement with Bézier curves. Compile with `-tags plugin`.

### Configuration

JSON config files define SCREEN.SIZE, MOUSE (view control), WHEEL (virtual joystick), KEY_MAPS (key→touch position as fractional coordinates), and JOYSTICK_MAPS (gamepad→touch). The embedded React web UI (`go-touch-mapper-gh-pages/`) provides visual drag-and-drop editing with a screenshot background.

Pre-configured gamepad mappings in `joystickInfos/` for Xbox, PS5 DualSense, Switch Pro, and BETOP controllers.

### Embedded Web UI

The React app in `go-touch-mapper-gh-pages/` (React 17 + MUI 5) is built separately and its `build/` output is embedded into the Go binary via `go:embed`. The main component is `ConfigManager.js` (~67KB) which is the visual config editor.

### CI/CD

GitHub Actions (`go-build-release.yml`) triggers on `v*` tags: builds the React UI, cross-compiles Go for amd64 + arm64, creates a GitHub release.
