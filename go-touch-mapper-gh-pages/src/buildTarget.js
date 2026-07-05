export const BUILD_TARGET = __BUILD_TARGET__;
export const BUILD_TARGETS = __BUILD_TARGETS__;

export const IS_GO_BACKEND = BUILD_TARGET === 'go';
export const IS_STATIC_TARGET = BUILD_TARGET === 'static';
export const IS_PICO_TARGET = BUILD_TARGET === 'pico';
