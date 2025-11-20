//go:build cgo

// plugin.go
package main

/*
不要修改注释内容！
*/

/*
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
*/
import "C"
import (
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"time"
	"unsafe"
)

var (
	CurveStrength   float64 = 0.1    // 曲线强度 (0-1之间，0为直线，1为强曲线)
	JitterIntensity float64 = 0.02   // 抖动强度
	JitterFrequency float64 = 8.0    // 抖动频率
	MinPoints       int     = 20     // 最少点数
	MaxPoints       int     = 100    // 最多点数
	PointsPerUnit   float64 = 5.0    // 每单位距离的点数
	EasingType      string  = "quad" // 缓动类型: "quad", "cubic", "sine"
)

var using_vecs [][]int32

type Point struct {
	X int32
	Y int32
}

// GenerateSwipeDisplacements 生成从起点到终点的位移量数组
// 返回从起点开始的每次位移到下一个点的坐标差值
func GenerateSwipeDisplacements(startX, startY, endX, endY int32) [][]int32 {
	// 将int32转换为float64进行计算
	sx, sy := float64(startX), float64(startY)
	ex, ey := float64(endX), float64(endY)
	dx := ex - sx
	dy := ey - sy
	distance := math.Sqrt(dx*dx + dy*dy)
	// 根据距离确定点数
	numPoints := int(distance / PointsPerUnit)
	if numPoints < MinPoints {
		numPoints = MinPoints
	}
	if numPoints > MaxPoints {
		numPoints = MaxPoints
	}
	// 生成绝对坐标点
	absolutePoints := generateAbsolutePoints(sx, sy, ex, ey, numPoints)
	// 将绝对坐标转换为位移量
	return convertToDisplacements(absolutePoints, startX, startY)
}

// generateAbsolutePoints 生成绝对坐标点
func generateAbsolutePoints(startX, startY, endX, endY float64, numPoints int) []Point {
	points := make([]Point, 0, numPoints)

	dx := endX - startX
	dy := endY - startY
	distance := math.Sqrt(dx*dx + dy*dy)

	// 初始化随机种子
	rand.Seed(time.Now().UnixNano())

	// 计算控制点 - 控制曲线的弯曲程度
	control1X := startX + dx*0.4 + rand.Float64()*distance*CurveStrength*2 - distance*CurveStrength
	control1Y := startY + dy*0.4 + rand.Float64()*distance*CurveStrength*2 - distance*CurveStrength
	control2X := startX + dx*0.6 + rand.Float64()*distance*CurveStrength*2 - distance*CurveStrength
	control2Y := startY + dy*0.6 + rand.Float64()*distance*CurveStrength*2 - distance*CurveStrength

	last_x := int32(0)
	last_y := int32(0)
	for i := 0; i < numPoints; i++ {
		t := float64(i) / float64(numPoints-1)
		easedT := applyEasing(t)
		x := cubicBezier(startX, control1X, control2X, endX, easedT)
		y := cubicBezier(startY, control1Y, control2Y, endY, easedT)
		if t > 0.15 && t < 0.85 {
			noise := math.Sin(t*JitterFrequency*math.Pi) * distance * JitterIntensity
			x += noise * (rand.Float64()*2 - 1)
			y += noise * (rand.Float64()*2 - 1)
		}
		rx := int32(math.Round(x))
		ry := int32(math.Round(y))
		if last_x != rx || last_y != ry {
			last_x = rx
			last_y = ry
			points = append(points, Point{
				X: rx,
				Y: ry,
			})
		}

	}

	return points
}

// convertToDisplacements 将绝对坐标转换为位移量
func convertToDisplacements(absolutePoints []Point, startX, startY int32) [][]int32 {
	if len(absolutePoints) == 0 {
		return [][]int32{}
	}

	displacements := make([][]int32, len(absolutePoints))

	// 第一个点的位移是相对于起点的
	displacements[0] = []int32{
		absolutePoints[0].X - startX,
		absolutePoints[0].Y - startY,
	}

	// 后续点的位移是相对于前一个点的
	for i := 1; i < len(absolutePoints); i++ {
		displacements[i] = []int32{
			absolutePoints[i].X - absolutePoints[i-1].X,
			absolutePoints[i].Y - absolutePoints[i-1].Y,
		}
	}

	return displacements
}

// cubicBezier 三次贝塞尔曲线计算
func cubicBezier(p0, p1, p2, p3, t float64) float64 {
	oneMinusT := 1 - t
	return oneMinusT*oneMinusT*oneMinusT*p0 +
		3*oneMinusT*oneMinusT*t*p1 +
		3*oneMinusT*t*t*p2 +
		t*t*t*p3
}

// applyEasing 应用缓动函数
func applyEasing(t float64) float64 {
	switch EasingType {
	case "quad":
		// 二次缓入缓出
		if t < 0.5 {
			return 2 * t * t
		}
		return -1 + (4-2*t)*t
	case "cubic":
		// 三次缓入缓出
		if t < 0.5 {
			return 4 * t * t * t
		}
		return 1 - math.Pow(-2*t+2, 3)/2
	case "sine":
		// 正弦缓入缓出
		return -(math.Cos(math.Pi*t) - 1) / 2
	default:
		// 默认线性
		return t
	}
}

// PrintDisplacements 打印位移量数组
func PrintDisplacements(displacements [][]int32) {
	fmt.Printf("位移量数组 (共%d个点):\n", len(displacements))
	for i, disp := range displacements {
		fmt.Printf("  点 %d: [%d, %d]\n", i, disp[0], disp[1])
	}
}

// ReconstructPath 从位移量重建路径（用于验证）
func ReconstructPath(startX, startY int32, displacements [][]int32) []Point {
	if len(displacements) == 0 {
		return []Point{}
	}

	path := make([]Point, len(displacements))

	// 第一个点
	path[0] = Point{
		X: startX + displacements[0][0],
		Y: startY + displacements[0][1],
	}

	// 后续点
	for i := 1; i < len(displacements); i++ {
		path[i] = Point{
			X: path[i-1].X + displacements[i][0],
			Y: path[i-1].Y + displacements[i][1],
		}
	}

	return path
}

/*
返回插件的配置模板，格式为JSON字符串，支持的配置项类型包括：

int32: 数值类型，支持min和max属性

bool: 布尔类型，表示开关

string: 字符串类型

select: 选项类型，值为index
具体示例见下方

将会渲染在网页配置页面中
*/
//export Plugin_config_template
func Plugin_config_template() *C.char {
	return C.CString(`{
        "数值类型": {
            "type": "int32",
            "default": 5,
            "min": 1,
            "max": 20,
            "description": "int32整数，滑块调整，可设置最大最小值"
        },
        "开关类型": {
            "type": "bool",
            "default": true,
            "description": "具有true与fals两种状态，传递是bool类型"
        },
        "字符串类型": {
            "type": "string",
            "default": "KEY_A",
            "description": "可输入自定义文本"
        },
        "选择类型": {
            "type": "select",
            "default": 0,
            "values": [
                "选项1",
                "选项2",
                "选项3",
                "选项4",
                "选项5",
                "选项6"
            ],
            "description": "提供固选项以供选择，获取值为选项的下标"
        }
    }`)
}

/*
插件唯一ID字符串，在配置文件中存储时用于标识插件

例如: lty.go-touch-mapper.default-plugin.v0.0.1
*/
//export Plugin_ID
func Plugin_ID() *C.char {
	return C.CString("lty.go-touch-mapper.default-plugin.v0.0.1")
}

/*
初始化函数，在插件加载时调用

返回的插件信息字符串数组，将显示在日志中
*/
//export Plugin_Init
func Plugin_Init() *C.char {
	// // init here
	// startX, startY := int32(100), int32(100)
	// endX, endY := int32(400), int32(300)

	// fmt.Println("=== 默认参数生成位移量 ===")

	GenerateSwipeDisplacements(0, 0, 100, 100)

	return C.CString(fmt.Sprintf("Plugin_Init called! \ngo-touch-mapper-plugin 这是默认插件初始化入口, 用于演示如何编写插件"))
}

/*
获取随机点击目标点坐标

程序会在每次需要点击目标点时调用此函数，传入目标点坐标和屏幕尺寸，

返回实际点击的坐标点
*/
func plugin_get_rand_click_target(
	target_x int32, // 目标点x坐标
	target_y int32, // 目标点y坐标
	screen_x int32, // 屏幕宽度
	screen_y int32, // 屏幕高度
	seed int32, // 随机种子,程序运行期间保持不变
	timestamp int64, // 时间戳 time.Now().UnixNano()
	config map[string]interface{}, // 用户配置参数
) (int32, int32) {
	//=======================================================================================================================================
	now := time.Now().UnixNano()
	fmt.Printf("plugin_get_rand_click_target(%d,%d,%d,%d,%d,%d,%v),", target_x, target_y, screen_x, screen_y, seed, timestamp, config)
	fmt.Printf("time used %v ns \n", now-timestamp)
	return target_x + rand.Int31n(20) - 10, target_y + rand.Int31n(20) - 10
	//=======================================================================================================================================
}

/*
获取轮盘移动偏移量

程序会以250HZ的频率异步调用此函数，传入当前轮盘状态和历史状态，

返回x轴和y轴的移动偏移量
*/
func plugin_get_wheel_move_offset(
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
	timestamp int64, // 时间戳 time.Now().UnixNano()
	config map[string]interface{}, // 用户配置参数
) (int32, int32) {
	//=======================================================================================================================================

	now := time.Now().UnixNano()
	fmt.Printf("plugin_get_wheel_move_offset(%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%v),", wheel_x, wheel_y, wheel_radius, shift_pressed, center_x, center_y, screen_x, screen_y, now_x, now_y, last_move_x, last_move_y, state_counter, seed, timestamp, config)
	fmt.Printf("time used %v ns \n", now-timestamp)
	target_x := center_x + wheel_x*wheel_radius
	target_y := center_y + wheel_y*wheel_radius

	if state_counter == 0 {
		using_vecs = GenerateSwipeDisplacements(now_x, now_y, target_x+rand.Int31n(30)-15, target_y+rand.Int31n(30)-15)
		return using_vecs[0][0], using_vecs[0][1]
	} else {
		if state_counter >= int32(len(using_vecs)) {
			return 0, 0
			// switch state_counter %  {
			// case
			// }
		} else {
			return using_vecs[state_counter][0], using_vecs[state_counter][1]
		}

	}
}

// =====================================================================================================
// 以下为包装函数，不要修改
//
//export Plugin_get_rand_click_target_c
func Plugin_get_rand_click_target_c(
	inputs_i32 *C.int32_t, // 指向 5 个 int32 输入的数组
	timestamp C.int64_t,
	config_json *C.char,
	config_len C.int32_t,
	outputs_i32 *C.int32_t, // 指向 2 个 int32 输出的数组
) {
	inputs := unsafe.Slice(inputs_i32, 5)
	configBytes := C.GoBytes(unsafe.Pointer(config_json), config_len)
	var goConfig map[string]interface{}
	err := json.Unmarshal(configBytes, &goConfig)
	if err != nil {
		fmt.Printf("[Plugin Error] JSON unmarshal failed: %v\n", err)
		// 发生错误时，向 C 返回 (0, 0)
		outputs := unsafe.Slice(outputs_i32, 2)
		outputs[0] = 0
		outputs[1] = 0
		return
	}
	goTimestamp := int64(timestamp)
	res_x, res_y := plugin_get_rand_click_target(
		int32(inputs[0]), //target_x
		int32(inputs[1]), //target_y
		int32(inputs[2]), //screen_x
		int32(inputs[3]), //screen_y
		int32(inputs[4]), //seed
		goTimestamp,
		goConfig,
	)
	outputs := unsafe.Slice(outputs_i32, 2)
	outputs[0] = C.int32_t(res_x)
	outputs[1] = C.int32_t(res_y)
}

//export Plugin_get_wheel_move_offset_c
func Plugin_get_wheel_move_offset_c(
	inputs_i32 *C.int32_t, // 指向 14 个 int32 输入的数组
	timestamp C.int64_t,
	config_json *C.char,
	config_len C.int32_t,
	outputs_i32 *C.int32_t, // 指向 2 个 int32 输出的数组
) {
	inputs := unsafe.Slice(inputs_i32, 14)
	configBytes := C.GoBytes(unsafe.Pointer(config_json), config_len)
	var goConfig map[string]interface{}
	err := json.Unmarshal(configBytes, &goConfig)
	if err != nil {
		fmt.Printf("[Plugin Error] JSON unmarshal failed: %v\n", err)
		// 发生错误时，向 C 返回 (0, 0)
		outputs := unsafe.Slice(outputs_i32, 2)
		outputs[0] = 0
		outputs[1] = 0
		return
	}
	goTimestamp := int64(timestamp)
	res_x, res_y := plugin_get_wheel_move_offset(
		int32(inputs[0]),  // wheel_x
		int32(inputs[1]),  // wheel_y
		int32(inputs[2]),  // wheel_radius
		int32(inputs[3]),  // shift_pressed
		int32(inputs[4]),  // center_x
		int32(inputs[5]),  // center_y
		int32(inputs[6]),  // screen_x
		int32(inputs[7]),  // screen_y
		int32(inputs[8]),  // now_x
		int32(inputs[9]),  // now_y
		int32(inputs[10]), // last_move_x
		int32(inputs[11]), // last_move_y
		int32(inputs[12]), // state_counter
		int32(inputs[13]), // seed
		goTimestamp,
		goConfig,
	)
	outputs := unsafe.Slice(outputs_i32, 2)
	outputs[0] = C.int32_t(res_x)
	outputs[1] = C.int32_t(res_y)

}

func main() {}
