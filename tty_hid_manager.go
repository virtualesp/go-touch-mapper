package main

import (
	"encoding/binary"

	"go.bug.st/serial"
)

func rot_xy(pack touch_control_pack) (int32, int32) { //根据方向旋转坐标
	switch global_device_orientation {
	case 0:
		return pack.x, pack.y
	case 1:
		return pack.screen_y - pack.y, pack.x
	case 2:
		return pack.screen_x - pack.x, pack.screen_y - pack.y
	case 3:
		return pack.y, pack.screen_x - pack.x
	default:
		return pack.x, pack.y
	}
}

func handel_touch_using_hid_manager(port serial.Port, screenX, screenY uint32, rotation int) touch_control_func {

	var buf [12]byte
	buf[0] = 0xF4
	setReport := func(upDown bool, id uint8, x, y uint32, activeFingers uint8) {
		if upDown {
			buf[1] = 1
		} else {
			buf[1] = 0
		}
		buf[2] = id
		binary.LittleEndian.PutUint32(buf[3:7], x)
		binary.LittleEndian.PutUint32(buf[7:11], y)
		buf[11] = 1
	}

	rot_xy := func(pack touch_control_pack) (int32, int32) { //根据方向旋转坐标
		switch rotation {
		case 0:
			return pack.x, pack.y
		case 1:
			return pack.screen_y - pack.y, pack.x
		case 2:
			return pack.screen_x - pack.x, pack.screen_y - pack.y
		case 3:
			return pack.y, pack.screen_x - pack.x
		default:
			return pack.x, pack.y
		}
	}

	return func(control_data touch_control_pack) {
		switch control_data.action {
		// case TouchActionRequire or TouchActionMove:
		case TouchActionRequire, TouchActionMove:
			x, y := rot_xy(control_data)
			setReport(true, uint8(control_data.id), uint32(x), uint32(y), 0)
			port.Write(buf[:])
		case TouchActionRelease:
			setReport(false, uint8(control_data.id), 0, 0, 0)
			port.Write(buf[:])
		}
	}
}
