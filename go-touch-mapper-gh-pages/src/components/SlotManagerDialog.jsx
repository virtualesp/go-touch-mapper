import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Grid,
    Card,
    CardContent,
    Typography,
    Chip,
    IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
    getSlotStatus, activateSlot, setDefaultSlot, deleteSlot, readSlot
} from '../utils/picoApi';

export default function SlotManagerDialog({ open, onClose, onSelectSlot, currentSlotIndex }) {
    const [slotStatus, setSlotStatus] = useState(null);
    const [loading, setLoading] = useState(false);

    const refreshSlotStatus = async () => {
        try {
            setLoading(true);
            const status = await getSlotStatus();
            setSlotStatus(status);
        } catch (err) {
            console.error("获取槽位状态失败:", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (open) {
            refreshSlotStatus();
        }
    }, [open]);

    const handleActivate = async (idx) => {
        try {
            await activateSlot(idx);
            await refreshSlotStatus();
        } catch (err) {
            console.error("激活失败:", err);
            alert(`激活失败: ${err.message}`);
        }
    }

    const handleSetDefault = async (idx) => {
        try {
            await setDefaultSlot(idx);
            await refreshSlotStatus();
        } catch (err) {
            console.error("设置默认失败:", err);
            alert(`设置默认失败: ${err.message}`);
        }
    }

    const handleDelete = async (idx) => {
        if (!confirm(`确定要删除插槽 ${idx + 1} 的配置吗？`)) return;
        try {
            await deleteSlot(idx);
            await refreshSlotStatus();
        } catch (err) {
            console.error("删除失败:", err);
            alert(`删除失败: ${err.message}`);
        }
    }

    const handleSelect = async (idx) => {
        try {
            let slotData;
            const slot = slotStatus.slots[idx];
            if (slot.present) {
                slotData = await readSlot(idx);
            } else {
                // 空槽位，使用默认配置
                slotData = { config: null, name: `slot${idx + 1}` };
            }
            onSelectSlot({ ...slotData, slotIndex: idx });
            onClose();
        } catch (err) {
            console.error("读取配置失败:", err);
            alert(`读取配置失败: ${err.message}`);
        }
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                配置槽位管理
                <IconButton
                    onClick={onClose}
                    sx={{ position: 'absolute', right: 8, top: 8 }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    {loading ? (
                        Array.from({ length: 9 }).map((_, idx) => (
                            <Grid item xs={12} sm={6} md={4} key={idx}>
                                <Card>
                                    <CardContent>
                                        <Typography>加载中...</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))
                    ) : slotStatus ? (
                        slotStatus.slots.map((slot, idx) => (
                            <Grid item xs={12} sm={6} md={4} key={idx}>
                                <Card
                                    sx={{
                                        border: idx === slotStatus.current ? '2px solid #4caf50' : '1px solid #e0e0e0',
                                        bgcolor: slot.present ? '#fafafa' : '#f5f5f5',
                                        opacity: slot.present ? 1 : 0.7
                                    }}
                                >
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            插槽 {idx + 1}
                                            {idx === slotStatus.current && <Chip label="当前" color="success" size="small" sx={{ ml: 1 }} />}
                                            {idx === slotStatus.def && <Chip label="默认" color="warning" size="small" sx={{ ml: 1 }} />}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            {slot.present ? `配置: ${slot.name || '(无名)'}` : '(空)'}
                                        </Typography>
                                        <Grid container spacing={1} direction="column">
                                            <Grid item>
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    fullWidth
                                                    onClick={() => handleSelect(idx)}
                                                    disabled={idx === slotStatus.current && idx === currentSlotIndex}
                                                >
                                                    {slot.present ? '编辑此配置' : '使用此槽位'}
                                                </Button>
                                            </Grid>
                                            {slot.present && (
                                                <>
                                                    <Grid item>
                                                        <Button
                                                            variant="outlined"
                                                            size="small"
                                                            fullWidth
                                                            onClick={() => handleActivate(idx)}
                                                            disabled={idx === slotStatus.current}
                                                        >
                                                            切换为当前
                                                        </Button>
                                                    </Grid>
                                                    <Grid item>
                                                        <Button
                                                            variant="outlined"
                                                            size="small"
                                                            fullWidth
                                                            onClick={() => handleSetDefault(idx)}
                                                            disabled={idx === slotStatus.def}
                                                        >
                                                            设为默认
                                                        </Button>
                                                    </Grid>
                                                    <Grid item>
                                                        <Button
                                                            variant="outlined"
                                                            size="small"
                                                            fullWidth
                                                            color="error"
                                                            onClick={() => handleDelete(idx)}
                                                        >
                                                            删除
                                                        </Button>
                                                    </Grid>
                                                </>
                                            )}
                                        </Grid>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))
                    ) : null}
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>关闭</Button>
                <Button onClick={refreshSlotStatus}>刷新</Button>
            </DialogActions>
        </Dialog>
    )
}
