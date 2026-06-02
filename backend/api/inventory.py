from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

router = APIRouter()

# --- SCHEMA (Tuân thủ Pydantic V2 theo bản dự án) ---
class ConsumeRequest(BaseModel):
    medicine_id: str
    dosage: int = Field(..., gt=0, description="Liều lượng phải lớn hơn 0")
    user_id: str

class InventoryItem(BaseModel):
    id: str
    name: str
    quantity: int
    unit: str
    low_stock_threshold: int = 5 # Ngưỡng cảnh báo sắp hết

# --- MOCK DATA (Mở rộng để khớp logic dự án) ---
MOCK_INVENTORY = [
    {"id": "drug_049", "name": "Deep Heat Rub", "quantity": 10, "unit": "tuýp", "low_stock_threshold": 2},
    {"id": "drug_038", "name": "Panadol Extra", "quantity": 20, "unit": "viên", "low_stock_threshold": 5}
]

# Giả lập bảng ConsumptionHistory trong tài liệu
MOCK_HISTORY = []

@router.get("/", response_model=dict)
async def get_all_inventory(user_id: str):
    """Lấy danh sách thuốc trong kho (Bước 4 & 5 trong logic dự án)"""
    return {"items": MOCK_INVENTORY}

@router.post("/consume")
async def consume_medicine(request: ConsumeRequest):
    """
    Logic trừ tồn kho chi tiết (Sequence Logic trong tài liệu)
    """
    for item in MOCK_INVENTORY:
        if item["id"] == request.medicine_id:
            # 1. Tính toán: Quantity_new = Quantity_old - Dosage
            new_quantity = item["quantity"] - request.dosage
            
            # 2. Kiểm tra nếu Quantity_new < 0 (Bước 6)
            if new_quantity < 0:
                raise HTTPException(status_code=400, detail="Kho đã hết - Không đủ số lượng để thực hiện")
            
            # 3. Cập nhật số lượng
            item["quantity"] = new_quantity
            
            # 4. Ghi log vào ConsumptionHistory (Bước 7)
            log_entry = {
                "medicine_id": request.medicine_id,
                "user_id": request.user_id,
                "consumed_at": datetime.now().isoformat(),
                "amount": request.dosage
            }
            MOCK_HISTORY.append(log_entry)
            
            # 5. Kiểm tra ngưỡng thấp (Bước 8)
            warning = None
            if new_quantity <= item["low_stock_threshold"]:
                warning = f"Cảnh báo: {item['name']} sắp hết (Còn lại {new_quantity} {item['unit']})"
            
            return {
                "status": "success",
                "new_quantity": new_quantity,
                "history_log": log_entry,
                "warning": warning # Trả về kèm cảnh báo để Frontend hiển thị (Pop-up/Toast)
            }
    
    raise HTTPException(status_code=404, detail="Không tìm thấy thuốc trong hệ thống")