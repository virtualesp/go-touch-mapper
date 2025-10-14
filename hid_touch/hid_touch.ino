/*
 * ESP32-S3 HID Touchscreen (Android/Windows compatible)
 * -----------------------------------------------------------------
 * - This version initializes the HID device as a pointer (nullptr)
 * and creates the instance dynamically within the initDevice() function.
 * - Supports dynamic resolution changes via Serial command.
 * - HID descriptor declares a single touch contact report.
 * - Serial protocol for touch reports (binary):
 * - Header: 0xF4
 * - Report: 11 bytes matching the HID descriptor structure.
 * - Serial protocol for resolution change (binary):
 * - Header: 0xF4
 * - Command byte: 0x03
 * - New Max X: 4 bytes, little-endian (uint32_t)
 * - New Max Y: 4 bytes, little-endian (uint32_t)
 */
#include "USB.h"
#include "USBHID.h"
#include <string.h>
#include <Preferences.h> // 用于访问非易失性存储
// Using macros instead of "magic numbers" improves readability and maintainability.
// These values are byte offsets calculated from the report_descriptor below.
#define REPORT_DESC_MAX_X_OFFSET 41
#define REPORT_DESC_MAX_Y_OFFSET 56

Preferences preferences;
USBHID HID;

// HID Report Descriptor
// Defines a touchscreen device with information for one touch point (status, ID, X/Y coordinates)
// and the total number of contacts.

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

// CHANGE 1: The global device object is now a pointer, initialized to nullptr.
CustomHIDDevice *Device = nullptr;

// Serial communication protocol definitions
#define MAGIC_HEADER 0xF4
#define CMD_SET_RESOLUTION 0x03
#define SERIAL_BUFFER_SIZE 11

bool setNVS(uint32_t maxX, uint32_t maxY) // return true if need restart
{
    bool flag = true;
    preferences.begin("hid_config", false);
    if (preferences.isKey("maxX") && preferences.isKey("maxY"))
    {
        const uint32_t DEFAULT_MAX_X = 1440 << 8;
        const uint32_t DEFAULT_MAX_Y = 3200 << 8;
        uint32_t oldMaxX = preferences.getUInt("maxX", DEFAULT_MAX_X);
        uint32_t oldMaxY = preferences.getUInt("maxY", DEFAULT_MAX_Y);
        if (oldMaxX == maxX && oldMaxY == maxY)
        {
            flag = false;
        }
        else
        {
            preferences.putUInt("maxX", maxX);
            preferences.putUInt("maxY", maxY);
        }
    }
    else
    {
        preferences.putUInt("maxX", maxX);
        preferences.putUInt("maxY", maxY);
    }
    preferences.end();
    return flag;
}

void setResolutionFromNVS()
{
    preferences.begin("hid_config", false); // false 表示读写模式
    const uint32_t DEFAULT_MAX_X = 1440 << 8;
    const uint32_t DEFAULT_MAX_Y = 3200 << 8;
    uint32_t maxX = preferences.getUInt("maxX", DEFAULT_MAX_X);
    uint32_t maxY = preferences.getUInt("maxY", DEFAULT_MAX_Y);
    preferences.end();
    Serial.printf("INFO: using saved HID resolution: %u,%u\n", maxX, maxY);
    memcpy(&report_descriptor[REPORT_DESC_MAX_X_OFFSET], &maxX, sizeof(uint32_t));
    memcpy(&report_descriptor[REPORT_DESC_MAX_Y_OFFSET], &maxY, sizeof(uint32_t));
}

void initDevice()
{
    // CHANGE 2: Create an instance of the CustomHIDDevice class.
    // This check prevents memory leaks if the function is called multiple times.
    if (Device)
    {
        delete Device;
    }
    setResolutionFromNVS();
    Device = new CustomHIDDevice();

    // Use the -> operator to access members of the object via its pointer.
    Device->begin();
    USB.begin();

    unsigned long start = millis();
    while (!HID.ready() && (millis() - start < 3000))
    {
        delay(10);
    }

    if (HID.ready())
    {
        Serial.println("INFO: HID ready.");
    }
    else
    {
        Serial.println("ERROR: HID initialization failed.");
        delete Device;
        Device = nullptr;
    }
    delay(1000); // Wait for serial monitor to connect
    Serial.println("INFO: HID Touch init over");
}

void setup()
{
    Serial.setRxBufferSize(2048); // Increase serial receive buffer size
    Serial.begin(2000000);
    Serial.println("\n\nINFO: Device initialization");
    initDevice(); // Now, initialize the device with the new descriptor
}

static uint8_t serial_buffer[SERIAL_BUFFER_SIZE];
void loop()
{
    // Check if there is data in the serial buffer and if it starts with the magic header byte
    if (Serial.available() > 0 && Serial.read() == MAGIC_HEADER)
    {
        // Wait until the complete 11-byte packet is received
        while (Serial.available() < SERIAL_BUFFER_SIZE)
        {
            // You can add a timeout here if needed
        }
        Serial.readBytes(serial_buffer, SERIAL_BUFFER_SIZE);
        // Serial.printf("BYTES : %d %d %d %d %d %d %d %d %d %d %d\n", serial_buffer[0], serial_buffer[1], serial_buffer[2], serial_buffer[3], serial_buffer[4], serial_buffer[5], serial_buffer[6], serial_buffer[7], serial_buffer[8], serial_buffer[9], serial_buffer[10]);

        if (serial_buffer[0] == CMD_SET_RESOLUTION)
        {
            // If it's a command to set the resolution
            uint32_t newMaxX, newMaxY;
            memcpy(&newMaxX, &serial_buffer[1], sizeof(uint32_t));
            memcpy(&newMaxY, &serial_buffer[5], sizeof(uint32_t));
            if (setNVS(newMaxX, newMaxY))
            {
                Serial.printf("INFO: set HID resolution: %u,%u The device is restarting... \n", newMaxX, newMaxY);
                delay(100);
                ESP.restart();
            }
        }
        else
        {
            // If it's a touch data report
            // CHANGE 3: Check if the Device pointer is valid and ready before sending a report.
            if (Device)
            {
                // Use the -> operator to call the method.
                Device->send(serial_buffer, SERIAL_BUFFER_SIZE);
            }
        }
    }
}
