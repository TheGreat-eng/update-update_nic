# File: simulator/sensor_simulator1.py
# (Hard-coded version for easy manual configuration)

import json
import time
import random
import math
from datetime import datetime
from typing import Dict, Any
import paho.mqtt.client as mqtt

class SensorSimulator:
    def __init__(self, broker_host="localhost", broker_port=1883, username=None, password=None):
        # ✅ Initialize client with version 2 API
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        
        if username:
            self.client.username_pw_set(username=username, password=password)
            
        self.broker_host = broker_host
        self.broker_port = broker_port
        self.connected = False

        # ⚠️ HARD-CODED CONFIGURATION - CHANGE THESE VALUES AS NEEDED ⚠️
        self.BASE_TEMPERATURE = 28.0      # Change this base temperature
        self.BASE_HUMIDITY = 65.0         # Change this base humidity
        self.START_SOIL_MOISTURE = 50.0   # Change initial soil moisture
        self.BASE_LIGHT_INTENSITY = 10000.0  # Change base light intensity
        self.BASE_PH_LEVEL = 6.5          # Change base pH level
        
        # Simulation parameters - adjust these for different behavior
        self.TEMP_VARIATION_RANGE = 5.0   # Temperature variation amplitude
        self.MOISTURE_DECAY_RATE = (0.05, 0.15)  # Soil moisture decay range
        self.IRRIGATION_CHANCE = 0.02     # Chance of automatic irrigation
        self.IRRIGATION_AMOUNT = (15, 25) # Irrigation moisture increase range
        self.PH_VARIATION_RANGE = (-0.02, 0.02)  # pH variation range
        
        # Simulation state
        self.base_temperature = self.BASE_TEMPERATURE
        self.base_humidity = self.BASE_HUMIDITY
        self.soil_moisture = self.START_SOIL_MOISTURE
        self.light_intensity = self.BASE_LIGHT_INTENSITY
        self.ph_level = self.BASE_PH_LEVEL

        self.start_time = time.time()

        # ✅ Assign callback functions
        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect

    # ================= MQTT Callbacks =================
    
    def on_connect(self, client, userdata, flags, reason_code, properties):
        if reason_code == 0:
            print("✅ Connected to MQTT Broker!")
            self.connected = True
        else:
            print(f"❌ Failed to connect, reason code {reason_code}")
            self.connected = False

    def on_disconnect(self, client, userdata, flags, reason_code, properties):
        print(f"⚠️  Disconnected from MQTT Broker with reason code: {reason_code}")
        self.connected = False

    # =============== Connection & Run Logic =================
    
    def connect(self):
        try:
            print(f"🔗 Connecting to {self.broker_host}:{self.broker_port}...")
            self.client.connect(self.broker_host, self.broker_port, 60)
            self.client.loop_start()
            return True
        except Exception as e:
            print(f"❌ Connection error: {e}")
            return False

    def run_simulation(self, devices: list, interval: int = 10):
        print("\n" + "="*64)
        print("🌾 Smart Farm IoT Simulator (Hard-coded Configuration)")
        print("="*64)
        print(f"📊 Configuration:")
        print(f"   Temperature: {self.BASE_TEMPERATURE}°C base")
        print(f"   Humidity: {self.BASE_HUMIDITY}% base") 
        print(f"   Soil Moisture: {self.START_SOIL_MOISTURE}% start")
        print(f"   Light: {self.BASE_LIGHT_INTENSITY} lux base")
        print(f"   pH: {self.BASE_PH_LEVEL} base")
        print(f"📡 Devices: {len(devices)} | Interval: {interval}s | Broker: {self.broker_host}:{self.broker_port}\n")

        if not self.connect():
            return

        # Wait for successful connection (max 10s)
        connect_timeout = time.time() + 10
        while not self.connected and time.time() < connect_timeout:
            time.sleep(0.5)
        
        if not self.connected:
            print("❌ Connection timed out. Exiting.")
            self.client.loop_stop()
            return

        # Send initial ONLINE status
        for d in devices:
            self.publish_device_status(d["id"], "ONLINE")

        try:
            it = 0
            while True:
                it += 1
                hour = self.get_time_factor()
                print(f"\n--- Iteration {it} | Simulated {int(hour):02d}:00 ---")

                if not self.connected:
                    print("Connection lost, will try to reconnect automatically...")
                    time.sleep(5)
                    continue

                for d in devices:
                    t = d["type"]
                    data = None
                    if t == "DHT22":
                        data = self.simulate_dht22(d["id"])
                    elif t == "SOIL_MOISTURE":
                        data = self.simulate_soil_moisture(d["id"])
                    elif t == "LIGHT":
                        data = self.simulate_light_sensor(d["id"])
                    elif t == "PH":
                        data = self.simulate_ph_sensor(d["id"])
                    
                    if data:
                        self.publish_sensor_data(d["id"], data)

                print(f"💤 Sleep {interval}s…")
                time.sleep(interval)

        except KeyboardInterrupt:
            print("\n🛑 Stopping simulator…")
            for d in devices:
                self.publish_device_status(d["id"], "OFFLINE")
                time.sleep(0.1)
            self.client.loop_stop()
            self.client.disconnect()
            print("✅ Stopped.")

    # =============== Simulation Functions ===============
    
    def get_time_factor(self) -> float:
        elapsed = time.time() - self.start_time
        hour_of_day = (elapsed / 60) % 24
        return hour_of_day

    def simulate_dht22(self, device_id: str) -> Dict[str, Any]:
        hour = self.get_time_factor()
        temp_variation = self.TEMP_VARIATION_RANGE * math.sin((hour - 6) * math.pi / 12)
        temperature = self.base_temperature + temp_variation + random.uniform(-1, 1)
        humidity = self.base_humidity - (temp_variation * 2) + random.uniform(-3, 3)
        humidity = max(30, min(95, humidity))
        return {
            "deviceId": device_id,
            "sensorType": "DHT22",
            "temperature": round(temperature, 2),
            "humidity": round(humidity, 2),
            "timestamp": datetime.now().isoformat()
        }

    def simulate_soil_moisture(self, device_id: str) -> Dict[str, Any]:
        self.soil_moisture -= random.uniform(*self.MOISTURE_DECAY_RATE)
        if random.random() < self.IRRIGATION_CHANCE:
            self.soil_moisture += random.uniform(*self.IRRIGATION_AMOUNT)
            print(f"💧 Irrigation event! Moisture -> {self.soil_moisture:.1f}%")
        self.soil_moisture = max(20, min(70, self.soil_moisture))
        return {
            "deviceId": device_id,
            "sensorType": "SOIL_MOISTURE",
            "soilMoisture": round(self.soil_moisture, 2),
            "timestamp": datetime.now().isoformat()
        }

    def simulate_light_sensor(self, device_id: str) -> Dict[str, Any]:
        hour = self.get_time_factor()
        if 6 <= hour <= 18:
            light_factor = math.sin((hour - 6) * math.pi / 12)
            self.light_intensity = 50000 * light_factor + random.uniform(-2000, 2000)
        else:
            self.light_intensity = random.uniform(0, 100)
        self.light_intensity = max(0, self.light_intensity)
        return {
            "deviceId": device_id,
            "sensorType": "LIGHT",
            "lightIntensity": round(self.light_intensity, 2),
            "timestamp": datetime.now().isoformat()
        }

    def simulate_ph_sensor(self, device_id: str) -> Dict[str, Any]:
        self.ph_level += random.uniform(*self.PH_VARIATION_RANGE)
        self.ph_level = max(5.5, min(7.5, self.ph_level))
        return {
            "deviceId": device_id,
            "sensorType": "PH",
            "soilPH": round(self.ph_level, 2),
            "timestamp": datetime.now().isoformat()
        }

    # =============== Publish Functions ===============
    
    def publish_sensor_data(self, device_id: str, data: Dict[str, Any]):
        topic = f"sensor/{device_id}/data"
        payload = json.dumps(data)
        res = self.client.publish(topic, payload, qos=1)
        if res.rc == mqtt.MQTT_ERR_SUCCESS:
            print(f"📤 {device_id}: {data.get('sensorType')} sent")
        else:
            print(f"❌ Publish failed for {device_id} with code {res.rc}")

    def publish_device_status(self, device_id: str, status: str):
        topic = f"device/{device_id}/status"
        payload = json.dumps({
            "deviceId": device_id,
            "status": status,
            "timestamp": datetime.now().isoformat()
        })
        self.client.publish(topic, payload, qos=1, retain=False)
        print(f"📡 {device_id} status -> {status}")


def main():
    # ⚠️ HARD-CODED BROKER SETTINGS - CHANGE THESE AS NEEDED ⚠️
    BROKER_HOST = "localhost"      # Change MQTT broker host
    BROKER_PORT = 1883             # Change MQTT broker port
    MQTT_USER = None               # Change MQTT username if needed
    MQTT_PASS = None               # Change MQTT password if needed
    INTERVAL = 10                  # Change simulation interval in seconds

    # ⚠️ HARD-CODED DEVICES - CHANGE THESE AS NEEDED ⚠️
    devices = [
        {"id": "DHT22-0001", "type": "DHT22"},
        {"id": "DHT22-000101", "type": "DHT22"},
        # {"id": "SOIL-123",     "type": "SOIL_MOISTURE"},
        # {"id": "SOIL-1234",    "type": "SOIL_MOISTURE"},
        # {"id": "LIGHT-123",    "type": "LIGHT"},
        # {"id": "PH-123",       "type": "PH"},
        # Add more devices here if needed:
        # {"id": "DHT22-000102", "type": "DHT22"},
        # {"id": "SOIL-567",     "type": "SOIL_MOISTURE"},
    ]

    sim = SensorSimulator(
        broker_host=BROKER_HOST, 
        broker_port=BROKER_PORT, 
        username=MQTT_USER, 
        password=MQTT_PASS
    )
    sim.run_simulation(devices, INTERVAL)

if __name__ == "__main__":
    main()