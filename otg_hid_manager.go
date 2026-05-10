package main

import (
	"encoding/binary"
	"os"

	"github.com/RiderLty/linux-cu/pkg/emulate"
)

func handel_touch_using_otg_manager() touch_control_func {
	yamlData := []byte(`device:
    bcdUSB: "0x0200"
    bDeviceClass: 0
    bDeviceSubClass: 0
    bDeviceProtocol: 0
    bMaxPacketSize0: 64
    idVendor: "0x054D"
    idProduct: "0x0ce7"
    bcdDevice: "0x0101"
    manufacturer: Sony Interactive Entertainment
    product: Touch Screen Controller
configs:
    - bConfigurationValue: 1
      MaxPower: 50
      selfPowered: false
      remoteWakeup: true
      bNumInterfaces: 1
      interfaces:
        - bInterfaceNumber: 0
          bAlternateSetting: 0
          bInterfaceClass: 3
          bInterfaceSubClass: 0
          bInterfaceProtocol: 0
          interfaceString: Touch Screen
          endpoints:
            - bEndpointAddress: 132
              bmAttributes: 3
              wMaxPacketSize: 64
              bInterval: 1
          reportDescriptor: 050d0904a1010922a10209421500250175019501810295078103095175089501810205010930150027feffff7f7520950181020931150027feffff7f752095018102c0050d09542502750895018102c0
`)
	g, err := emulate.Start(yamlData)
	if err != nil {
		logger.Errorf("无法创建 USB HID Gadget: %s", err.Error())
		os.Exit(4)
	}

	go func() {
		<-global_close_signal
		g.Close()
	}()

	// Report layout (matching esp32.yaml descriptor):
	// [0]    Tip Switch (1bit) + padding (7bit) = 1 byte
	// [1]    Contact ID = 1 byte
	// [2:6]  X = 4 bytes (LE)
	// [6:10] Y = 4 bytes (LE)
	// [10]   Contact Count = 1 byte
	var buf [11]byte

	setReport := func(action uint8, id uint8, x, y uint32) {
		buf[0] = action
		buf[1] = id
		binary.LittleEndian.PutUint32(buf[2:6], x)
		binary.LittleEndian.PutUint32(buf[6:10], y)
		buf[10] = 1 // contact count
	}

	return func(control_data touch_control_pack) {
		switch control_data.action {
		case TouchActionRequire, TouchActionMove:
			x, y := rotateAbsoluteXY(control_data.x, control_data.y)
			setReport(0x01, uint8(control_data.id), uint32(x), uint32(y))
			g.Write(buf[:])
		case TouchActionRelease:
			setReport(0x00, uint8(control_data.id), 0, 0)
			g.Write(buf[:])
		}
	}
}
