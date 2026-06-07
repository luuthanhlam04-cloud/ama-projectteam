import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from sqlmodel import Session, select, delete
from core.database import engine
from models.user_inventory import UserInventory
from models.history import ConsumptionHistory

router = APIRouter()

# --- SCHEMAS ---
class ConsumeRequest(BaseModel):
    medicine_id: str  # ID trong UserInventory (hoặc fallback tìm theo tên/medicine_id)
    dosage: int = Field(..., gt=0, description="Liều lượng phải lớn hơn 0")
    user_id: str

class InventoryAddRequest(BaseModel):
    user_id: str
    name: str
    type: Optional[str] = "Chưa phân loại"
    qty: Optional[str] = "1"
    time: Optional[str] = "Chưa cài đặt"
    medicine_id: Optional[str] = None
    medicine_details: Optional[dict] = {}

# --- ENDPOINTS ---

@router.get("/", response_model=dict)
async def get_all_inventory(user_id: str):
    """
    Lấy danh sách thuốc trong tủ thuốc cá nhân của người dùng từ Postgres
    """
    with Session(engine) as session:
        statement = select(UserInventory).where(UserInventory.user_id == user_id).order_by(UserInventory.id.desc())
        results = session.exec(statement).all()
        
        items = [
            {
                "id": str(item.id),
                "name": item.name,
                "type": item.type,
                "qty": item.qty,
                "time": item.time,
                "status": item.status,
                "low_stock_threshold": item.low_stock_threshold,
                "medicine_id": item.medicine_id,
                "medicine_details": item.medicine_details
            } for item in results
        ]
        return {"items": items}

@router.post("/add")
async def add_to_inventory(request: InventoryAddRequest):
    """
    Thêm một thuốc mới (hoặc đã quét qua OCR) vào tủ thuốc cá nhân
    """
    with Session(engine) as session:
        # Tạo bản ghi tủ thuốc cá nhân mới
        item = UserInventory(
            user_id=request.user_id,
            name=request.name,
            type=request.type or "Chưa phân loại",
            qty=request.qty or "1",
            time=request.time or "Chưa cài đặt",
            medicine_id=request.medicine_id,
            status="safe",
            medicine_details=request.medicine_details or {}
        )
        session.add(item)
        
        # Ghi nhận lịch sử (chuyển đổi user_id sang int nếu có thể)
        user_id_int = int(request.user_id) if request.user_id.isdigit() else 9999
        log_entry = ConsumptionHistory(
            user_id=user_id_int,
            medicine_id=request.medicine_id or "custom",
            action="added",
            quantity_change=1
        )
        session.add(log_entry)
        
        session.commit()
        session.refresh(item)
        
        return {
            "status": "success",
            "item": {
                "id": str(item.id),
                "name": item.name,
                "type": item.type,
                "qty": item.qty,
                "time": item.time,
                "status": item.status,
                "low_stock_threshold": item.low_stock_threshold,
                "medicine_id": item.medicine_id,
                "medicine_details": item.medicine_details
            }
        }

@router.delete("/{item_id}")
async def delete_from_inventory(item_id: int):
    """
    Xóa thủ công một thuốc ra khỏi tủ thuốc cá nhân
    """
    with Session(engine) as session:
        item = session.get(UserInventory, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Không tìm thấy thuốc trong tủ")
        
        user_id_int = int(item.user_id) if item.user_id.isdigit() else 9999
        log_entry = ConsumptionHistory(
            user_id=user_id_int,
            medicine_id=item.medicine_id or "custom",
            action="removed",
            quantity_change=-1
        )
        session.add(log_entry)
        session.delete(item)
        session.commit()
        
        return {"status": "success", "message": "Đã xóa thuốc khỏi tủ thuốc thành công"}

@router.post("/consume")
async def consume_medicine(request: ConsumeRequest):
    """
    Trừ số lượng thuốc đã dùng và ghi lịch sử vào ConsumptionHistory
    """
    with Session(engine) as session:
        item = None
        # Thử tìm theo ID bản ghi tủ thuốc cá nhân
        if request.medicine_id.isdigit():
            item = session.get(UserInventory, int(request.medicine_id))
        
        # Nếu không thấy, tìm theo trường medicine_id hoặc name trong tủ thuốc của user đó
        if not item:
            statement = select(UserInventory).where(
                UserInventory.user_id == request.user_id,
                (UserInventory.medicine_id == request.medicine_id) | (UserInventory.name == request.medicine_id)
            )
            item = session.exec(statement).first()
            
        if not item:
            raise HTTPException(status_code=404, detail="Không tìm thấy thuốc trong tủ của bạn")
        
        # Phân tích cú pháp số lượng từ chuỗi (ví dụ "12 viên" -> 12, "1 vỉ" -> 1)
        qty_str = item.qty
        match = re.search(r'(\d+)', qty_str)
        
        if not match:
            current_qty = 0
            unit = qty_str
        else:
            current_qty = int(match.group(1))
            unit = qty_str.replace(match.group(1), '').strip()
            
        new_qty_num = current_qty - request.dosage
        if new_qty_num < 0:
            raise HTTPException(status_code=400, detail="Không đủ thuốc trong kho để uống liều này")
            
        # Cập nhật số lượng mới
        item.qty = f"{new_qty_num} {unit}".strip()
        
        # Kiểm tra ngưỡng thấp để cảnh báo
        warning = None
        if new_qty_num <= item.low_stock_threshold:
            item.status = "warning"
            warning = f"Cảnh báo: {item.name} sắp hết (Còn lại {item.qty})"
        else:
            item.status = "safe"
            
        # Ghi nhận lịch sử
        user_id_int = int(request.user_id) if request.user_id.isdigit() else 9999
        log_entry = ConsumptionHistory(
            user_id=user_id_int,
            medicine_id=item.medicine_id or "custom",
            action="consumed",
            quantity_change=-request.dosage
        )
        
        session.add(item)
        session.add(log_entry)
        session.commit()
        
        return {
            "status": "success",
            "new_quantity": new_qty_num,
            "qty_str": item.qty,
            "warning": warning
        }