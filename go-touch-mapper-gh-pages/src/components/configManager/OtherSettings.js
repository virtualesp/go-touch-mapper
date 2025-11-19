
import React, { useRef, useState, useEffect } from "react";
import { Button, Grid, IconButton, Paper, Slider, Switch, Typography } from "@mui/material";
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import { CostumedInput } from "../UIcomponents";
import { produce } from "immer";

const OtherSettings = ({ config, setConfig, getRemoteApiImg, exportJSON, exportButtonText, selectKEY, setSelectKEY }) => {
    const wheelPosSelecting = useRef(false);
    const [range, setRange] = useState(config.WHEEL.RANGE * 100);
    const [shiftRange, setShiftRange] = useState(config.WHEEL.SHIFT_RANGE * 100);
    const [setPosButtonDisabled, setSetPosButtonDisabled] = useState(false);
    const viewCenterSetting = useRef(false);
    const addingSwitchKey = useRef(false);
    const [addingSwitchKeyInfoText, setAddingSwitchKeyInfoText] = useState("添加映射切换键");


    const readyToSetPos = () => {
        wheelPosSelecting.current = true;
        setSetPosButtonDisabled(true);
    };

    const imgClickListener = (e) => {
        if (wheelPosSelecting.current) {
            setConfig(produce(draft => { draft.WHEEL.POS = [e.detail.x, e.detail.y] }));
            wheelPosSelecting.current = false;
            setSetPosButtonDisabled(false);
        }
    };

    useEffect(() => {
        window.addEventListener('imgOnNoKeyClick', imgClickListener);
        return () => {
            window.removeEventListener('imgOnNoKeyClick', imgClickListener);
        };
    }, []);


    return (
        <Paper sx={{
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
                    <CostumedInput defaultValue={config.MOUSE.SPEED[0]} onCommit={(value) => {
                        setConfig(produce(draft => { draft.MOUSE.SPEED[0] = value; }))
                    }} width="40px" />
                    <a> &emsp;纵向 : </a>
                    <CostumedInput defaultValue={config.MOUSE.SPEED[1]} onCommit={(value) => {
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
                        <a>{`视角中心位置:(${parseInt(config.MOUSE.POS[0] * config.SCREEN.SIZE[0])} , ${parseInt(config.MOUSE.POS[1] * config.SCREEN.SIZE[1])})`} </a>
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
                    {config.MOUSE.SWITCH_KEYS.map((key, index) => {
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
                    <a>{`左摇杆中心位置:(${parseInt(config.WHEEL.POS[0] * config.SCREEN.SIZE[0])} , ${parseInt(config.WHEEL.POS[1] * config.SCREEN.SIZE[1])})`} </a>
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
                        {config.WHEEL.SHIFT_RANGE_ENABLE ? "启用shift轮盘" : "禁用shift轮盘"}
                    </Typography>
                    <Switch
                        checked={config.WHEEL.SHIFT_RANGE_ENABLE}
                        onChange={() => {
                            setConfig(produce(draft => { draft.WHEEL.SHIFT_RANGE_ENABLE = !draft.WHEEL.SHIFT_RANGE_ENABLE; }))
                        }}
                    />

                    <Typography gutterBottom>
                        {config.WHEEL.SHIFT_RANGE_SWITCH_ENABLE ? "shift切换模式" : "shift长按模式"}
                    </Typography>
                    <Switch
                        checked={config.WHEEL.SHIFT_RANGE_SWITCH_ENABLE}
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
    );
};

export default OtherSettings;
