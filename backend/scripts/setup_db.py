import json
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from sqlmodel import Session
from core.database import engine, init_db
from models.medicine import Medicine

def load_postgres():
    print("Đang khởi tạo cấu trúc bảng Postgres...")
    init_db()
    
    data_path = os.path.join(BASE_DIR, "data", "medicine_samples.json")
    
    if not os.path.exists(data_path):
        data_path = "/app/data/medicine_samples.json"
        if not os.path.exists(data_path):
            print(f"Lỗi: Không tìm thấy file dữ liệu tại {data_path}")
            return

    with open(data_path, "r", encoding="utf-8") as f:
        medicines = json.load(f)
    
    with Session(engine) as session:
        count = 0
        for med_data in medicines:
            if not session.get(Medicine, med_data["id"]):
                # Chuyển đổi khóa brand_name sang name trước khi nạp vào database
                if "brand_name" in med_data:
                    med_data["name"] = med_data.pop("brand_name")
                
                session.add(Medicine(**med_data))
                count += 1
        session.commit()
    print(f"Postgres: Đã nạp thành công {count} loại thuốc mới.")

if __name__ == "__main__":
    load_postgres()