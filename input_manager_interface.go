package main

import (
	"bufio"
	"encoding/binary"
	"net"
	"os"
	"time"
)

func startInputManager(){
	time.sleep(time.Second * 1)
	cmd := exec.Command("sh -c \"CLASSPATH=/data/local/tmp/app-debug.apk app_process ./ com.genymobile.scrcpy.Server 0\"")
	err := cmd.Run()
	if err != nil {
		fmt.Printf("无法启动InputManager：%s\n", err)
		os.Exit(1)
	}
}

func stopInputManager(){
	cmd := exec.Command("sh -c \"pkill -f com.genymobile.scrcpy.Server\"")
	err := cmd.Run()
}



func handel_touch_using_input_manager() touch_control_func {
	unixAddr, err := net.ResolveUnixAddr("unix", "@uds_input_manager")
	if err != nil {
		logger.Errorf("创建Unix Domain Socket失败 : %s", err.Error())
		os.Exit(3)
	}
	unixListener, _ := net.ListenUnix("unix", unixAddr)

	logger.Info("waiting for input manager to connect")
	go startInputManager()
	unixConn, _ := unixListener.AcceptUnix()

	logger.Info("input manager connected")
	writer := bufio.NewWriter(unixConn)

	go func() {
		<-global_close_signal
		stopInputManager()
		unixConn.Close()
		unixListener.Close()
	}()

	return func(control_data touch_control_pack) {
		action := byte(control_data.action)
		id := byte(control_data.id & 0xff)
		x := make([]byte, 4)
		y := make([]byte, 4)
		binary.LittleEndian.PutUint32(x, uint32(control_data.x>>touch_pos_scale)) //缩放 但是不会累计误差
		binary.LittleEndian.PutUint32(y, uint32(control_data.y>>touch_pos_scale))
		writer.Write([]byte{action, id, x[0], x[1], x[2], x[3], y[0], y[1], y[2], y[3]})
		writer.Flush()
	}
}
