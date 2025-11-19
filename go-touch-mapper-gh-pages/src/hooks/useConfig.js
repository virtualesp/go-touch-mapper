
import { useState, useCallback } from "react";
import { produce } from "immer";
import { defaultConfig } from "../constants/defaultConfig";

export const useConfig = () => {
    const [config, setConfig] = useState(defaultConfig);

    const getDisplayValueX = useCallback((value) => {
        return parseInt(value * config.SCREEN.SIZE[0]);
    }, [config.SCREEN.SIZE]);

    const getDisplayValueY = useCallback((value) => {
        return parseInt(value * config.SCREEN.SIZE[1]);
    }, [config.SCREEN.SIZE]);

    const updateConfig = (updater) => {
        setConfig(produce(updater));
    };

    const exportJSON = async () => {
        try {
            const response = await fetch('/configure/set', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            return await response.text();
        } catch (error) {
            return String(error);
        }
    };

    const fetchConfig = async () => {
        try {
            const response = await fetch("/configure/get");
            const data = await response.json();
            setConfig(data);
        } catch (error) {
            console.log(error);
        }
    };


    return {
        config,
        updateConfig,
        getDisplayValueX,
        getDisplayValueY,
        exportJSON,
        fetchConfig,
        setConfig,
    };
};
