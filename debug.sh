# CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -ldflags="-s -w" -o go-touch-mapper
# adb push ./go-touch-mapper /data/local/tmp
# adb push ./configs/EXAMPLE.JSON /data/local/tmp
# # adb shell /data/local/tmp/go-touch-mapper -d -r -c /data/local/tmp/EXAMPLE.JSON 
# adb shell /data/local/tmp/go-touch-mapper -d -r -v



# sudo ./go-touch-mapper -r --otg  -d -v --v-mouse-addr 192.168.3.161



CGO_ENABLED=1 GOOS=linux GOARCH=arm64 CC=aarch64-linux-gnu-gcc CXX=aarch64-linux-gnu-g++ go build -ldflags="-s -w -extldflags=-static  -X main.go_build_version=LXC.DEBUG" -o go-touch-mapper_arm64&& adb push ./go-touch-mapper_arm64 /data/local/tmp