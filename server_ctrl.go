package main

import (
	"embed"
	"io/fs"
	"net/http"
	"os/exec"
)

//go:embed go-touch-mapper-gh-pages/build
var staticFS embed.FS

func screenHandler(w http.ResponseWriter, r *http.Request) {
	cmd := exec.Command("screencap", "-p")
	cmd.Stdout = w
	if err := cmd.Run(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "image/png")
}

func serve() {
	webFS, err := fs.Sub(staticFS, "go-touch-mapper-gh-pages/build")
	if err != nil {
		logger.Errorf("无法加载静态文件: %v", err)
		return
	}
	http.Handle("/", http.FileServer(http.FS(webFS)))
	http.HandleFunc("/screen.png", screenHandler)
	logger.Info("listen :61070 ...")
	logger.Fatal(http.ListenAndServe(":61070", nil))
}
