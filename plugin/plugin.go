package main

import "C"
import (
	"fmt"
	"math/rand"
	"time"
)

var plugin_version = "v1.0.0"

/*
返回插件的配置模板，格式为JSON字符串，支持的配置项类型包括：

number: 数值类型，支持min和max属性

switch: 布尔类型，表示开关

string: 字符串类型

具体示例见下方

将会渲染在网页配置页面中
*/
func Plugin_config_template() string {

	return `{
    "曲线": {
        "type": "number",
        "default": 5,
        "min": 1,
        "max": 20,
        "description": "曲线弯曲度，值越大弯曲度越高"
    },
    "随机": {
        "type": "switch",
        "default": true,
        "description": "是否启用随机偏移"
    },
    "code":{
        "type": "string",
        "default": "KEY_A",
        "description": "自定义代码片段"
    }
}`
}

/*
插件唯一ID字符串，在配置文件中存储时用于标识插件

例如: lty.go-touch-mapper.default-plugin.v0.0.1
*/
func Plugin_ID() string {
	return "lty.go-touch-mapper.default-plugin.v0.0.1"
}

/*
初始化函数，在插件加载时调用

返回的插件信息字符串数组，将显示在日志中
*/
func Plugin_Init() []string {

	return []string{
		fmt.Sprintf("Plugin_Init called! version: %s", plugin_version),
		"go-touch-mapper-plugin 这是默认插件初始化入口, 用于演示如何编写插件",
		"里面的函数仅使用最基础的实现",
	}
}

/*
获取随机点击目标点坐标

程序会在每次需要点击目标点时调用此函数，传入目标点坐标和屏幕尺寸，

返回实际点击的坐标点
*/
func Plugin_get_rand_click_target(
	target_x int32, // 目标点x坐标
	target_y int32, // 目标点y坐标
	screen_x int32, // 屏幕宽度
	screen_y int32, // 屏幕高度
	seed int32, // 随机种子,程序运行期间保持不变
	config map[string]interface{}, // 用户配置参数
	timestamp int64, // 当前时间戳 毫秒
) (int32, int32) {

	return target_x + rand.Int31n(20) - 10, target_y + rand.Int31n(20) - 10
}

/*
获取轮盘移动偏移量

程序会以250HZ的频率异步调用此函数，传入当前轮盘状态和历史状态，

返回x轴和y轴的移动偏移量
*/
func Plugin_get_wheel_move_offset(
	wheel_x int32, // wasd轮盘 x轴方向 [-1, 0, 1]
	wheel_y int32, // wasd轮盘 y轴方向 [-1, 0, 1]
	wheel_radius int32, // 当前轮盘半径, shift键按下时为放大后的半径
	shift_pressed int32, // shift键是否按下 (0/1)
	center_x int32, // 轮盘中心点x坐标
	center_y int32, // 轮盘中心点y坐标
	screen_x int32, // 屏幕宽度
	screen_y int32, // 屏幕高度
	now_x int32, // 当前触摸点x坐标
	now_y int32, // 当前触摸点y坐标
	last_move_x int32, // 上一次x轴方向移动量
	last_move_y int32, // 上一次y轴方向移动量
	state_counter int32, // 状态计数器，每次调用此函数+1，wasd与shift任意一者状态变化时置0,超过int32最大值时归0
	seed int32, // 随机种子，用于生成随机数，wasd与shift任意一者状态变化时更新
	config map[string]interface{}, // 用户配置参数
	timestamp int64, // 当前时间戳 毫秒
) (int32, int32) {
	now := time.Now().UnixNano()
	fmt.Printf("time used %v ns \n", now-timestamp)

	target_x := center_x + wheel_x*wheel_radius
	target_y := center_y + wheel_y*wheel_radius
	offset_x := target_x - now_x
	offset_y := target_y - now_y
	if offset_x == 0 && offset_y == 0 {
		return 0, 0
	}
	var move_x int32 = 0
	var move_y int32 = 0
	switch {
	case offset_x > 10:
		move_x = 10
	case offset_x < -10:
		move_x = -10
	default:
		move_x = offset_x
	}
	switch {
	case offset_y > 10:
		move_y = 10
	case offset_y < -10:
		move_y = -10
	default:
		move_y = offset_y
	}
	return move_x, move_y
}
