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

// Using macros instead of "magic numbers" improves readability and maintainability.
// These values are byte offsets calculated from the report_descriptor below.
#define REPORT_DESC_MAX_X_OFFSET 41
#define REPORT_DESC_MAX_Y_OFFSET 56

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

static bool DeviceReady = false;

void initDevice()
{
    // CHANGE 2: Create an instance of the CustomHIDDevice class.
    // This check prevents memory leaks if the function is called multiple times.
    if (Device) {
        delete Device;
    }
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
        Serial.println("HID ready.");
        DeviceReady = true;
    }
    else
    {
        Serial.println("HID initialization failed.");
        // Clean up the allocated object if initialization fails
        delete Device;
        Device = nullptr;
        DeviceReady = false;
    }
    delay(1000); // Wait for serial monitor to connect
    Serial.println("ESP32-S3 Touch HID init over");
}

void setup()
{
    Serial.setRxBufferSize(2048); // Increase serial receive buffer size
    Serial.begin(2000000);
    Serial.println("ESP32-S3 Touch HID waiting for CMD_SET_RESOLUTION ");
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
        Serial.printf("BYTES : %d %d %d %d %d %d %d %d %d %d %d\n", serial_buffer[0], serial_buffer[1], serial_buffer[2], serial_buffer[3], serial_buffer[4], serial_buffer[5], serial_buffer[6], serial_buffer[7], serial_buffer[8], serial_buffer[9], serial_buffer[10]);

        // BUG FIX: Changed assignment '=' to comparison '==' and simplified logic to '!DeviceReady'
        if (serial_buffer[0] == CMD_SET_RESOLUTION && !DeviceReady)
        {
            // If it's a command to set the resolution
            uint32_t newMaxX, newMaxY;
            memcpy(&newMaxX, &serial_buffer[1], sizeof(uint32_t));
            memcpy(&newMaxY, &serial_buffer[5], sizeof(uint32_t));
            Serial.println("...");
            Serial.printf("INFO: set HID resolution: %u,%u\n", newMaxX, newMaxY);

            // Update the report descriptor with the new resolution
            memcpy(&report_descriptor[REPORT_DESC_MAX_X_OFFSET], &serial_buffer[1], sizeof(uint32_t));
            memcpy(&report_descriptor[REPORT_DESC_MAX_Y_OFFSET], &serial_buffer[5], sizeof(uint32_t));

            delay(100); // Short delay to ensure serial messages are sent
            initDevice(); // Now, initialize the device with the new descriptor
        }
        else
        {
            // If it's a touch data report
            // CHANGE 3: Check if the Device pointer is valid and ready before sending a report.
            if (DeviceReady && Device)
            {
                // Use the -> operator to call the method.
                Device->send(serial_buffer, SERIAL_BUFFER_SIZE);
            }
        }
    }
}
