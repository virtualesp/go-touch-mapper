package main

import (
	"bytes"
	"embed"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/jpeg"
	"image/png"
	"io"
	"io/fs"
	"net"
	"net/http"
	"os"
	"os/exec"
	"sync"
)

//go:embed go-touch-mapper-gh-pages/build
var staticFS embed.FS

func convertPNGtoJPEG(pngBytes []byte, quality int) ([]byte, error) {
	// 解码 PNG
	srcImg, err := png.Decode(bytes.NewReader(pngBytes))
	if err != nil {
		return nil, err
	}

	// 创建白色背景画布
	bg := image.NewRGBA(srcImg.Bounds())
	draw.Draw(bg, bg.Bounds(), &image.Uniform{color.White}, image.Point{}, draw.Src)

	// 将原图绘制到白色背景上
	draw.Draw(bg, bg.Bounds(), srcImg, srcImg.Bounds().Min, draw.Over)

	// 编码为 JPEG
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, bg, &jpeg.Options{Quality: quality}); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

func screenHandler(w http.ResponseWriter, r *http.Request) {
	// cmd := exec.Command("screencap", "-p")
	// cmd.Stdout = w
	// if err := cmd.Run(); err != nil {
	// 	http.Error(w, err.Error(), http.StatusInternalServerError)
	// 	return
	// }
	// w.Header().Set("Content-Type", "image/png")
	// start := time.Now()
	cmd := exec.Command("screencap", "-p")
	pngBytes, _ := cmd.Output()
	// end := time.Since(start)
	// logger.Infof("cmd use %v", end)
	// start = time.Now()
	jpegData, _ := convertPNGtoJPEG(pngBytes, 80)
	w.Header().Set("Content-Type", "image/jpeg")
	if _, err := w.Write(jpegData); err != nil {
		http.Error(w, "Failed to write image", http.StatusInternalServerError)
	}
	// end = time.Since(start)
	// logger.Infof("send use %v", end)
}

func serve(port int, mapperFilePath string, reloadConfigureFunc func(mapperFilePath string)) {
	var configMutex sync.RWMutex
	webFS, err := fs.Sub(staticFS, "go-touch-mapper-gh-pages/build")
	if err != nil {
		logger.Errorf("无法加载静态文件: %v", err)
		return
	}
	http.Handle("/", http.FileServer(http.FS(webFS)))
	http.HandleFunc("/screen.png", screenHandler)

	http.HandleFunc("/configure/get", func(w http.ResponseWriter, r *http.Request) {
		configMutex.RLock()
		defer configMutex.RUnlock()

		content, err := os.ReadFile(mapperFilePath)
		if err != nil {
			http.Error(w, "无法读取配置文件", http.StatusInternalServerError)
			logger.Errorf("读取配置文件失败: %v", err)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.Write(content)
	})
	http.HandleFunc("/configure/set", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			http.Error(w, "仅支持POST请求", http.StatusMethodNotAllowed)
			return
		}

		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "读取请求体失败", http.StatusBadRequest)
			return
		}

		// 验证是否为有效JSON
		if !json.Valid(body) {
			http.Error(w, "无效的JSON格式", http.StatusBadRequest)
			return
		}

		configMutex.Lock()
		defer configMutex.Unlock()

		// 备份原配置文件
		backupPath := mapperFilePath + ".bak"
		if err := os.Rename(mapperFilePath, backupPath); err != nil {
			http.Error(w, "创建备份失败", http.StatusInternalServerError)
			logger.Errorf("配置文件备份失败: %v", err)
			return
		}

		// 写入新配置
		if err := os.WriteFile(mapperFilePath, body, 0644); err != nil {
			// 恢复备份
			os.Rename(backupPath, mapperFilePath)
			http.Error(w, "写入配置文件失败", http.StatusInternalServerError)
			logger.Errorf("写入配置文件失败: %v", err)
			return
		}

		// 删除备份
		os.Remove(backupPath)

		// 重新加载配置
		reloadConfigureFunc(mapperFilePath)

		w.Write([]byte("配置更新成功"))
		logger.Info("配置文件已更新并重新加载")
	})

	interfaces, err := net.Interfaces()
	if err != nil {
		panic(err)
	}
	logger.Info("可从以下网址访问控制后台:")
	for _, iface := range interfaces {
		if iface.Flags&net.FlagUp == 0 {
			continue
		}
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}
		for _, addr := range addrs {
			ipNet, ok := addr.(*net.IPNet)
			if !ok {
				continue
			}
			ipv4 := ipNet.IP.To4()
			if ipv4 == nil {
				continue // 跳过非 IPv4 地址
			}
			if !ipv4.IsLoopback() {
				logger.Infof("http://%s:%v", ipv4, port+1)
			}
		}
	}
	logger.Fatal(http.ListenAndServe(fmt.Sprintf(":%v", port+1), nil))
}
