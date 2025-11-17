# File: device_registration_simulator.py
import requests
import random
import json

# --- CẤU HÌNH ---
BACKEND_URL = "http://localhost:8080/api/devices/register"
# ----------------

def generate_fake_mac():
    """Tạo một địa chỉ MAC ngẫu nhiên hợp lệ."""
    # OUI (Organizationally Unique Identifier) - 3 byte đầu
    # Dùng một OUI phổ biến của Espressif (nhà sản xuất chip ESP)
    oui = [0x24, 0x0A, 0xC4] 
    # 3 byte cuối ngẫu nhiên
    nic = [random.randint(0x00, 0xff) for _ in range(3)]
    mac_bytes = oui + nic
    
    # Format thành chuỗi "XX:XX:XX:XX:XX:XX"
    return ":".join(f"{b:02X}" for b in mac_bytes)

def register_device(mac_address):
    """Gửi yêu cầu đăng ký tới backend."""
    payload = {
        "macAddress": mac_address
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    print(f"[*] Đang cố gắng đăng ký thiết bị với MAC: {mac_address}")
    print(f"    -> Endpoint: {BACKEND_URL}")
    
    try:
        response = requests.post(BACKEND_URL, data=json.dumps(payload), headers=headers)
        
        # Kiểm tra kết quả
        if response.status_code == 200 or response.status_code == 201:
            print("\n[+] THÀNH CÔNG!")
            print("    - Backend đã chấp nhận yêu cầu.")
            print("    - Mã trạng thái:", response.status_code)
            print("    - Phản hồi từ server:")
            print(json.dumps(response.json(), indent=4, ensure_ascii=False))
            print("\n>>> BÂY GIỜ, HÃY VÀO TRANG 'QUẢN LÝ THIẾT BỊ' TRÊN WEB ĐỂ 'NHẬN' THIẾT BỊ NÀY!")
        else:
            print("\n[-] THẤT BẠI!")
            print("    - Mã trạng thái:", response.status_code)
            print("    - Phản hồi lỗi từ server:", response.text)
            
    except requests.exceptions.ConnectionError as e:
        print("\n[!] LỖI KẾT NỐI!")
        print("    - Không thể kết nối tới backend tại", BACKEND_URL)
        print("    - Vui lòng đảm bảo backend của bạn đang chạy.")
    except Exception as e:
        print(f"\n[!] LỖI KHÔNG XÁC ĐỊNH: {e}")

if __name__ == "__main__":
    print("--- IoT Device Registration Simulator ---")
    
    # Tạo một MAC giả
    fake_mac = generate_fake_mac()
    
    # Gửi yêu cầu đăng ký
    register_device(fake_mac)
    
    print("\n--- Hoàn thành ---")