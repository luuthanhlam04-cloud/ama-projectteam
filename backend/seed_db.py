import json
import os
from sqlmodel import Session, select
from core.database import engine
from models import Medicine

# Đường dẫn tính từ thư mục /app trong container
JSON_PATH = "data/medicine_samples.json"

def seed_medicines():
    if not os.path.exists(JSON_PATH):
        print(f"Lỗi: Không tìm thấy file tại {JSON_PATH}")
        return

    try:
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            
            # Kiểm tra nếu data là list thì dùng luôn, nếu là dict thì lấy key 'medicines'
            if isinstance(data, list):
                medicines_list = data
            else:
                medicines_list = data.get("medicines", [])

        with Session(engine) as session:
            count = 0
            for item in medicines_list:
                # Kiểm tra trùng lặp dựa trên ID
                existing = session.get(Medicine, item["id"])
                if not existing:
                    new_med = Medicine(
                        id=item["id"],
                        name=item["brand_name"],
                        description=f"{item.get('category', '')} - {item.get('indications', '')}"
                    )
                    session.add(new_med)
                    count += 1
            
            session.commit()
            print(f"Thành công: Đã nạp thêm {count} loại thuốc mới vào Database.")
            
    except Exception as e:
        print(f"Lỗi khi nạp dữ liệu: {e}")

if __name__ == "__main__":
    seed_medicines()