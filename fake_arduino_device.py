import paho.mqtt.client as mqtt
import time
import json
import random
import sys

# ==========================================
# PHẦN CẤU HÌNH 
# ==========================================

# Lưu ý: Thay bằng IP LAN máy tính của bạn (VD: 192.168.1.x) để giống thật nhất
MQTT_SERVER = "10.1.0.166" 
MQTT_PORT = 1883
MQTT_USER = "" 
MQTT_PASS = ""

# ID này phải trùng với ID bạn đang thấy trên Web
DEVICE_ID = "DHT22-ARDUINO-FAKE"

TOPIC_PUBLISH = f"sensor/{DEVICE_ID}/data"
TOPIC_SUBSCRIBE = f"device/{DEVICE_ID}/control"
TOPIC_STATUS = f"device/{DEVICE_ID}/status"

# Biến toàn cục
led_status = "OFF" 
last_msg_time = 0

# ==========================================
# HÀM XỬ LÝ
# ==========================================

def callback(client, userdata, msg):
    global led_status
    print(f"\n[Thu được tin nhắn] {msg.topic}")
    
    payload_str = msg.payload.decode("utf-8")
    print(f"Nội dung: {payload_str}")
    
    try:
        doc = json.loads(payload_str)
        action = doc.get("action", "")
        
        feedback = {"deviceId": DEVICE_ID, "timestamp": str(int(time.time()*1000))}

        if action == "turn_on":
            led_status = "ON"
            print(" RELAY: ON")
            feedback["status"] = "ONLINE"
            feedback["state"] = "ON"
            
        elif action == "turn_off":
            led_status = "OFF"
            print("🌑 RELAY: OFF")
            feedback["status"] = "ONLINE"
            feedback["state"] = "OFF"
            
        # Gửi phản hồi trạng thái ngay lập tức
        client.publish(TOPIC_STATUS, json.dumps(feedback), retain=True)
            
    except Exception as e:
        print("Lỗi đọc JSON:", e)

# ==========================================
# SETUP & LOOP
# ==========================================

client = mqtt.Client()

def setup():
    print("--- BẮT ĐẦU SETUP ---")
    
    # 1. Cấu hình Callback
    client.on_message = callback
    if MQTT_USER:
        client.username_pw_set(MQTT_USER, MQTT_PASS)
        
    # 2. CẤU HÌNH LWT (Last Will - Di chúc)
    # Đây là tính năng quan trọng: Nếu script bị crash hoặc mất điện,
    # Broker sẽ tự động gửi tin nhắn này thay cho thiết bị.
    offline_payload = json.dumps({
        "deviceId": DEVICE_ID,
        "status": "OFFLINE",
        "timestamp": str(int(time.time()*1000))
    })
    # retain=True để Web Dashboard F5 lại vẫn thấy là OFFLINE
    client.will_set(TOPIC_STATUS, offline_payload, qos=1, retain=True)
    print("Đã cài đặt LWT (Tự báo OFFLINE khi mất kết nối đột ngột)")

    # 3. Kết nối
    print(f"Đang kết nối MQTT Server: {MQTT_SERVER}...")
    try:
        client.connect(MQTT_SERVER, MQTT_PORT, 60)
        client.loop_start()
        
        # Subscribe & Báo Online
        client.subscribe(TOPIC_SUBSCRIBE)
        
        online_payload = json.dumps({
            "deviceId": DEVICE_ID,
            "status": "ONLINE",
            "state": led_status,
            "timestamp": str(int(time.time()*1000))
        })
        client.publish(TOPIC_STATUS, online_payload, retain=True)
        print(" Đã kết nối & Báo trạng thái ONLINE")
        
    except Exception as e:
        print(f" Không thể kết nối MQTT: {e}")
        sys.exit(1)
    print("--- KẾT THÚC SETUP ---\n")

def loop():
    global last_msg_time
    current_time = time.time() * 1000 
    
    # Gửi dữ liệu mỗi 10 giây
    if current_time - last_msg_time > 10000:
        last_msg_time = current_time
        
        temp = round(25.0 + random.uniform(-2, 2), 1)
        hum = round(60.0 + random.uniform(-5, 5), 1)
        
        payload = {
            "deviceId": DEVICE_ID,
            "sensorType": "DHT22",
            "temperature": temp,
            "humidity": hum,
            "timestamp": int(time.time()*1000)
        }
        payload_json = json.dumps(payload)
        
        print(f"📤 Gửi dữ liệu: {payload_json}")
        client.publish(TOPIC_PUBLISH, payload_json)

# ==========================================
# CHƯƠNG TRÌNH CHÍNH (XỬ LÝ CTRL+C)
# ==========================================
if __name__ == "__main__":
    setup()
    
    try:
        while True:
            loop()
            time.sleep(0.1) # Giảm tải CPU
            
    except KeyboardInterrupt:
        # Bắt sự kiện bấm Ctrl+C
        print("\n\n🛑 Đang tắt thiết bị...")
        
        # Chủ động gửi tin nhắn OFFLINE trước khi thoát
        offline_payload = json.dumps({
            "deviceId": DEVICE_ID,
            "status": "OFFLINE",
            "timestamp": str(int(time.time()*1000))
        })
        infot = client.publish(TOPIC_STATUS, offline_payload, retain=True)
        infot.wait_for_publish() # Đợi tin nhắn gửi đi xong
        
        client.disconnect()
        client.loop_stop()
        print(" Đã gửi trạng thái OFFLINE và ngắt kết nối.")