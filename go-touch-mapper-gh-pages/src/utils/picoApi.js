
const TOUCH_MAX = 0x7FFFFFFE;
const LINUX_2_HID = {
  30: 4, 48: 5, 46: 6, 32: 7, 18: 8, 33: 9, 34: 10, 35: 11, 23: 12, 36: 13, 37: 14, 38: 15,
  50: 16, 49: 17, 24: 18, 25: 19, 16: 20, 19: 21, 31: 22, 20: 23, 22: 24, 47: 25, 17: 26, 45: 27,
  21: 28, 44: 29, 2: 30, 3: 31, 4: 32, 5: 33, 6: 34, 7: 35, 8: 36, 9: 37, 10: 38, 11: 39, 28: 40,
  1: 41, 14: 42, 15: 43, 57: 44, 12: 45, 13: 46, 26: 47, 27: 48, 43: 49, 39: 51, 40: 52, 41: 53,
  51: 54, 52: 55, 53: 56, 58: 57, 59: 58, 60: 59, 61: 60, 62: 61, 63: 62, 64: 63, 65: 64, 66: 65,
  67: 66, 68: 67, 87: 68, 88: 69, 99: 70, 70: 71, 119: 72, 110: 73, 102: 74, 104: 75, 111: 76,
  107: 77, 109: 78, 106: 79, 105: 80, 108: 81, 103: 82, 69: 83, 98: 84, 55: 85, 74: 86, 78: 87,
  96: 88, 79: 89, 80: 90, 81: 91, 75: 92, 76: 93, 77: 94, 71: 95, 72: 96, 73: 97, 82: 98, 83: 99,
  86: 100, 127: 101, 29: 224, 42: 225, 56: 226, 125: 227, 97: 228, 54: 229, 100: 230, 126: 232,
};
const NAME_2_LINUX = {
  'KEY_RESERVED': 0, 'KEY_ESC': 1, 'KEY_1': 2, 'KEY_2': 3, 'KEY_3': 4, 'KEY_4': 5, 'KEY_5': 6,
  'KEY_6': 7, 'KEY_7': 8, 'KEY_8': 9, 'KEY_9': 10, 'KEY_0': 11, 'KEY_MINUS': 12, 'KEY_EQUAL': 13,
  'KEY_BACKSPACE': 14, 'KEY_TAB': 15, 'KEY_Q': 16, 'KEY_W': 17, 'KEY_E': 18, 'KEY_R': 19, 'KEY_T': 20,
  'KEY_Y': 21, 'KEY_U': 22, 'KEY_I': 23, 'KEY_O': 24, 'KEY_P': 25, 'KEY_LEFTBRACE': 26, 'KEY_RIGHTBRACE': 27,
  'KEY_ENTER': 28, 'KEY_LEFTCTRL': 29, 'KEY_A': 30, 'KEY_S': 31, 'KEY_D': 32, 'KEY_F': 33, 'KEY_G': 34,
  'KEY_H': 35, 'KEY_J': 36, 'KEY_K': 37, 'KEY_L': 38, 'KEY_SEMICOLON': 39, 'KEY_APOSTROPHE': 40,
  'KEY_GRAVE': 41, 'KEY_LEFTSHIFT': 42, 'KEY_BACKSLASH': 43, 'KEY_Z': 44, 'KEY_X': 45, 'KEY_C': 46,
  'KEY_V': 47, 'KEY_B': 48, 'KEY_N': 49, 'KEY_M': 50, 'KEY_COMMA': 51, 'KEY_DOT': 52, 'KEY_SLASH': 53,
  'KEY_RIGHTSHIFT': 54, 'KEY_KPASTERISK': 55, 'KEY_LEFTALT': 56, 'KEY_SPACE': 57, 'KEY_CAPSLOCK': 58,
  'KEY_F1': 59, 'KEY_F2': 60, 'KEY_F3': 61, 'KEY_F4': 62, 'KEY_F5': 63, 'KEY_F6': 64, 'KEY_F7': 65,
  'KEY_F8': 66, 'KEY_F9': 67, 'KEY_F10': 68, 'KEY_NUMLOCK': 69, 'KEY_SCROLLLOCK': 70,
  'KEY_KP7': 71, 'KEY_KP8': 72, 'KEY_KP9': 73, 'KEY_KPMINUS': 74, 'KEY_KP4': 75, 'KEY_KP5': 76,
  'KEY_KP6': 77, 'KEY_KPPLUS': 78, 'KEY_KP1': 79, 'KEY_KP2': 80, 'KEY_KP3': 81, 'KEY_KP0': 82,
  'KEY_KPDOT': 83, 'KEY_102ND': 86, 'KEY_F11': 87, 'KEY_F12': 88, 'KEY_KPENTER': 96, 'KEY_RIGHTCTRL': 97,
  'KEY_KPSLASH': 98, 'KEY_SYSRQ': 99, 'KEY_RIGHTALT': 100, 'KEY_HOME': 102, 'KEY_UP': 103,
  'KEY_PAGEUP': 104, 'KEY_LEFT': 105, 'KEY_RIGHT': 106, 'KEY_END': 107, 'KEY_DOWN': 108,
  'KEY_PAGEDOWN': 109, 'KEY_INSERT': 110, 'KEY_DELETE': 111, 'KEY_MUTE': 113, 'KEY_VOLUMEDOWN': 114,
  'KEY_VOLUMEUP': 115, 'KEY_LEFTMETA': 125, 'KEY_RIGHTMETA': 126, 'KEY_COMPOSE': 127,
};
const FRIENDLY_NAME_2_HID = {};
for (const [name, linux] of Object.entries(NAME_2_LINUX)) {
  if (LINUX_2_HID[linux] !== undefined) FRIENDLY_NAME_2_HID[name] = LINUX_2_HID[linux];
}
const MOUSE_BUTTONS = { 'BTN_LEFT': 0, 'BTN_RIGHT': 1, 'BTN_MIDDLE': 2, 'BTN_BACK': 3, 'BTN_FORWARD': 4 };
const MOUSE_BUTTONS_REV = Object.fromEntries(Object.entries(MOUSE_BUTTONS).map(([k, v]) => [v, k]));
const MOD_KEYS = {
  'KEY_LEFTCTRL': 0, 'KEY_LEFTSHIFT': 1, 'KEY_LEFTALT': 2, 'KEY_LEFTMETA': 3,
  'KEY_RIGHTCTRL': 4, 'KEY_RIGHTSHIFT': 5, 'KEY_RIGHTALT': 6, 'KEY_RIGHTMETA': 7
};
const MOD_KEYS_REV = Object.fromEntries(Object.entries(MOD_KEYS).map(([k, v]) => [v, k]));
const KEYCODES_REV = Object.fromEntries(
  Object.entries(FRIENDLY_NAME_2_HID)
    .filter(([k]) => MOD_KEYS[k] === undefined)
    .map(([k, v]) => [v, k])
);
const TYPES = { 'PRESS': 0, 'MULT_PRESS': 1, 'SMART_TOGGLE': 2, 'WHEEL': 3, 'CLICK': 4, 'AUTO_FIRE': 5, 'DRAG': 6 };
const TYPES_REV = Object.fromEntries(Object.entries(TYPES).map(([k, v]) => [v, k]));
const FLAG_RELEASE_MOUSE = 1 << 0;
const FLAG_SEPARAT = 1 << 1;
const FLAG_TOUCH = 1 << 2;
const f2i = v => Math.round(v * TOUCH_MAX);
const i2f = v => v / TOUCH_MAX;

const enc = new TextEncoder();
const dec = new TextDecoder();

export function bytesToJson(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let o = 0;

  const u8 = () => dv.getUint8(o++);
  const u16 = () => { const v = dv.getUint16(o, true); o += 2; return v; };
  const u32 = () => { const v = dv.getUint32(o, true); o += 4; return v; };
  const f32 = () => { const v = dv.getFloat32(o, true); o += 4; return v; };

  const mouse = { POS: [0, 0], RANGE: 0, SPEED: [0, 0], SWITCH_KEYS: [] };
  mouse.POS[0] = i2f(u32());
  mouse.POS[1] = i2f(u32());
  mouse.RANGE = f32();
  mouse.SPEED[0] = f32();
  mouse.SPEED[1] = f32();
  const swCnt = u8();
  for (let i = 0; i < 4; i++) {
    const v = u8();
    if (i < swCnt) mouse.SWITCH_KEYS.push(KEYCODES_REV[v] || `0x${v.toString(16)}`);
  }
  o += 1;

  const screen = { SIZE: [0, 0] };
  screen.SIZE[0] = u16();
  screen.SIZE[1] = u16();
  o += 2;

  const wheel = { POS: [0, 0], RANGE: 0, SHIFT_RANGE: 0, SHIFT_RANGE_ENABLE: false, SHIFT_RANGE_SWITCH_ENABLE: false, WASD: ['KEY_W', 'KEY_A', 'KEY_S', 'KEY_D'] };
  wheel.POS[0] = i2f(u32());
  wheel.POS[1] = i2f(u32());
  wheel.RANGE = f32();
  wheel.SHIFT_RANGE = f32();
  const wb = u8();
  wheel.SHIFT_RANGE_ENABLE = !!(wb & 1);
  wheel.SHIFT_RANGE_SWITCH_ENABLE = !!(wb & 2);
  o += 3;

  const keyMaps = {};

  function readEntries(count, nameFn) {
    for (let i = 0; i < count; i++) {
      const code = u8();
      const type = u8();
      const flags = u8();
      const posCount = u8();
      o += 2;

      const name = nameFn(code);
      const km = { TYPE: TYPES_REV[type] || 'PRESS' };
      if (flags & FLAG_RELEASE_MOUSE) km.RELEASE_MOUSE = true;
      if (flags & FLAG_SEPARAT) km.SEPARAT = true;
      if (flags & FLAG_TOUCH) km.TOUCH = true;

      if (posCount === 1) {
        km.POS = [i2f(u32()), i2f(u32())];
      } else if (posCount > 1) {
        km.POS_S = [];
        for (let j = 0; j < posCount; j++) {
          km.POS_S.push([i2f(u32()), i2f(u32())]);
        }
      }

      const typeName = TYPES_REV[type];
      if (typeName === 'CLICK' || typeName === 'DRAG') {
        km.INTERVAL = [u16()];
      } else if (typeName === 'AUTO_FIRE') {
        km.INTERVAL = [u16(), u16()];
      }

      keyMaps[name] = km;
    }
  }

  const mouseCount = u8();
  readEntries(mouseCount, code => MOUSE_BUTTONS_REV[code] || `BTN_${code}`);

  const modCount = u8();
  readEntries(modCount, code => MOD_KEYS_REV[code] || `MOD_${code}`);

  const keyCount = u8();
  readEntries(keyCount, code => KEYCODES_REV[code] || `0x${code.toString(16)}`);

  return { IMG: '', KEY_MAPS: keyMaps, MOUSE: mouse, SCREEN: screen, WHEEL: wheel };
}

export function jsonToBytes(config) {
  const buf = new Uint8Array(4096);
  const dv = new DataView(buf.buffer);
  let o = 0;
  const u8 = v => { buf[o] = v & 0xff; return o + 1; };
  const u16 = v => { dv.setUint16(o, v, true); return o + 2; };
  const u32 = v => { dv.setUint32(o, v >>> 0, true); return o + 4; };
  const f32 = v => { dv.setFloat32(o, v, true); return o + 4; };
  const m = config.MOUSE;
  if (m.SWITCH_KEYS.length > 4) throw new Error('SWITCH_KEYS 最多 4 个');
  o = u32(f2i(m.POS[0])); o = u32(f2i(m.POS[1])); o = f32(m.RANGE);
  o = f32(m.SPEED[0]); o = f32(m.SPEED[1]);
  o = u8(m.SWITCH_KEYS.length);
  for (let i = 0; i < 4; i++) { const k = m.SWITCH_KEYS[i]; o = u8(k ? (FRIENDLY_NAME_2_HID[k] || 0) : 0); }
  o = u8(0);
  o = u16(config.SCREEN.SIZE[0]); o = u16(config.SCREEN.SIZE[1]); o = u16(0);
  const w = config.WHEEL;
  o = u32(f2i(w.POS[0])); o = u32(f2i(w.POS[1])); o = f32(w.RANGE); o = f32(w.SHIFT_RANGE);
  let wb = 0; if (w.SHIFT_RANGE_ENABLE) wb |= 1; if (w.SHIFT_RANGE_SWITCH_ENABLE) wb |= 2;
  o = u8(wb); o = u8(0); o = u16(0);
  const me = [], de = [], ke = [];
  for (const [name, km] of Object.entries(config.KEY_MAPS)) {
    if (MOUSE_BUTTONS[name] !== undefined) me.push([name, km]);
    else if (MOD_KEYS[name] !== undefined) de.push([name, km]);
    else ke.push([name, km]);
  }
  me.sort((a, b) => MOUSE_BUTTONS[a[0]] - MOUSE_BUTTONS[b[0]]);
  de.sort((a, b) => MOD_KEYS[a[0]] - MOD_KEYS[b[0]]);
  ke.sort((a, b) => (FRIENDLY_NAME_2_HID[a[0]] || 0) - (FRIENDLY_NAME_2_HID[b[0]] || 0));
  function wr(entries, codeFn) {
    o = u8(entries.length);
    for (const [name, km] of entries) {
      const positions = km.POS ? [km.POS] : (km.POS_S || []);
      const interval = km.INTERVAL || [];
      o = u8(codeFn(name)); o = u8(TYPES[km.TYPE] || 0);
      let fl = 0; if (km.RELEASE_MOUSE) fl |= FLAG_RELEASE_MOUSE; if (km.SEPARAT) fl |= FLAG_SEPARAT; if (km.TOUCH) fl |= FLAG_TOUCH;
      o = u8(fl); o = u8(positions.length); o = u16(0);
      for (const p of positions) { o = u32(f2i(p[0])); o = u32(f2i(p[1])); }
      for (const ms of interval) o = u16(ms);
    }
  }
  wr(me, n => MOUSE_BUTTONS[n]);
  wr(de, n => MOD_KEYS[n]);
  wr(ke, n => FRIENDLY_NAME_2_HID[n] || 0);
  return buf.slice(0, o);
}

async function postRaw(path, body) {
  const r = await fetch(path, { method: 'POST', body: body || new Uint8Array() });
  return r;
}

export async function getSlotStatus() {
  const r = await postRaw('/slot/status');
  const buf = new Uint8Array(await r.arrayBuffer());
  const current = buf[0], def = buf[1];
  const slots = [];
  let p = 2;
  for (let i = 0; i < 9; i++) {
    const present = buf[p++], nl = buf[p++];
    const name = dec.decode(buf.slice(p, p + nl)); p += nl;
    slots.push({ present: !!present, name });
  }
  return { current, def, slots };
}

export async function uploadToSlot(idx, config, name) {
  const configBytes = jsonToBytes(config);
  const nameBytes = enc.encode(name.trim());
  if (nameBytes.length > 255) {
    throw new Error('名称太长（>255 字节）');
  }
  const env = new Uint8Array(1 + nameBytes.length + configBytes.length);
  env[0] = nameBytes.length;
  env.set(nameBytes, 1);
  env.set(configBytes, 1 + nameBytes.length);
  const r = await postRaw('/slot/upload/' + idx, env);
  if (!r.ok) {
    throw new Error(`上传失败 (HTTP ${r.status})`);
  }
}

export async function activateSlot(idx) {
  const r = await postRaw('/slot/activate/' + idx);
  if (!r.ok) {
    throw new Error(`操作失败 (HTTP ${r.status})`);
  }
}

export async function setDefaultSlot(idx) {
  const r = await postRaw('/slot/default/' + idx);
  if (!r.ok) {
    throw new Error(`操作失败 (HTTP ${r.status})`);
  }
}

export async function deleteSlot(idx) {
  const r = await postRaw('/slot/delete/' + idx);
  if (!r.ok) {
    throw new Error(`删除失败 (HTTP ${r.status})`);
  }
}

export async function readSlot(idx) {
  const r = await postRaw('/slot/read/' + idx);
  if (!r.ok) {
    throw new Error(`读取失败 (HTTP ${r.status})`);
  }
  const buf = new Uint8Array(await r.arrayBuffer());

  if (buf.length < 1) throw new Error('Invalid envelope');
  const nameLen = buf[0];
  if (1 + nameLen > buf.length) throw new Error('Invalid envelope');
  const nameBytes = buf.slice(1, 1 + nameLen);
  const configBytes = buf.slice(1 + nameLen);
  const config = bytesToJson(configBytes);
  const name = dec.decode(nameBytes);

  return { config, name };
}

