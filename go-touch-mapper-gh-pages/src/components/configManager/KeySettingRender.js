
import React from "react";
import { Grid, FormControl, InputLabel, Select, MenuItem, IconButton } from "@mui/material";
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import { produce } from "immer";
import { Type_click, Type_auto_fire, Type_drag, Type_mult_press } from "./TypeComponents";

const KeySettingRender = ({ data, setConfig, getDisplayValueX, getDisplayValueY, config }) => {
    const isWheel = data["KEY"] === "REL_WHEEL_UP" || data["KEY"] === "REL_WHEEL_DOWN"

    const handleChange = (e) => {
        if (e.target.value === "CLICK") {
            setConfig(produce(draft => {
                if (Object.keys(config["KEY_MAPS"][data["KEY"]]).indexOf("POS") !== -1) {
                    draft.KEY_MAPS[data["KEY"]] = { "TYPE": "CLICK", "POS": config["KEY_MAPS"][data["KEY"]]["POS"], "INTERVAL": [18] }
                } else {
                    draft.KEY_MAPS[data["KEY"]] = { "TYPE": "CLICK", "POS": [0.4, 0.4], "INTERVAL": [18] }
                }
            }))
        } else if (e.target.value === "PRESS") {
            setConfig(produce(draft => {
                if (Object.keys(config["KEY_MAPS"][data["KEY"]]).indexOf("POS") !== -1) {
                    draft.KEY_MAPS[data["KEY"]] = { "TYPE": "PRESS", "POS": config["KEY_MAPS"][data["KEY"]]["POS"] }
                } else {
                    draft.KEY_MAPS[data["KEY"]] = { "TYPE": "PRESS", "POS": [0.4, 0.4] }
                }
            }))
        } else if (e.target.value === "AUTO_FIRE") {
            setConfig(produce(draft => {
                if (Object.keys(config["KEY_MAPS"][data["KEY"]]).indexOf("POS") !== -1) {
                    draft.KEY_MAPS[data["KEY"]] = { "TYPE": "AUTO_FIRE", "POS": config["KEY_MAPS"][data["KEY"]]["POS"], "INTERVAL": [18, 20] }
                } else {
                    draft.KEY_MAPS[data["KEY"]] = { "TYPE": "AUTO_FIRE", "POS": [0.4, 0.4], "INTERVAL": [18, 20] }
                }
            }))
        } else if (e.target.value === "DRAG") {
            setConfig(produce(draft => {
                draft.KEY_MAPS[data["KEY"]] = { "TYPE": "DRAG", "POS_S": [], "INTERVAL": [18] }
            }))
        } else if (e.target.value === "MULT_PRESS") {
            setConfig(produce(draft => {
                draft.KEY_MAPS[data["KEY"]] = { "TYPE": "MULT_PRESS", "POS_S": [], }
            }))
        }
    }

    return <Grid
        container
        direction="column"
        padding="10px"
    >
        <Grid
            container
            direction="row"
            justifyContent="flex-start"
            alignItems="center"
        >
            {
                data["TYPE"] === "PRESS" || data["TYPE"] === "AUTO_FIRE" || data["TYPE"] === "CLICK" ?
                    <Grid item xs={5}><a>{`${data["KEY"]} : (${getDisplayValueX(data["POS"][0])} , ${getDisplayValueY(data["POS"][1])})`}</a></Grid> :
                    <Grid item xs={5}><a>{`${data["KEY"]} `}</a></Grid>
            }
            <Grid item xs={5}>
                <FormControl>
                    <InputLabel id={`${data["KEY"]}-select`}></InputLabel>
                    <Select
                        labelId={`${data["KEY"]}-select-label`}
                        value={data["TYPE"]}
                        onChange={handleChange}
                        sx={{ height: "30px", }}
                    >
                        {!isWheel && <MenuItem value={"PRESS"}>同步按下释放</MenuItem>}
                        <MenuItem value={"CLICK"}>单次点击</MenuItem>
                        {!isWheel && <MenuItem value={"AUTO_FIRE"}>连发</MenuItem>}
                        <MenuItem value={"DRAG"}>滑动</MenuItem>
                        {!isWheel && <MenuItem value={"MULT_PRESS"}>多点触摸</MenuItem>}
                    </Select>
                </FormControl>
            </Grid>
            <Grid item xs={2}>
                <IconButton onClick={() => {
                    setConfig(produce(draft => { delete draft.KEY_MAPS[data["KEY"]] }))
                }}>
                    <HighlightOffIcon />
                </IconButton>
            </Grid>
        </Grid>
        {data["TYPE"] === "CLICK" ? <Type_click data={data} setConfig={setConfig} /> : null}
        {data["TYPE"] === "AUTO_FIRE" ? <Type_auto_fire data={data} setConfig={setConfig} /> : null}
        {data["TYPE"] === "DRAG" ? <Type_drag data={data} setConfig={setConfig} getDisplayValueX={getDisplayValueX} getDisplayValueY={getDisplayValueY} /> : null}
        {data["TYPE"] === "MULT_PRESS" ? <Type_mult_press data={data} setConfig={setConfig} getDisplayValueX={getDisplayValueX} getDisplayValueY={getDisplayValueY} /> : null}

    </Grid>
}

export default KeySettingRender;
