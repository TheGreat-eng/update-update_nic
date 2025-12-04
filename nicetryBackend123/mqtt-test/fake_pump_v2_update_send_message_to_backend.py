#!/usr/bin/env python3
"""
Fake Pump Device - Giả lập máy bơm (Đã fix lỗi tự tắt và Ctrl+C)
"""

import paho.mqtt.client as mqtt
import json
import time
from datetime import datetime
import random
import threading  # <--- Cần thêm thư viện này để đếm giờ không gây treo

BROKER = "localhost"
PORT = 1883
DEVICE_ID = "PUMP-0001"
UNIQUE_CLIENT_ID = f"fake-pump-{DEVICE_ID}-{random.randint(1000, 9999)}"

pump_state = "OFF"
off_timer = None # Biến lưu timer đếm ngược

# Hàm gửi trạng thái về backend (để tái sử dụng code)
def publish_status(client, state, status="ONLINE", note=""):
    feedback = {
        "deviceId": DEVICE_ID,
        "status": status,
        "state": state,
        "timestamp": datetime.now().isoformat(),
        "note": note
    }
    client.publish(f"device/{DEVICE_ID}/status", json.dumps(feedback), retain=True)
    print(f"📤 Đã gửi status: {status} | State: {state} | {note}")

# Hàm này sẽ được gọi khi hết giờ đếm ngược
def auto_turn_off_task(client):
    global pump_state
    pump_state = "OFF"
    print(f"\n⏰ ĐÃ HẾT THỜI GIAN (DURATION) -> TỰ ĐỘNG TẮT")
    publish_status(client, "OFF", "ONLINE", "Auto turned off by timer")

def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        print("✅ Kết nối thành công (API v2)")
        client.subscribe(f"device/{DEVICE_ID}/control")
        # Gửi trạng thái hiện tại khi vừa kết nối
        publish_status(client, pump_state, "ONLINE", "Device Connected")
    else:
        print(f"❌ Kết nối thất bại, mã lỗi: {reason_code}")

def on_message(client, userdata, msg):
    global pump_state, off_timer
    
    try:
        payload = json.loads(msg.payload.decode())
        action = payload.get("action", "").upper()
        
        print(f"\n📨 NHẬN LỆNH: {action}")

        if "TURN_ON" in action or "ON" in action:
            duration = int(payload.get("duration", 60)) # Mặc định 60s
            pump_state = "ON"
            
            # Nếu đang có timer cũ chạy thì hủy nó đi để tính giờ mới
            if off_timer and off_timer.is_alive():
                off_timer.cancel()
                print("⚠️  Đã hủy hẹn giờ cũ, đặt lại giờ mới.")

            publish_status(client, "ON", "ONLINE", f"Turned ON for {duration}s")
            
            # Tạo luồng đếm ngược mới (Non-blocking)
            print(f"⏳ Bắt đầu đếm ngược {duration} giây...")
            off_timer = threading.Timer(duration, auto_turn_off_task, args=[client])
            off_timer.start()
            
        elif "TURN_OFF" in action or "OFF" in action:
            pump_state = "OFF"
            
            # Nếu người dùng tắt thủ công thì hủy timer đếm ngược (nếu có)
            if off_timer and off_timer.is_alive():
                off_timer.cancel()
                print("🛑 Đã hủy bộ đếm giờ do người dùng tắt thủ công.")

            publish_status(client, "OFF", "ONLINE", "Turned OFF manually")
            
    except Exception as e:
        print(f"❌ Lỗi xử lý message: {e}")

# Khởi tạo Client
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=UNIQUE_CLIENT_ID)

# --- TÍNH NĂNG LAST WILL (Di chúc) ---
# Nếu mất kết nối đột ngột (mất điện/mất mạng), Broker sẽ tự đăng tin này
last_will_payload = json.dumps({
    "deviceId": DEVICE_ID,
    "status": "OFFLINE",
    "state": "OFF",
    "timestamp": datetime.now().isoformat(),
    "note": "Unexpected Disconnect"
})
client.will_set(f"device/{DEVICE_ID}/status", last_will_payload, qos=1, retain=True)
# -------------------------------------

client.on_connect = on_connect
client.on_message = on_message

print(f"🔌 FAKE PUMP DEVICE - {DEVICE_ID}")
print(f"🔗 Connecting to {BROKER}...")

try:
    client.connect(BROKER, PORT, 60)
    client.loop_forever()
    
except KeyboardInterrupt:
    print(f"\n\n🚨 PHÁT HIỆN CTRL+C (STOP)")
    
    # 1. Hủy timer nếu đang chạy
    if off_timer and off_timer.is_alive():
        off_timer.cancel()
    
    # 2. Gửi tín hiệu OFF và OFFLINE về server trước khi thoát
    # Lưu ý: Cần dùng client.loop() vài lần để đảm bảo tin nhắn được đẩy đi
    publish_status(client, "OFF", "OFFLINE", "Device stopped by Admin")
    
    # Đợi xíu cho tin nhắn kịp đi
    time.sleep(0.5) 
    
    client.disconnect()
    print("👋 Đã ngắt kết nối an toàn.")

except Exception as e:
    print(f"❌ Lỗi Fatal: {e}")