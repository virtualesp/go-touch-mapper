/*
  ESP32-S3 Dual-touch HID (Android compatible) controlled via Serial
  -----------------------------------------------------------------
  - Supports exactly 2 touch points (dual-finger)
  - HID descriptor declares 2 logical Finger collections so Android recognizes
    two simultaneous touch points.
  - Report layout: [Finger1(6 bytes)] [Finger2(6 bytes)] [ContactCount(1 byte)] = 13 bytes
  Serial protocol (ASCII, newline-terminated):
    F1:x,y,s;F2:x,y,s
    - Fi is finger index 1..2
    - x,y are coordinates in 0..32767 (matches descriptor Logical Max)
    - s: 0 = up, 1 = down
    Example: F1:500,1000,1;F2:600,1100,1
  Notes:
    - This file is a single .ino sketch for ESP32-S3 using TinyUSB-style USB.h/USBHID.h APIs.
    - Make sure the board supports USB device (ESP32-S3) and TinyUSB.
*/
#include "USB.h"
#include "USBHID.h"
#include <string.h>
USBHID HID;
// Each finger uses 6 bytes: 1 byte (TipSwitch + padding), 1 byte Contact ID, 2 bytes X, 2 bytes Y
#define BYTES_PER_FINGER 6
#define MAX_FINGERS 10
#define DEBUG 1

struct RecTouchReport
{
    uint8_t action; // 状态字节（按下/移动/抬起/重置屏幕尺寸）
    uint8_t id;     // 触点ID
    uint32_t x;     // X坐标（小端序）
    uint32_t y;     // Y坐标（小端序）
    uint8_t activeFingers;
};

RecTouchReport data;

static uint8_t report_descriptor[] = {
    0x05, 0x0D, // Usage Page (Digitizer)
    0x09, 0x04, // Usage (Touch Screen)
    0xA1, 0x01, // Collection (Application)
    // Finger 1
    0x09, 0x22, //   Usage (Finger)
    0xA1, 0x02, //   Collection (Logical)
    0x09, 0x42, //     Usage (Tip Switch)
    0x15, 0x00, //     Logical Minimum (0)
    0x25, 0x10, //     Logical Maximum (1)
    0x75, 0x01, //     Report Size (1)
    0x95, 0x01, //     Report Count (1)
    0x81, 0x02, //     Input (Data,Var,Abs)
    0x95, 0x07, //     Report Count (7) - padding to full byte
    0x81, 0x03, //     Input (Const,Var,Abs)
    0x09, 0x51, //     Usage (Contact Identifier)
    0x75, 0x08, //     Report Size (8)
    0x95, 0x01, //     Report Count (1)
    0x81, 0x02, //     Input (Data,Var,Abs)
    0x05, 0x01, //     Usage Page (Generic Desktop)
    // X
    0x09, 0x30,                             // Usage (X)
    0x15, 0x00,                             // Logical Minimum (0)
    0x27, /*41 ->*/ 0x00, 0xA0, 0x05, 0x00, // Logical Maximum (1440 << 8)
    0x75, 0x20,                             // Report Size (32)
    0x95, 0x01,                             // Report Count (1)
    0x81, 0x02,                             // Input (Data,Var,Abs)
    // Y
    0x09, 0x31,                             // Usage (Y)
    0x15, 0x00,                             // Logical Minimum (0)
    0x27, /*56 ->*/ 0x00, 0x80, 0x0C, 0x00, // Logical Maximum (3200 << 8)
    0x75, 0x20,                             // Report Size (32)
    0x95, 0x01,
    0x81, 0x02,
    0xC0, //   End Collection
    // Contact Count
    0x05, 0x0D, // Usage Page (Digitizer)
    0x09, 0x54, // Usage (Contact Count)
    0x25, 0x02, // Logical Maximum (2)
    0x75, 0x08, // Report Size (8)
    0x95, 0x01, // Report Count (1)
    0x81, 0x02, // Input (Data,Var,Abs)
    0xC0        // End Collection (Application)
};
class CustomHIDDevice : public USBHIDDevice
{
public:
    CustomHIDDevice(void)
    {
        static bool initialized = false;
        if (!initialized)
        {
            initialized = true;
            HID.addDevice(this, sizeof(report_descriptor));
        }
    }
    uint16_t _onGetFeature(uint8_t report_id, uint8_t *buffer, uint16_t len)
    {
        (void)report_id;
        (void)len;
        buffer[0] = 0x0A;
        return 1;
    }
    uint16_t _onGetDescriptor(uint8_t *buffer)
    {
        memcpy(buffer, report_descriptor, sizeof(report_descriptor));
        return sizeof(report_descriptor);
    }
    void begin(void)
    {
        HID.begin();
    }
    bool send(uint8_t *value, uint16_t len)
    {
        return HID.SendReport(0, value, len);
    }
};
CustomHIDDevice Device;

void setup()
{
    Serial.setRxBufferSize(2048); // 将接收缓冲区增加到1KB
    Serial.begin(2000000);
    delay(10);
    Serial.println("ESP32-S3 Dual-touch HID starting...");
    Device.begin();
    USB.begin();
    unsigned long start = millis();
    while (!HID.ready() && (millis() - start < 3000))
        delay(10);
    Serial.println("HID ready");
}

#define MAGIC_HEADER 0xF4

static char buf[11];

void loop()
{
    if (Serial.read() == MAGIC_HEADER)
    {
        while (Serial.available() < 11)
        {
        }
        Serial.readBytes(buf, 11);
        if (buf[1] == 0x03)
        { // 初始化屏幕的指令 复用action
         
            unsigned long start = millis();
            while (!HID.ready() && (millis() - start < 3000))
                delay(10);
            Serial.println("HID reinitialized with new dimensions");
            memcpy(&report_descriptor[41], &buf[2], 4);
            memcpy(&report_descriptor[56], &buf[5], 4);
            Device.begin();
            USB.begin();
            start = millis();
            while (!HID.ready() && (millis() - start < 3000))
                delay(10);
            Serial.println("HID ready");
        }
        Device.send((uint8_t *)buf, 11);
        // Serial.printf("%d %d %d %d %d %d %d %d %d %d %d\n", buf[0], buf[1], buf[2], buf[3], buf[4], buf[5], buf[6], buf[7], buf[8], buf[9], buf[10]);
    }
}

// // Report buffer: 2 fingers * 6 bytes + 1 byte contact count = 13
// uint8_t TouchReport[BYTES_PER_FINGER + 1];
// bool fingerStates[MAX_FINGERS] = {false}; // 跟踪每个触点状态
// int activeFingers = 0;                    // 全局变量：当前按下的触点数量
// // helper to set finger data (0-based index)
// void setFinger(int idx, uint32_t x, uint32_t y, bool down)
// {
//     if (idx < 0 || idx >= MAX_FINGERS)
//         return;
//     // 更新触点状态和计数
//     bool wasDown = fingerStates[idx];
//     fingerStates[idx] = down;
//     if (down && !wasDown)
//     {
//         activeFingers++; // 新按下
//     }
//     else if (!down && wasDown)
//     {
//         activeFingers--; // 新抬起
//     }
//     // byte 0: TipSwitch(1bit) + 7 bits padding
//     TouchReport[0] = down ? 0x01 : 0x00;
//     // byte 1: Contact ID
//     TouchReport[1] = idx + 1; // IDs: 1..2

//     // bytes 2-5: X (32-bit, little-endian)
//     TouchReport[2] = (uint8_t)(x & 0xFF);
//     TouchReport[3] = (uint8_t)((x >> 8) & 0xFF);
//     TouchReport[4] = (uint8_t)((x >> 16) & 0xFF);
//     TouchReport[5] = (uint8_t)((x >> 24) & 0xFF);

//     // bytes 6-9: Y (32-bit, little-endian)
//     TouchReport[6] = (uint8_t)(y & 0xFF);
//     TouchReport[7] = (uint8_t)((y >> 8) & 0xFF);
//     TouchReport[8] = (uint8_t)((y >> 16) & 0xFF);
//     TouchReport[9] = (uint8_t)((y >> 24) & 0xFF);

//     // byte 10: Contact Count
//     TouchReport[10] = activeFingers;

//     // 现在一共 11 字节
//     Device.send(TouchReport, 11);
// }
