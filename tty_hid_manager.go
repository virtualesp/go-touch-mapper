package main

import (
	"encoding/binary"
	"fmt"

	"go.bug.st/serial"
)

func PackHIDFrame(payload []byte) ([]byte, error) {
	pLen := len(payload)
	if pLen > 64 { // 对应 ESP32 端的 MAX_PAYLOAD_LEN
		return nil, fmt.Errorf("payload too large: %d", pLen)
	}
	// 长度计算：2(头) + 1(长度位) + pLen(载荷) + 1(校验位)
	frame := make([]byte, 2+1+pLen+1)

	frame[0] = 0x55
	frame[1] = 0xAA
	frame[2] = byte(pLen)

	// 初始化校验和为长度位的值
	checksum := byte(pLen)

	// 复制载荷并计算校验和
	for i := 0; i < pLen; i++ {
		frame[3+i] = payload[i]
		checksum ^= payload[i]
	}

	// 放入校验位
	frame[3+pLen] = checksum

	return frame, nil
}

func handel_touch_using_hid_manager(port serial.Port) touch_control_func {
	var buf [16]byte
	buf[0] = 0x55
	buf[1] = 0xaa
	buf[2] = 0x0c
	buf[3] = 0x00
	setReport := func(action uint8, id uint8, x, y uint32) {
		buf[4] = action
		buf[5] = id
		binary.LittleEndian.PutUint32(buf[6:10], x)
		binary.LittleEndian.PutUint32(buf[10:14], y)
		buf[14] = 0
		buf[15] = buf[2] ^ buf[3] ^ buf[4] ^ buf[5] ^ buf[6] ^ buf[7] ^ buf[8] ^ buf[9] ^ buf[10] ^ buf[11] ^ buf[12] ^ buf[13] ^ buf[14]
		// logger.Errorf("buf: %x", buf)
	}

	return func(control_data touch_control_pack) {
		switch control_data.action {
		case TouchActionRequire, TouchActionMove:
			x, y := rotateAbsoluteXY(control_data.x, control_data.y)
			setReport(0x01, uint8(control_data.id), uint32(x), uint32(y))
			port.Write(buf[:])
		case TouchActionRelease:
			setReport(0x00, uint8(control_data.id), 0, 0)
			port.Write(buf[:])
		case TouchActionResetResolution:
			setReport(0x03, uint8(control_data.id), uint32(control_data.x), uint32(control_data.y))
			port.Write(buf[:])
		}
	}
}
