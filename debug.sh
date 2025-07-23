CGO_ENABLE=0 GOOS=linux GOARCH=arm64 go build -ldflags="-s -w" -o go-touch-mapper_arm64
adb push ./go-touch-mapper_arm64 /data/local/tmp
adb push ./configs/EXAMPLE.JSON /data/local/tmp
adb shell /data/local/tmp/go-touch-mapper_arm64 -d -r -c /data/local/tmp/EXAMPLE.JSON 
