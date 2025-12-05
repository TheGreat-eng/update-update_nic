#!/usr/bin/env python3
"""
Fake Pump Device - Giả lập máy bơm nhận lệnh MQTT (Đã nâng cấp cho paho-mqtt v2.x)
"""

import paho.mqtt.client as mqtt
import json
import time
from datetime import datetime
import random # Thêm import này


BROKER = "localhost"
PORT = 1883
DEVICE_ID = "PUMP-0001"
UNIQUE_CLIENT_ID = f"fake-pump-{DEVICE_ID}-{random.randint(1000, 9999)}"


pump_state = "OFF"

# <<< BƯỚC 1: SỬA LẠI CHỮ KÝ CỦA CÁC HÀM CALLBACK >>>

# on_connect kiểu mới có 5 tham số
def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        print(" Kết nối thành công (API v2)")
        client.subscribe(f"device/{DEVICE_ID}/control")
        print(f"📡 Đang lắng nghe topic: device/{DEVICE_ID}/control")
        
        feedback = {
            "deviceId": DEVICE_ID,
            "status": "ONLINE",
            "state": pump_state,
            "timestamp": datetime.now().isoformat()
        }
        client.publish(f"device/{DEVICE_ID}/status", json.dumps(feedback))
        print(f" Đã gửi status: ONLINE, state: {pump_state}\n")
    else:
        print(f" Kết nối thất bại, mã lỗi: {reason_code}")

# on_message kiểu mới có 4 tham số
def on_message(client, userdata, msg):
    global pump_state
    print(f"\n{'='*60}")
    print(f"📥 NHẬN LỆNH TỪ BACKEND")
    print(f"{'='*60}")
    print(f"📍 Topic: {msg.topic}")
    
    try:
        payload = json.loads(msg.payload.decode())
        print(f"📦 Payload:")
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        
        action = payload.get("action", "").upper()
        
        if "TURN_ON" in action or "ON" in action:
            duration = payload.get("duration", 60)
            pump_state = "ON"
            print(f"\n BẬT MÁY BƠM")
            print(f"⏱️  Thời gian: {duration} giây")
            
            feedback = {
                "deviceId": DEVICE_ID,
                "status": "ONLINE",
                "state": "ON",
                "duration": duration,
                "timestamp": datetime.now().isoformat()
            }


            # --- THÊM DÒNG NÀY ĐỂ DEBUG ---
            print(f"📦 Đang gửi gói tin: {json.dumps(feedback)}") 
            # ------------------------------


            client.publish(f"device/{DEVICE_ID}/status", json.dumps(feedback))
            print(f" Đã gửi trạng thái: MÁY BƠM ĐANG BẬT\n")
            
        elif "TURN_OFF" in action or "OFF" in action:
            pump_state = "OFF"
            print(f"\n🛑 TẮT MÁY BƠM")
            
            feedback = {
                "deviceId": DEVICE_ID,
                "status": "ONLINE",
                "state": "OFF",
                "timestamp": datetime.now().isoformat()
            }
            # --- THÊM DÒNG NÀY ĐỂ DEBUG ---
            print(f"📦 Đang gửi gói tin: {json.dumps(feedback)}") 
            # ------------------------------
            client.publish(f"device/{DEVICE_ID}/status", json.dumps(feedback))
            print(f" Đã gửi trạng thái: MÁY BƠM ĐÃ TẮT\n")
        else:
            print(f"  Lệnh không xác định: {action}\n")
            
    except Exception as e:
        print(f" Lỗi xử lý message: {e}\n")

# <<< BƯỚC 2: KHỞI TẠO CLIENT VỚI PHIÊN BẢN API v2 >>>
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=UNIQUE_CLIENT_ID)

client.on_connect = on_connect
client.on_message = on_message

print(f"{'='*60}")
print(f" FAKE PUMP DEVICE - {DEVICE_ID}")
print(f"{'='*60}")
print(f"🔗 Đang kết nối tới: {BROKER}:{PORT}...")

try:
    client.connect(BROKER, PORT, 60)
    print(f"⏳ Đang chờ lệnh điều khiển...\n")
    print(f"{'='*60}\n")
    client.loop_forever()
except KeyboardInterrupt:
    print(f"\n\n{'='*60}")
    print(f"👋 Dừng Fake Pump Device")
    print(f"{'='*60}\n")
    client.disconnect()
except Exception as e:
    print(f" Lỗi: {e}")