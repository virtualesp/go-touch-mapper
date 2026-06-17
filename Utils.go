package main

import (
	"math/rand"
	"time"
)

const (
	letterBytes = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
)

func randStringBytes(n int) string {
	rand.Seed(time.Now().UnixNano())

	b := make([]byte, n)
	for i := range b {
		b[i] = letterBytes[rand.Int63()%int64(len(letterBytes))]
	}

	return string(b)
}

func randIntegerNum(n int) int {
	rand.Seed(time.Now().UnixNano())
	return rand.Intn(n)
}

func randUInt16Num(n int) uint16 {
	rand.Seed(time.Now().UnixNano())
	return uint16(rand.Intn(n))
}

func getRandomShift() int32 {
	rand.Seed(time.Now().UnixNano())
	//rand(max - min) - min, Range: [min, max]
	return rand.Int31n(40) - 20 //[-20, 20]
}

// createScreenScaler 工厂函数：生成坐标映射器（纯整数运算）
// 参数：设备宽度、高度，屏幕宽度、高度（单位任意，仅用于比例）
// 返回：映射函数 func(x, y int32) (int32, int32)

func createScreenScaler(deviceW, deviceH, screenW, screenH int32) func(int32, int32) (int32, int32) {
	// 转换为 int64 防止中间乘法溢出
	wd := int64(deviceW)
	hd := int64(deviceH)
	ws := int64(screenW)
	hs := int64(screenH)
	max := int64(0x7FFFFFFE)
	// 比较设备宽高比 (wd/hd) 与屏幕宽高比 (ws/hs)
	// 通过交叉乘法避免浮点：wd*hs 与 ws*hd
	left := wd * hs  // 设备比例分子
	right := ws * hd // 屏幕比例分子

	// 如果比例相同，直接返回恒等映射
	if left == right {
		return func(x, y int32) (int32, int32) {
			return x, y
		}
	}

	// 屏幕更宽：left < right → 左右黑边（邮筒模式）
	if left < right {
		// 预计算常数
		// X_screen = [ max * (right - left) + 2 * X_dev * left ] / (2 * right)
		// Y_screen = Y_dev
		numOffset := max * (right - left) // 分子中的常数部分
		denom := 2 * right                // 分母

		return func(x, y int32) (int32, int32) {
			// 用 int64 计算
			x64 := int64(x)
			num := numOffset + 2*x64*left
			// 四舍五入（加分母一半再整除）
			result := (num + denom/2) / denom
			// 钳位到 [0, max]
			if result < 0 {
				result = 0
			} else if result > max {
				result = max
			}
			return int32(result), y // Y 不变
		}
	}

	// 设备更宽：left > right → 上下黑边（信箱模式）
	// Y_screen = [ max * (left - right) + 2 * Y_dev * right ] / (2 * left)
	// X_screen = X_dev
	numOffset := max * (left - right)
	denom := 2 * left
	return func(x, y int32) (int32, int32) {
		y64 := int64(y)
		num := numOffset + 2*y64*right
		result := (num + denom/2) / denom
		if result < 0 {
			result = 0
		} else if result > max {
			result = max
		}
		return x, int32(result)
	}
}

func rotateAbsoluteXY(x, y int32) (int32, int32) { //根据方向旋转坐标
	switch global_device_orientation {
	case 0:
		return x, y
	case 1:
		return 0x7ffffffe - y, x
	case 2:
		return 0x7ffffffe - x, 0x7ffffffe - y
	case 3:
		return y, 0x7ffffffe - x
	default:
		return x, y
	}
}
