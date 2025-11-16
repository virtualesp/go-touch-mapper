package main

import (
	"plugin"
	"time"

	"github.com/bitly/go-simplejson"
)

type PluginManager struct {
	id                                string
	config_template                   string
	user_config                       map[string]interface{}
	func_Plugin_Init                  plugin.Symbol
	func_Plugin_get_rand_click_target plugin.Symbol
	func_Plugin_get_wheel_move_offset plugin.Symbol
}

func InitPluginManager() (*PluginManager, error) {
	p, err := plugin.Open("./plugin/plugin.so")
	if err != nil {
		logger.Debugf("未加载插件，使用内置函数实现")
		return nil, err
	}
	Plugin_config_template, err := p.Lookup("Plugin_config_template")
	if err != nil {
		logger.Debugf("未加载插件，使用内置函数实现")
		return nil, err
	}

	Plugin_ID, err := p.Lookup("Plugin_ID")
	if err != nil {
		logger.Debugf("未加载插件，使用内置函数实现")
		return nil, err
	}

	Plugin_Init, err := p.Lookup("Plugin_Init")
	if err != nil {
		logger.Debugf("未加载插件，使用内置函数实现")
		return nil, err
	}

	Plugin_get_rand_click_target, err := p.Lookup("Plugin_get_rand_click_target")
	if err != nil {
		logger.Debugf("未加载插件，使用内置函数实现")
		return nil, err
	}

	Plugin_get_wheel_move_offset, err := p.Lookup("Plugin_get_wheel_move_offset")
	if err != nil {
		logger.Debugf("未加载插件，使用内置函数实现")
		return nil, err

	}
	logger.Infof("插件加载成功: %s", Plugin_ID.(func() string)())

	default_config := simplejson.New()
	config_template_json, err := simplejson.NewJson([]byte(Plugin_config_template.(func() string)()))
	if err != nil {
		logger.Debugf("插件默认配置解析失败: %v", err)
	} else {
		if err != nil {
			logger.Debugf("插件默认配置编码失败: %v", err)
		} else {
			for k, v := range config_template_json.MustMap() {
				logger.Infof("插件默认配置项: %s = %v", k, v.(map[string]interface{})["default"])
				default_config.Set(k, v.(map[string]interface{})["default"])
			}

		}
	}

	return &PluginManager{
		id:                                Plugin_ID.(func() string)(),
		config_template:                   Plugin_config_template.(func() string)(),
		user_config:                       default_config.MustMap(),
		func_Plugin_Init:                  Plugin_Init,
		func_Plugin_get_rand_click_target: Plugin_get_rand_click_target,
		func_Plugin_get_wheel_move_offset: Plugin_get_wheel_move_offset,
	}, nil
}

func (pm *PluginManager) init() {
	result := pm.func_Plugin_Init.(func() []string)()

	logger.Info("插件初始化完成:")
	logger.Info("--------------------------------")
	for _, msg := range result {
		logger.Info(msg)
	}
	logger.Info("--------------------------------")
}

func (pm *PluginManager) update_user_config(config map[string]interface{}) {
	pm.user_config = config
	logger.Debugf("插件用户配置更新: %v", pm.user_config)
}

func (pm *PluginManager) get_rand_click_target(target_x int32, target_y int32, screen_x int32, screen_y int32, seed int32,
) (int32, int32) {
	return pm.func_Plugin_get_rand_click_target.(func(target_x int32, target_y int32, screen_x int32, screen_y int32, seed int32, config map[string]interface{}, timestamp int64) (int32, int32))(target_x, target_y, screen_x, screen_y, seed, pm.user_config, time.Now().UnixNano())
}

func (pm *PluginManager) get_wheel_move_offset(wheel_x int32, wheel_y int32, wheel_radius int32, shift_pressed int32, center_x int32, center_y int32, screen_x int32, screen_y int32, now_x int32, now_y int32, last_move_x int32, last_move_y int32, state_counter int32, seed int32,
) (int32, int32) {
	return pm.func_Plugin_get_wheel_move_offset.(func(wheel_x int32, wheel_y int32, wheel_radius int32, shift_pressed int32, center_x int32, center_y int32, screen_x int32, screen_y int32, now_x int32, now_y int32, last_move_x int32, last_move_y int32, state_counter int32, seed int32, config map[string]interface{}, timestamp int64) (int32, int32))(wheel_x, wheel_y, wheel_radius, shift_pressed, center_x, center_y, screen_x, screen_y, now_x, now_y, last_move_x, last_move_y, state_counter, seed, pm.user_config, time.Now().UnixNano())
}
