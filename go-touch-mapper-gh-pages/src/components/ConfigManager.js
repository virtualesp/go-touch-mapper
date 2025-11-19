
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
            const event = new CustomEvent('imgOnNoKeyClick', { detail: { x, y } });
            window.dispatchEvent(event);
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
        fetchConfig();
    }, [])

    const KeyShow = ({ data }) => {
        return <div>
            {data["TYPE"] === "PRESS" || data["TYPE"] === "AUTO_FIRE" || data["TYPE"] === "CLICK" ? <FixedIcon x={getPostionValueX(data["POS"][0])} y={getPostionValueY(data["POS"][1])} text={data["KEY"]} /> : null}
            {data["TYPE"] === "MULT_PRESS" ? <GroupFixedIcon pos_s={data["POS_S"].map(([x, y]) => [getPostionValueX(x), getPostionValueY(y)])} text={data["KEY"]} bgColor={"#00796B"} textColor={"#ffffff"} /> : null}
            {data["TYPE"] === "DRAG" ? <GroupFixedIcon pos_s={data["POS_S"].map(([x, y]) => [getPostionValueX(x), getPostionValueY(y)])} text={data["KEY"]} bgColor={"#3F51B5"} textColor={"#ffffff"} /> : null}
        </div>
    }

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            backgroundColor: '#00796B',
        }}>
            <JoystickListener setDowningBtn={setSelectKEY} />
            <input id="fileInput" type="file" style={{ display: "none" }} accept="image/*" onChange={handleFileChange} ></input>
            <img id="img" src={config.IMG} style={{ width: "100vw", left: 0, top: 0 }} onClick={handelImgClick} onLoad={imgLoaded} ></img>
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
                            <OtherSettings
                                config={config}
                                setConfig={setConfig}
                                getRemoteApiImg={getRemoteApiImg}
                                exportJSON={handleExport}
                                exportButtonText={exportButtonText}
                                selectKEY={selectKEY}
                                setSelectKEY={setSelectKEY}
                            />
                        </Grid>
                        {
                            Object.keys(config.KEY_MAPS).map((keycode, index) =>
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
