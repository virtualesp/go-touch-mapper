
import React from 'react';
import { Grid, Button, IconButton } from "@mui/material";
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import { CostumedInput } from "../UIcomponents";
import { produce } from "immer";

export const Type_click = ({ data, setConfig }) => {
    return <div>
        <a>点击时间 : </a>
        <CostumedInput defaultValue={data["INTERVAL"][0]} onCommit={(value) => {
            setConfig(produce(draft => { draft.KEY_MAPS[data["KEY"]].INTERVAL = [value] }))
        }} />
        <a> ms</a>
    </div>
}

export const Type_auto_fire = ({ data, setConfig }) => {
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

export const Type_drag = ({ data, setConfig, getDisplayValueX, getDisplayValueY }) => {
    const waitingForClick = React.useRef(false)
    const [addButtonDisabled, setAddButtonDisabled] = React.useState(false)
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
    React.useEffect(() => {
        window.addEventListener('imgOnNoKeyClick', imgClickListener)
        return () => {
            window.removeEventListener('imgOnNoKeyClick', imgClickListener)
        }
    }, [])

    return <div>
        <Grid container >
            <Grid item xs={6}><a>间隔 : </a>
                <CostumedInput defaultValue={data.INTERVAL[0]} onCommit={(value) => {
                    setConfig(produce(draft => { draft.KEY_MAPS[data["KEY"]].INTERVAL = [value] }))
                }} />
                <a> ms </a></Grid>
            <Grid item xs={6}><Button onClick={readyToAdd} disabled={addButtonDisabled} variant="outlined" sx={{
                height: "30px",
                width: "105px",
            }}  >添加关键点</Button></Grid>
        </Grid>
        {
            data["POS_S"].map((pos, index) => <div key={index} style={{ display: "flex" }}>
                <a>{index}&emsp;{`(${getDisplayValueX(pos[0])} , ${getDisplayValueY(pos[1])})`}</a>
                <IconButton onClick={() => { removeKeyPoint(index) }}>
                    <HighlightOffIcon />
                </IconButton>
            </div>
            )
        }
    </div>
}


export const Type_mult_press = ({ data, setConfig, getDisplayValueX, getDisplayValueY }) => {
    const waitingForClick = React.useRef(false)
    const [addButtonDisabled, setAddButtonDisabled] = React.useState(false)
    const readyToAdd = () => { waitingForClick.current = true; setAddButtonDisabled(true) }

    const addKeyPoint = (x, y) => {
        setConfig(produce(draft => { draft.KEY_MAPS[data["KEY"]].POS_S.push([x, y]) }))
    }

    const removeKeyPoint = (index) => {
        setConfig(produce(draft => { draft.KEY_MAPS[data["KEY"]].POS_S.splice(index, 1) }))
    }

    const imgClickListener = (e) => {
        if (waitingForClick.current) {
            console.log("imgClickListener", e.detail);
            addKeyPoint(e.detail.x, e.detail.y)
            waitingForClick.current = false;
            setAddButtonDisabled(false)
        }
    }
    React.useEffect(() => {
        window.addEventListener('imgOnNoKeyClick', imgClickListener)
        return () => {
            window.removeEventListener('imgOnNoKeyClick', imgClickListener)
        }
    }, [])

    return <div>
        <Grid container >
            <Grid item xs={6}><Button onClick={readyToAdd} disabled={addButtonDisabled} variant="outlined" sx={{
                height: "30px",
                width: "105px",
            }}  >添加触摸点</Button></Grid>
        </Grid>
        {
            data["POS_S"].map((pos, index) => <div key={index} style={{ display: "flex" }}>
                <a>{index}&emsp;{`(${getDisplayValueX(pos[0])} , ${getDisplayValueY(pos[1])})`}</a>
                <IconButton onClick={() => { removeKeyPoint(index) }}>
                    <HighlightOffIcon />
                </IconButton>
            </div>
            )
        }
    </div>
}
