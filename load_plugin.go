//go:build cgo

// load_plugin.go
package main

/*
#cgo LDFLAGS: -ldl
#include <dlfcn.h>
#include <stdio.h>
#include <stdlib.h>
#include "./plugin/plugin.h"
char* call_plugin_id(void* f) {
    typedef char* (*plugin_id_func)();
    plugin_id_func func = (plugin_id_func)f;
    return func();
}

char* call_plugin_init(void* f) {
    typedef char* (*plugin_init_func)();
    plugin_init_func func = (plugin_init_func)f;
    return func();
}


char* call_plugin_config_template(void* f) {
    typedef char* (*plugin_config_template_func)();
    plugin_config_template_func func = (plugin_config_template_func)f;
    return func();
}



void call_wheel_move(
    void* f, // 函数指针
    int32_t* inputs_i32,  // 14 个 int32 的数组
    int64_t  timestamp,
    char* config_json,
    int32_t     config_len,
    int32_t* outputs_i32 // 2 个 int32 的数组 (out)
) {
    typedef void (*wheel_func_t)(
        int32_t*,
        int64_t,
        char*,
        int,
        int32_t*
    );
    wheel_func_t func = (wheel_func_t)f;
    func(inputs_i32, timestamp, config_json, config_len, outputs_i32);
}

void call_rand_click(
	void* f, // 函数指针
    int32_t* inputs_i32,  // 5 个 int32 的数组
    int64_t  timestamp,
    char* config_json,
    int32_t     config_len,
    int32_t* outputs_i32 // 2 个 int32 的数组 (out)
){
    typedef void (*click_func_t)(
        int32_t*,
        int64_t,
        char*,
        int,
        int32_t*
    );
    click_func_t func = (click_func_t)f;
    func(inputs_i32, timestamp, config_json, config_len, outputs_i32);
}
*/
import "C"
import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"
	"unsafe"

	"github.com/bitly/go-simplejson"
)

type PluginManager struct {
	id                    string
	config_template       string
	user_config           map[string]interface{}
	user_config_file_path string
	user_config_bytes     []byte
	user_config_char      unsafe.Pointer
	user_config_len       C.int32_t
	click_func_ptr        unsafe.Pointer
	click_args_int32x5    []C.int32_t
	click_output_data     []C.int32_t
	click_output_ptr      *C.int32_t
	wheel_func_ptr        unsafe.Pointer
	wheel_args_int32x14   []C.int32_t
	wheel_output_data     []C.int32_t
	wheel_output_ptr      *C.int32_t

	state_counter      int32
	wheel_seed         int32
	last_wheel_x       int32
	last_wheel_y       int32
	last_move_x        int32
	last_move_y        int32
	last_shift_pressed int32
}

func InitPluginManager() (*PluginManager, error) {
	path, _ := exec.LookPath(os.Args[0])
	abspath, _ := filepath.Abs(path)
	workingDir, _ := filepath.Split(abspath)
	pluginPath := filepath.Join(workingDir, "plugin.so")
	pluginConfigDir := filepath.Join(workingDir, "pluginconfig")
	if _, err := os.Stat(pluginConfigDir); os.IsNotExist(err) {
		os.Mkdir(pluginConfigDir, os.ModePerm)
	}
	cpath := C.CString(pluginPath)

	h := C.dlopen(cpath, C.RTLD_LAZY)
	if h == nil {
		cerr := C.dlerror()
		logger.Debugf("未加载插件 %v,%v\n", pluginPath, C.GoString(cerr))
		if cerr == nil {
			return nil, errors.New("dlopen failed: <nil> dlerror")
		}
		return nil, errors.New("dlopen failed: " + C.GoString(cerr))
	}
	logger.Info("加载插件成功")

	click_func_ptr := C.dlsym(h, C.CString("Plugin_get_rand_click_target_c"))
	wheel_func_ptr := C.dlsym(h, C.CString("Plugin_get_wheel_move_offset_c"))

	plugin_id := C.GoString(C.call_plugin_id(C.dlsym(h, C.CString("Plugin_ID"))))
	fmt.Printf("Plugin ID: %s\n", plugin_id)

	init_info := C.GoString(C.call_plugin_id(C.dlsym(h, C.CString("Plugin_Init"))))
	fmt.Printf("Plugin_Init: %s\n", init_info)

	config_template := C.GoString(C.call_plugin_id(C.dlsym(h, C.CString("Plugin_config_template"))))
	fmt.Printf("Plugin_config_template: %s\n", config_template)

	user_config_file_path := filepath.Join(pluginConfigDir, fmt.Sprintf("%s.json", plugin_id))
	var user_config map[string]interface{}
	var user_config_bytes []byte
	if !fileExists(user_config_file_path) {
		default_config := simplejson.New()
		config_template_json, err := simplejson.NewJson([]byte(config_template))
		if err != nil {
			logger.Debugf("插件默认配置解析失败: %v", err)
			return nil, err
		} else {
			if err != nil {
				logger.Debugf("插件默认配置编码失败: %v", err)
				return nil, err
			} else {
				for k, v := range config_template_json.MustMap() {
					logger.Infof("插件默认配置项: %s = %v", k, v.(map[string]interface{})["default"])
					default_config.Set(k, v.(map[string]interface{})["default"])
				}
			}
		}
		cb, err := json.Marshal(default_config)
		if err != nil {
			logger.Debugf("JSON解析失败: %v", err)
			return nil, err
		}
		logger.Infof("已创建插件默认配置文件:%v", user_config_file_path)
		os.WriteFile(user_config_file_path, cb, 0644)
		user_config_bytes = cb
		user_config = default_config.MustMap()
	} else {
		raw, _ := os.ReadFile(user_config_file_path)
		user_config_bytes = []byte(raw)
		json.Unmarshal(raw, &user_config)
	}

	user_config_char := C.CBytes(user_config_bytes) //记得释放
	user_config_len := C.int32_t(len(user_config_bytes))

	click_args_int32x5 := []C.int32_t{
		500,  //target_x
		400,  //target_y
		1920, //screen_x
		1080, //screen_y
		1234, //seed
	}
	click_output_data := make([]C.int32_t, 2)
	click_output_ptr := &click_output_data[0]

	wheel_args_int32x14 := []C.int32_t{
		1,     // wheel_x
		0,     // wheel_y
		100,   // wheel_radius
		0,     // shift_pressed
		500,   // center_x
		500,   // center_y
		1920,  // screen_x
		1080,  // screen_y
		509,   // now_x  <-- 模拟当前触摸点
		500,   // now_y
		1,     // last_move_x
		0,     // last_move_y
		50,    // state_counter
		12345, // seed
	}

	wheel_output_data := make([]C.int32_t, 2)
	wheel_output_ptr := &wheel_output_data[0]

	return &PluginManager{
		id:                    plugin_id,
		config_template:       config_template,
		user_config:           user_config,
		user_config_file_path: user_config_file_path,
		user_config_bytes:     user_config_bytes,
		user_config_char:      user_config_char,
		user_config_len:       user_config_len,
		click_func_ptr:        click_func_ptr,
		click_args_int32x5:    click_args_int32x5,
		click_output_data:     click_output_data,
		click_output_ptr:      click_output_ptr,
		wheel_func_ptr:        wheel_func_ptr,
		wheel_args_int32x14:   wheel_args_int32x14,
		wheel_output_data:     wheel_output_data,
		wheel_output_ptr:      wheel_output_ptr,
	}, nil
}

func (pm *PluginManager) update_user_config(config map[string]interface{}) {
	pm.user_config = config

	cb, err := json.Marshal(config)
	pm.user_config_bytes = cb

	os.WriteFile(pm.user_config_file_path, cb, 0644)

	if err != nil {
		panic(err)
	}
	C.free(pm.user_config_char)
	pm.user_config_char = C.CBytes(cb) //记得释放
	pm.user_config_len = C.int32_t(len(cb))
	logger.Infof("插件用户配置更新: %v", pm.user_config)
}

func (pm *PluginManager) get_rand_click_target(target_x int32, target_y int32, screen_x int32, screen_y int32, seed int32,
) (int32, int32) {
	pm.click_args_int32x5[0] = C.int32_t(target_x)
	pm.click_args_int32x5[1] = C.int32_t(target_y)
	pm.click_args_int32x5[2] = C.int32_t(screen_x)
	pm.click_args_int32x5[3] = C.int32_t(screen_y)
	pm.click_args_int32x5[4] = C.int32_t(seed)
	C.call_rand_click(
		pm.click_func_ptr,
		&pm.click_args_int32x5[0],
		C.int64_t(time.Now().UnixNano()),
		(*C.char)(pm.user_config_char),
		pm.user_config_len,
		pm.click_output_ptr,
	)
	return int32(pm.click_output_data[0]), int32(pm.click_output_data[1])
}

func (pm *PluginManager) get_wheel_move_offset(wheel_x int32, wheel_y int32, wheel_radius int32, shift_pressed int32, center_x int32, center_y int32, screen_x int32, screen_y int32, now_x int32, now_y int32,
) (int32, int32) {
	// return 1, 1
	if wheel_x == pm.last_wheel_x && wheel_y == pm.last_wheel_y && shift_pressed == pm.last_shift_pressed {
		pm.state_counter += 1
	} else {
		pm.state_counter = 0
		pm.wheel_seed = int32(randIntegerNum(0x7ffffffe))
	}
	pm.wheel_args_int32x14[0] = C.int32_t(wheel_x)
	pm.wheel_args_int32x14[1] = C.int32_t(wheel_y)
	pm.wheel_args_int32x14[2] = C.int32_t(wheel_radius)
	pm.wheel_args_int32x14[3] = C.int32_t(shift_pressed)
	pm.wheel_args_int32x14[4] = C.int32_t(center_x)
	pm.wheel_args_int32x14[5] = C.int32_t(center_y)
	pm.wheel_args_int32x14[6] = C.int32_t(screen_x)
	pm.wheel_args_int32x14[7] = C.int32_t(screen_y)
	pm.wheel_args_int32x14[8] = C.int32_t(now_x)
	pm.wheel_args_int32x14[9] = C.int32_t(now_y)
	pm.wheel_args_int32x14[10] = C.int32_t(pm.last_move_x)
	pm.wheel_args_int32x14[11] = C.int32_t(pm.last_move_y)
	pm.wheel_args_int32x14[12] = C.int32_t(pm.state_counter)
	pm.wheel_args_int32x14[13] = C.int32_t(pm.wheel_seed)
	C.call_wheel_move(
		pm.wheel_func_ptr,
		&pm.wheel_args_int32x14[0],
		C.int64_t(time.Now().UnixNano()),
		(*C.char)(pm.user_config_char),
		pm.user_config_len,
		pm.wheel_output_ptr,
	)
	pm.last_move_x, pm.last_move_y = int32(pm.wheel_output_data[0]), int32(pm.wheel_output_data[1])
	return pm.last_move_x, pm.last_move_y
}
