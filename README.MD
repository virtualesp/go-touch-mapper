# 安卓触屏映射工具

读取手柄，键盘，鼠标，触摸屏等输入并转换为虚拟触屏设备输出

## Quick start

从release直接下载编译好的二进制程序

一般手机平板下载 [go-touch-mapper_arm64](https://github.com/RiderLty/go-touch-mapper/releases/latest/download/go-touch-mapper_arm64)

androidX86下载 [go-touch-mapper_amd64](https://github.com/RiderLty/go-touch-mapper/releases/latest/download/go-touch-mapper_amd64)

读取dev和创建uinput需要shell或者root权限

所以可以用adb shell或者su shell运行

```
cd /data/local/tmp
curl -LJo go-touch-mapper https://github.com/RiderLty/go-touch-mapper/releases/latest/download/go-touch-mapper_arm64
chmod 777 ./go-touch-mapper
./go-touch-mapper -h
```

## Build & Run

环境 termux
```
pkg i golang -y
git clone https://github.com/RiderLty/go-touch-mapper
cd go-touch-mapper
CGO_ENABLE=0 GOOS=linux go build -ldflags="-s -w"
./go-touch-mapper -h
```

## Help

```
usage: go-touch-mapper [-h|--help] [--create-js-info] [-c|--config "<value>"]
                       [-t|--touch-disabled] [-i|--inputManager <integer>]
                       [-r|--remoteControl] [-p|--port <integer>]
                       [-v|--v-mouse] [--auto-release <integer>]
                       [--measure-mode] [-d|--debug_mode]

                        

Arguments:

  -h  --help            Print help information
      --create-js-info  创建手柄配置文件模式. Default: false
  -c  --config          配置文件路径
  -t  --touch-disabled  关闭触屏混合. Default: false
  -i  --inputManager    使用inputManager控制触摸 适配多显示器
                        指定DisplayID. Default: -1
  -r  --remoteControl   是否从UDP接收远程事件. Default: false
  -p  --port            指定监听远程事件的UDP端口号. Default: 61069
  -v  --v-mouse        
                        用触摸操作模拟鼠标,需要额光标外显示程序.
                        Default: false
      --auto-release   
                        触发视角自动释放所需的静止ms数,50ms为检查单位,置0禁用.
                        Default: 200
      --measure-mode   
                        显示视角移动像素计数,且可输入数值模拟滑动,方向键可微调.
                        Default: false
  -d  --debug_mode      打印debug信息. Default: false
```
## Example

```
go-touch-mapper -c configs/SMC_JS.json
```

## 映射开关
默认键盘使用 ` 键，可在配置文件中修改，手柄为SELECT+RS组合键

## 配置文件
[创建映射文件工具](https://riderlty.github.io/go-touch-mapper/)

如有需要，可参照[EXAMPLE.JSON](https://github.com/RiderLty/go-touch-mapper/blob/main/configs/EXAMPLE.JSON)手动修改配置文件

可自动检测屏幕旋转方向，始终以左上角为原点，向右为X，向下为Y

按住键盘按键后，点击即可添加按键映射

灵敏度设置 MOUSE:SPEED:[ x , y ] float64类型

实际计算输出为 int( Speed * 256 * real_move ) 

虚拟触屏的大小为原始屏幕尺寸的256倍，以此解决缩放时慢速移动累计精度丢失的问题

## 触屏混合

程序会创建额外的uinput虚拟触屏来进行输入，默认会识别并读取机器物理触屏输入，与键鼠混合后使用虚拟触屏输出

这样可以实现设备输入时，点击屏幕不中断

如不需要此功能，使用-t即可不读取物理触屏


## 手柄支持
joystickInfos文件夹下json文件为手柄配置文件

按照按键位置统一为XBOX手柄按键

扳机键按照力度映射为5个等级的按键 BTN_LT_1 ... BTN_LT_5

没有线性扳机的手柄例如 Switch Pro controller 只有 BTN_LT 和 BTN_RT

  注意⚠ : 

* 手柄的按键代码在不同设备上可能有所差异
* 如果出现按键无反应的情况，建议重新创建手柄配置文件

### 手动创建手柄配置文件
```
go-touch-mapper --create-js-info -e 16 
```
或使用自动检测
```
go-touch-mapper --create-js-info -a
```

## 远程控制
```
go-touch-mapper -c configs/SMC_JS.json -r
```
PC上 修改remote_control中sender("192.168.1.64:61069")为手机IP，端口默认可不修改

运行

``` 
python remote_control.py 
```

## [InputManager](https://github.com/RiderLty/inputManager-touch-interface)
### 说明
由Scrcpy修改而来，使用app_process启动

通过 Unix Domain Socket 与主程序通信控制触屏

可在多显示器情况下指定displayID

只能在adb shell下启用 

且由于Unix Domain Socket的相关权限设定，主程序也必须运行在adb shell下

相比较于uinput输入方式，可以在多显示器的情况下指定displayID
```

