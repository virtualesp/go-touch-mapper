
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DraggableContainer from "./DraggableContainer";
import JoystickListener from "./JoystickListener";
import * as keyNameMap from "./keynamemap.json";

import {
    WheelShow,
    ViewShow,
    FixedIcon,
    GroupFixedIcon,
} from "./UIcomponents"

import { imageUrlToBase64 } from "../utils/image";
import { useConfig } from "../hooks/useConfig";
import OtherSettings from "./configManager/OtherSettings";
import KeySettingRender from "./configManager/KeySettingRender";
import { Grid, Paper } from "@mui/material";

export default function ConfigManager() {
    const {
        config,
        updateConfig,
        getDisplayValueX,
        getDisplayValueY,
        exportJSON,
        fetchConfig,
        setConfig,
    } = useConfig();

    const [pluginConfig, setPluginConfig] = useState({})
    const [pluginValue, setPluginValue] = useState({})
    const [exportButtonText, setExportButtonText] = useState("更新配置")
    const [selectKEY, setSelectKEY] = useState(null)
    const [imgUrl, setImgUrl] = useState(config.IMG);
    const [imgSize, setImgSize] = useState([1, 1])

    const getPostionValueX = useCallback((value) => { return parseInt(value * imgSize[0]) }, [imgSize])
    const getPostionValueY = useCallback((value) => { return parseInt(value * imgSize[1]) }, [imgSize])

    const viewCenterSetting = useRef(false)
    const addingSwitchKey = useRef(false)

    const handleFileChange = (e) => {
        const reads = new FileReader();
        reads.readAsDataURL(document.getElementById('fileInput').files[0]);
        reads.onload = async function (e) {
            const bas64STR = await imageUrlToBase64(this.result)
            updateConfig(draft => { draft.IMG = bas64STR });
            document.body.requestFullscreen();
        };
    }

    const getRemoteApiImg = async (url) => {
        const bas64STR = await imageUrlToBase64(url)
        updateConfig(draft => { draft.IMG = bas64STR })
        document.body.requestFullscreen();
    }

    const imgLoaded = () => {
        setImgSize([document.getElementById("img").width, document.getElementById("img").height])
        updateConfig(draft => { draft.SCREEN.SIZE = [document.getElementById("img").naturalWidth, document.getElementById("img").naturalHeight] })
    }

    const handelImgClick = (e) => {
        const rect = document.getElementById("img").getBoundingClientRect()
        const key = selectKEY
        const x = (e.clientX - rect.left) / document.getElementById("img").width;
        const y = (e.clientY - rect.top) / document.getElementById("img").height
        if (x > 1 || y > 1) {//忽略大于屏幕的
            return
        }
        if (viewCenterSetting.current) {
            updateConfig(draft => {
                draft.MOUSE.POS = [x, y]
            })
            viewCenterSetting.current = false
            return
        }

        if (key !== null) {
            if (key === "REL_WHEEL_UP" || key == "REL_WHEEL_DOWN") {
                updateConfig(draft => {
                    draft.KEY_MAPS[key] = {
                        "TYPE": "CLICK",
                        "POS": [x, y],
                        "INTERVAL": [18]
                    }
                })
            } else {
                updateConfig(draft => {
                    draft.KEY_MAPS[key] = {
                        "TYPE": "PRESS",
                        "POS": [x, y]
                    }
                })
            }
            if (["BTN_LEFT", "BTN_MIDDLE", "BTN_RIGHT", "BTN_SIDE", "BTN_EXTRA", "REL_WHEEL_DOWN", "REL_WHEEL_UP"].indexOf(key) !== -1) {
                setSelectKEY(null)
            }
        } else {
            if (window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('imgOnNoKeyClick', {
                    detail: { x: x, y: y }
                }))
            } else {
                window.fireEvent(new CustomEvent('imgOnNoKeyClick', {
                    detail: { x: x, y: y }
                }));
            }

        }
    }

    const exportJSON = () => {
        setExportButtonText("配置更新中")
        fetch('/configure/set', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "config": config,
                "plugin": pluginValue
            })
        }).then(resp => resp.text()).then(text => {
            setExportButtonText(text)
            setTimeout(() => {
                setExportButtonText("更新配置")
            }, 1000)
        }).catch(err => {
            setExportButtonText(String(err))
            setTimeout(() => {
                setExportButtonText("更新配置")
            }, 1000)
        })
    }
    const OtherSettings = () => {

        const wheelPosSelecting = useRef(false)
        const [range, setRange] = useState(config["WHEEL"]["RANGE"] * 100)
        const [shiftRange, setShiftRange] = useState(config["WHEEL"]["SHIFT_RANGE"] * 100)

        const [setPosButtonDisabled, setSetPosButtonDisabled] = useState(false)
        const readyToSetPos = () => {
            wheelPosSelecting.current = true;
            setSetPosButtonDisabled(true)
        }
        const imgClickListener = (e) => {
            if (wheelPosSelecting.current) {
                setConfig(produce(draft => { draft.WHEEL.POS = [e.detail.x, e.detail.y] }))
                wheelPosSelecting.current = false
                setSetPosButtonDisabled(false)
            }
        }

        useEffect(() => {

            window.addEventListener('imgOnNoKeyClick', imgClickListener)
            return () => {
                window.removeEventListener('imgOnNoKeyClick', imgClickListener)
            }
        }, [])

        return <Paper sx={{
            width: "370px",
            marginLeft: "10px",
        }}>
            <Grid
                container
                direction="row"
                justifyContent="space-between"
                alignItems="center"
            >
                <Grid item>
                    {selectKEY ? <a>&emsp;点击屏幕映射{selectKEY}</a> : <a>&emsp;按下某个按键并点击</a>}
                </Grid>
                <Grid item>
                    <IconButton onClick={() => document.body.requestFullscreen()} ><FullscreenIcon /></IconButton>
                </Grid>
            </Grid>

            <Grid
                container
                spacing={"10px"}
                direction="column"
                justify="center"
                alignItems="center"
                sx={{
                    width: "350px",
                    marginLeft: "10px",
                    marginTop: "1px",
                }}
            >
                <Grid
                    container
                    direction="row"
                    justifyContent="space-evenly"
                    alignItems="center"
                    spacing={"10px"}
                >
                    <Grid item xs={6}>
                        <Button
                            onClick={() => { getRemoteApiImg("/screen.png") }}
                            variant="outlined"
                            sx={{
                                width: "100%",
                                marginTop: "10px",
                            }}
                        >{"获取截图"}</Button>
                    </Grid>
                    <Grid item xs={6}>
                        <Button
                            onClick={() => { setTimeout(() => { getRemoteApiImg("/screen.png") }, 5000) }}
                            variant="outlined"
                            sx={{
                                width: "100%",
                                marginTop: "10px",
                            }}
                        >{"5s后获取截图"}</Button>
                    </Grid>
                    <Grid item xs={12}>
                        <Button
                            onClick={() => { document.getElementById('fileInput').click(); }}
                            variant="outlined"
                            sx={{
                                width: "100%",
                            }}
                        >{"上传截图"}</Button>
                    </Grid>
                </Grid>
                <Button
                    onClick={exportJSON}
                    variant="outlined"
                    sx={{
                        width: "100%",
                        marginTop: "10px",
                    }}
                >{exportButtonText}</Button>

                <Grid
                    container
                    direction="row"
                    justifyContent="space-evenly"
                    alignItems="center"
                    spacing={"10px"}
                >
                    <Grid item xs={12}>

                        <Typography
                            sx={{
                                width: "100%",
                                marginTop: "10px",
                            }}
                        >
                            鼠标按键
                        </Typography>
                    </Grid>
                    <Grid item xs={4}>
                        <Button
                            onClick={() => { setSelectKEY("BTN_LEFT") }}
                            variant="outlined"
                            sx={{
                                width: "100%",
                            }}
                        >{"左键"}</Button>
                    </Grid>
                    <Grid item xs={4}>
                        <Button
                            onClick={() => { setSelectKEY("BTN_MIDDLE") }}
                            variant="outlined"
                            sx={{
                                width: "100%",
                            }}
                        >{"中键"}</Button>
                    </Grid>
                    <Grid item xs={4}>
                        <Button
                            onClick={() => { setSelectKEY("BTN_RIGHT") }}
                            variant="outlined"
                            sx={{
                                width: "100%",
                            }}
                        >{"右键"}</Button>
                    </Grid>
                    <Grid item xs={3}>
                        <Button
                            onClick={() => { setSelectKEY("BTN_EXTRA") }}
                            variant="outlined"
                            sx={{
                                width: "100%",
                            }}
                        >{"前进"}</Button>
                    </Grid>
                    <Grid item xs={3}>
                        <Button
                            onClick={() => { setSelectKEY("BTN_SIDE") }}
                            variant="outlined"
                            sx={{
                                width: "100%",
                            }}
                        >{"后退"}</Button>
                    </Grid>
                    <Grid item xs={3}>
                        <Button
                            onClick={() => { setSelectKEY("REL_WHEEL_UP") }}
                            variant="outlined"
                            sx={{
                                width: "100%",
                            }}
                        >{"滚轮上"}</Button>
                    </Grid>
                    <Grid item xs={3}>
                        <Button
                            onClick={() => { setSelectKEY("REL_WHEEL_DOWN") }}
                            variant="outlined"
                            sx={{
                                width: "100%",
                            }}
                        >{"滚轮下"}</Button>
                    </Grid>



                </Grid>

                <Grid
                    container
                    direction="row"
                    justifyContent="flex-start"
                    alignItems="center"
                    sx={{
                        height: "50px",
                    }}
                >
                    <a>视角灵敏度&emsp;&emsp;横向 : </a>
                    <CostumedInput defaultValue={config["MOUSE"]["SPEED"][0]} onCommit={(value) => {
                        setConfig(produce(draft => { draft.MOUSE.SPEED[0] = value; }))
                    }} width="40px" />
                    <a> &emsp;纵向 : </a>
                    <CostumedInput defaultValue={config["MOUSE"]["SPEED"][1]} onCommit={(value) => {
                        setConfig(produce(draft => { draft.MOUSE.SPEED[1] = value; }))
                    }} width="40px" />
                </Grid>
                <Grid
                    container
                    direction="row"
                    justifyContent="flex-start"
                    alignItems="center"
                    sx={{
                        height: "50px",
                    }}
                >
                    <Grid
                        container
                        direction="row"
                        justifyContent="flex-start"
                        alignItems="center"
                        sx={{
                            height: "50px",
                        }}>
                        <a>{`视角中心位置:(${parseInt(config["MOUSE"]["POS"][0] * config["SCREEN"]["SIZE"][0])} , ${parseInt(config["MOUSE"]["POS"][1] * config["SCREEN"]["SIZE"][1])})`} </a>
                        <Button onClick={() => { viewCenterSetting.current = true }} disabled={setPosButtonDisabled} sx={{ height: "30px", marginLeft: "10px" }} variant="outlined"  >重设</Button>

                    </Grid>
                </Grid>

                <Grid
                    container
                    direction="row"
                    justifyContent="flex-start"
                    alignItems="center"
                    sx={{
                        // height: "50px",
                    }}
                    spacing={1}
                >
                    <Grid item xs={12}>

                        <Typography
                            sx={{
                                width: "100%",
                                marginTop: "10px",
                            }}
                        >
                            映射切换按键：
                        </Typography>
                    </Grid>
                    {config["MOUSE"]["SWITCH_KEYS"].map((key, index) => {
                        return <Grid item key={index}>
                            <Button
                                key={index}
                                onClick={() => {
                                    setConfig(produce(draft => {
                                        draft.MOUSE.SWITCH_KEYS.splice(index, 1)
                                    }))
                                }}
                                variant="outlined"
                                sx={{
                                    width: "100%",
                                }}
                            ><Typography noWrap>{key}</Typography>
                                <HighlightOffIcon />
                            </Button>
                        </Grid>
                    })}
                    <Grid item key={"添加切换按键"}>
                        <Button
                            key={"添加切换按键"}
                            onClick={() => {
                                addingSwitchKey.current = true;
                                setAddingSwitchKeyInfoText("按下按键以添加")
                            }}
                            variant="contained"
                            sx={{
                                width: "100%",
                                // marginTop: "10px",
                            }}
                        ><Typography noWrap>{addingSwitchKeyInfoText}</Typography>
                        </Button>
                    </Grid>

                </Grid>




                <Grid
                    container
                    direction="row"
                    justifyContent="flex-start"
                    alignItems="center"
                    sx={{
                        height: "50px",
                    }}>
                    <a>{`左摇杆中心位置:(${parseInt(config["WHEEL"]["POS"][0] * config["SCREEN"]["SIZE"][0])} , ${parseInt(config["WHEEL"]["POS"][1] * config["SCREEN"]["SIZE"][1])})`} </a>
                    <Button onClick={readyToSetPos} disabled={setPosButtonDisabled} sx={{ height: "30px", marginLeft: "10px" }} variant="outlined"  >重设</Button>

                </Grid>

                <Grid
                    container
                    direction="row"
                    justifyContent="flex-start"
                    alignItems="center"
                    sx={{
                        height: "150px",
                    }}>

                    <Typography gutterBottom>
                        半径
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs>
                            <Slider
                                min={0}
                                max={50}
                                step={1}
                                value={range}
                                onChange={(_, value) => { setRange(value) }}
                                onChangeCommitted={(_, value) => {
                                    setRange(value)
                                    setConfig(produce(draft => { draft.WHEEL.RANGE = Number(value) / 100; }))
                                    if (value > shiftRange) {
                                        setShiftRange(value)
                                        setConfig(produce(draft => { draft.WHEEL.SHIFT_RANGE = Number(value) / 100; }))
                                    }
                                }}
                            />
                        </Grid>
                    </Grid>
                    <Typography gutterBottom>
                        {config["WHEEL"]["SHIFT_RANGE_ENABLE"] ? "启用shift轮盘" : "禁用shift轮盘"}
                    </Typography>
                    <Switch
                        checked={config["WHEEL"]["SHIFT_RANGE_ENABLE"]}
                        onChange={() => {
                            setConfig(produce(draft => { draft.WHEEL.SHIFT_RANGE_ENABLE = !draft.WHEEL.SHIFT_RANGE_ENABLE; }))
                        }}
                    />

                    <Typography gutterBottom>
                        {config["WHEEL"]["SHIFT_RANGE_SWITCH_ENABLE"] ? "shift切换模式" : "shift长按模式"}
                    </Typography>
                    <Switch
                        checked={config["WHEEL"]["SHIFT_RANGE_SWITCH_ENABLE"]}
                        onChange={() => {
                            setConfig(produce(draft => { draft.WHEEL.SHIFT_RANGE_SWITCH_ENABLE = !draft.WHEEL.SHIFT_RANGE_SWITCH_ENABLE; }))
                        }}
                    />


                    <Grid container spacing={2}>
                        <Grid item xs>
                            <Slider
                                min={range}
                                max={50}
                                step={1}
                                value={shiftRange}
                                onChange={(_, value) => { setShiftRange(value) }}
                                onChangeCommitted={(_, value) => {
                                    setShiftRange(value)
                                    setConfig(produce(draft => { draft.WHEEL.SHIFT_RANGE = Number(value) / 100; }))
                                }}
                            />
                        </Grid>
                    </Grid>

                </Grid>

            </Grid>
        </Paper>
    }


    const Type_click = ({ data }) => {
        return <div>
            <a>点击时间 : </a>
            <CostumedInput defaultValue={data["INTERVAL"][0]} onCommit={(value) => {
                setConfig(produce(draft => { draft.KEY_MAPS[data["KEY"]].INTERVAL = [value] }))
            }} />
            <a> ms</a>
        </div>
    }

    const Type_auto_fire = ({ data }) => {
        return <div>
            <a>点击时长 : </a>
            <CostumedInput defaultValue={data["INTERVAL"][0]} onCommit={(value) => {
                setConfig(produce(draft => { draft.KEY_MAPS[data["KEY"]].INTERVAL[0] = value }))

            }} />
            <a> ms</a>

            <a> &emsp;间隔 : </a>
            <CostumedInput defaultValue={data["INTERVAL"][1]} onCommit={(value) => {
                setConfig(produce(draft => { draft.KEY_MAPS[data["KEY"]].INTERVAL[1] = value }))
            }} />
            <a> ms</a>
        </div>
    }

    const Type_drag = ({ data }) => {
        const waitingForClick = useRef(false)
        const [addButtonDisabled, setAddButtonDisabled] = useState(false)
        const readyToAdd = () => { waitingForClick.current = true; setAddButtonDisabled(true) }
        const addKeyPoint = (x, y) => {
            setConfig(produce(draft => { draft.KEY_MAPS[data["KEY"]].POS_S.push([x, y]) }))
        }

        const removeKeyPoint = (index) => {
            setConfig(produce(draft => { draft.KEY_MAPS[data["KEY"]].POS_S.splice(index, 1) }))
        }

        const imgClickListener = (e) => {
            if (waitingForClick.current) {
                addKeyPoint(e.detail.x, e.detail.y)
                waitingForClick.current = false;
                setAddButtonDisabled(false)
            }
        }
    }

    const handleExport = async () => {
        setExportButtonText("配置更新中");
        const result = await exportJSON();
        setExportButtonText(result);
        setTimeout(() => {
            setExportButtonText("更新配置")
        }, 1000);
    };

    useEffect(() => {
        document.onkeydown = (e) => {
            if (e.repeat === false && window.stopPreventDefault !== true) {
                e.preventDefault();
                if (addingSwitchKey.current) {
                    updateConfig(draft => {
                        if (draft.MOUSE.SWITCH_KEYS.indexOf(keyNameMap[e.code.toLowerCase()]) === -1) {
                            draft.MOUSE.SWITCH_KEYS.push(keyNameMap[e.code.toLowerCase()])
                        }
                    })
                } else {
                    setSelectKEY(keyNameMap[e.code.toLowerCase()])
                }
            }
        }
        document.onkeyup = (e) => {
            if (window.stopPreventDefault !== true) {
                e.preventDefault();
                setSelectKEY(null)
            }
        }
        document.oncontextmenu = function (e) {
            e.preventDefault();
        };

        window.addEventListener("resize", (e) => {
            if (document.getElementById("img")) {
                setImgSize([document.getElementById("img").width, document.getElementById("img").height])
            }
        })
        fetch("/configure/get")
            .then(resp => resp.json())
            .then(data => setConfig(data))
            .catch(err => {
                console.log(err)
            })

        fetch("/plugin/configure/getConfig")
            .then(resp => resp.json())
            .then(userConfig => {
                fetch("/plugin/configure/getTemplate")
                    .then(resp => resp.json())
                    .then(pluginTemplate => {
                        setPluginValue(userConfig)
                        setPluginConfig(pluginTemplate)
                    }
                    )
                    .catch(err => {
                        console.log(err)
                    })
            })
            .catch(err => {
                console.log(err)
            })
    }, [])

    const KeyShow = ({ data }) => {
        return <div>
            {data["TYPE"] === "PRESS" || data["TYPE"] === "AUTO_FIRE" || data["TYPE"] === "CLICK" ? <FixedIcon x={getPostionValueX(data["POS"][0])} y={getPostionValueY(data["POS"][1])} text={data["KEY"]} /> : null}
            {data["TYPE"] === "MULT_PRESS" ? <GroupFixedIcon pos_s={data["POS_S"].map(([x, y]) => [getPostionValueX(x), getPostionValueY(y)])} text={data["KEY"]} bgColor={"#00796B"} textColor={"#ffffff"} /> : null}
            {data["TYPE"] === "DRAG" ? <GroupFixedIcon pos_s={data["POS_S"].map(([x, y]) => [getPostionValueX(x), getPostionValueY(y)])} text={data["KEY"]} bgColor={"#3F51B5"} textColor={"#ffffff"} /> : null}
        </div>
    }

    const PlugConfigInt32 = ({ name, template }) => {
        const [value, setValue] = useState(pluginValue[name])
        return <Grid container >
            <Grid item xs={12}>
                <Typography gutterBottom>
                    {`${name} : ${value}`}
                </Typography>
                <Typography gutterBottom>
                    {`${template["description"]}`}
                </Typography>
                <Grid container spacing={2}>
                    <Grid item xs>
                        <Slider
                            min={template["min"]}
                            max={template["max"]}
                            step={1}
                            value={value}
                            onChange={(_, value) => { setValue(value) }}
                            onChangeCommitted={(_, value) => {
                                setValue(value)
                                setPluginValue(produce(draft => { draft[name] = value }))
                            }}
                        />
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    }


    const PlugConfigBool = ({ name, template }) => {
        return <Grid container >
            <Grid item sx={{ marginTop: "7px" }} >
                <Typography >
                    {`${name} :`}
                </Typography>

            </Grid>

            <Grid item >
                <Switch
                    checked={pluginValue[name]}
                    onChange={() => {
                        setPluginValue(produce(draft => { draft[name] = !draft[name] }))
                    }}
                />
            </Grid>
            <Grid item xs={12} >
                <Typography >
                    {`${template["description"]}`}
                </Typography>

            </Grid>
        </Grid >
    }


    const PlugConfigString = ({ name, template }) => {
        const [value, setValue] = useState(pluginValue[name])
        return <Grid container >
            <Grid item sx={{ marginTop: "7px" }}>
                <Typography gutterBottom>
                    {`${name} : `}
                </Typography>
            </Grid>
            <Grid item >
                <CostumedInput defaultValue={value} onCommit={(value) => {
                    setValue(value)
                    setPluginValue(produce(draft => { draft[name] = value }))
                }} width="200px" all={true} />
            </Grid>
            <Grid item xs={12} >
                <Typography >
                    {`${template["description"]}`}
                </Typography>

            </Grid>
        </Grid>
    }

    const PlugConfigSelect = ({ name, template }) => {
        const [value, setValue] = useState(pluginValue[name])
        const handleChange = (e) => {
            setValue(e.target.value)
            setPluginValue(produce(draft => { draft[name] = e.target.value }))
        }
        return <Grid container >
            <Grid item sx={{ marginTop: "3px" }}>
                <Typography gutterBottom>
                    {`${name} : `}
                </Typography>
            </Grid>
            <Grid item >
                <FormControl>
                    <InputLabel id={`${value}-select`}></InputLabel>
                    <Select
                        labelId={`${value}-select-label`}
                        value={value}
                        onChange={handleChange}
                        sx={{ height: "30px", }}
                    >
                        {template["values"].map((sel, index) => <MenuItem value={index}>{sel}</MenuItem>)}
                    </Select>
                </FormControl>
            </Grid>
            <Grid item xs={12} >
                <Typography >
                    {`${template["description"]}`}
                </Typography>
            </Grid>
        </Grid>
    }



    const PluginSettings = ({ props }) => {
        return <Paper sx={{
            width: "370px",
            marginLeft: "10px",
        }}>
            <Grid
                container
                direction="row"
                justifyContent="flex-start"
                alignItems="center"
            >
                <Grid item xs={12} sx={{
                    margin: "10px",
                    height: "30px",
                }}>
                    <a>插件配置</a>

                </Grid>
                <Grid
                    container
                    direction="row"
                    justifyContent="space-evenly"
                    alignItems="center"
                    spacing={"10px"}
                >
                    {
                        Object.keys(pluginConfig).map((confgName, index) => <Grid item xs={12} sx={{
                            marginLeft: "10px",
                            marginRight: "10px",
                            borderTop: "1px dashed #808080"
                        }} >
                            {pluginConfig[confgName]["type"] === "int32" && <PlugConfigInt32 key={`plug_config_of_${confgName}`} name={confgName} template={pluginConfig[confgName]} />}
                            {pluginConfig[confgName]["type"] === "bool" && <PlugConfigBool key={`plug_config_of_${confgName}`} name={confgName} template={pluginConfig[confgName]} />}
                            {pluginConfig[confgName]["type"] === "string" && <PlugConfigString key={`plug_config_of_${confgName}`} name={confgName} template={pluginConfig[confgName]} />}
                            {pluginConfig[confgName]["type"] === "select" && <PlugConfigSelect key={`plug_config_of_${confgName}`} name={confgName} template={pluginConfig[confgName]} />}
                        </Grid>)
                    }
                </Grid>
                <Grid item xs={12} sx={{
                    margin: "10px",
                }}>
                </Grid>
            </Grid>
        </Paper>
    }

    return <div style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#00796B',
    }}>
        <div>{JSON.stringify()}</div>
        <JoystickListener setDowningBtn={(value) => {
            setSelectKEY(value)
        }} />
        <input id="fileInput" type="file" style={{ display: "none" }} accept="image/*" onChange={handleFileChange} ></input>
        <img id="img" src={config["IMG"]} style={{ width: "100vw", left: 0, top: 0 }} onClick={handelImgClick} onLoad={imgLoaded} ></img>
        <DraggableContainer>
            <div
                style={{
                    maxHeight: "80vh",
                    overflowY: "scroll",
                }}
            >
                <Grid
                    container
                    direction="column"
                    justifyContent="flex-start"
                    alignItems="flex-start"
                    spacing={"10px"}
                    sx={{
                        width: "400px",
                        backgroundColor: "#F5F5F5",
                        paddingBottom: "10px",
                        spacing: "0px",
                        paddingTop: "10px",
                    }}
                >
                    <Grid item xs={12}>
                        <OtherSettings />
                    </Grid>
                    <Grid item xs={12}>
                        {Object.keys(pluginConfig).length > 0 && <PluginSettings />}
                    </Grid>

                    {
                        Object.keys(config["KEY_MAPS"]).map((keycode, index) =>
                            <Grid
                                item
                                xs={12}
                                key={keycode}
                            >
                                <Paper
                                    sx={{
                                        width: "370px",
                                        marginLeft: "10px",
                                    }}
                                >
                                    <Paper
                                        sx={{
                                            width: "370px",
                                            marginLeft: "10px",
                                        }}
                                    >
                                        <KeySettingRender
                                            data={{ ...config.KEY_MAPS[keycode], "KEY": keycode }}
                                            setConfig={setConfig}
                                            getDisplayValueX={getDisplayValueX}
                                            getDisplayValueY={getDisplayValueY}
                                            config={config}
                                        />
                                    </Paper>
                                </Grid>)
                        }
                    </Grid>
                </div>
            </DraggableContainer>

            {
                Object.keys(config.KEY_MAPS).map((keycode, index) => <KeyShow key={keycode} data={{ ...config.KEY_MAPS[keycode], "KEY": keycode }} />)
            }
            <WheelShow
                x={getPostionValueX(config.WHEEL.POS[0])}
                y={getPostionValueY(config.WHEEL.POS[1])}
                range={getPostionValueX(config.WHEEL.RANGE)}
                shift_range={config.WHEEL.SHIFT_RANGE_ENABLE ? getPostionValueX(config.WHEEL.SHIFT_RANGE) : 0}
            />
            <ViewShow x={getPostionValueX(config.MOUSE.POS[0])} y={getPostionValueY(config.MOUSE.POS[1])} />
            <input id="fileInput" type="file" style={{ display: "none" }} accept="image/*" onChange={handleFileChange} ></input>

        </div>
    );
}
