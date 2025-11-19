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
	srcImg, err := png.Decode(bytes.NewReader(pngBytes))
	if err != nil {
		return nil, err
	}
	bg := image.NewRGBA(srcImg.Bounds())
	draw.Draw(bg, bg.Bounds(), &image.Uniform{color.White}, image.Point{}, draw.Src)
	draw.Draw(bg, bg.Bounds(), srcImg, srcImg.Bounds().Min, draw.Over)
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, bg, &jpeg.Options{Quality: quality}); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func screenHandler(w http.ResponseWriter, r *http.Request) {
	cmd := exec.Command("screencap", "-p")
	pngBytes, _ := cmd.Output()
	jpegData, _ := convertPNGtoJPEG(pngBytes, 80)
	w.Header().Set("Content-Type", "image/jpeg")
	if _, err := w.Write(jpegData); err != nil {
		http.Error(w, "Failed to write image", http.StatusInternalServerError)
	}
}

func serve(port int, mapperFilePath string, reloadConfigureFunc func(mapperFilePath string), pm *PluginManager) {
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
		if !json.Valid(body) {
			http.Error(w, "无效的JSON格式", http.StatusBadRequest)
			return
		}
		configMutex.Lock()
		defer configMutex.Unlock()

		var json_data map[string]interface{}
		if err := json.Unmarshal(body, &json_data); err != nil {
			w.Write([]byte("JSON无效"))
			logger.Info("JSON无效")
		} else {
			config_json := json_data["config"].(map[string]interface{})
			plugin_json := json_data["plugin"].(map[string]interface{})
			config_bytes, _ := json.Marshal(config_json)
			if err := os.WriteFile(mapperFilePath, config_bytes, 0644); err != nil {
				http.Error(w, "写入配置文件失败", http.StatusInternalServerError)
				logger.Errorf("写入配置文件失败: %v", err)
				return
			}
			reloadConfigureFunc(mapperFilePath)
			pm.update_user_config(plugin_json)
			w.Write([]byte("配置更新成功"))
			logger.Info("配置文件已更新并重新加载")
		}
	})

	http.HandleFunc("/plugin/configure/getTemplate", func(w http.ResponseWriter, r *http.Request) {
		configMutex.RLock()
		defer configMutex.RUnlock()
		var content []byte
		if pm != nil {
			content = []byte(pm.config_template)
		} else {
			content = []byte("{}")
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write(content)
	})
	http.HandleFunc("/plugin/configure/getConfig", func(w http.ResponseWriter, r *http.Request) {
		configMutex.RLock()
		defer configMutex.RUnlock()
		var content []byte
		if pm != nil {
			content, _ = json.Marshal(pm.user_config)
		} else {
			content = []byte("{}")
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write(content)
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
