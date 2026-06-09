import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, HttpUrl
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
    qty: Optional[int] = 0
    unit: Optional[str] = "viên"
    dosage: Optional[int] = 1
    time: Optional[str] = ""
    medicine_id: Optional[str] = None
    medicine_details: Optional[dict] = {}
    image_url: Optional[HttpUrl] = None

class PushSubscribeRequest(BaseModel):
    user_id: str
    endpoint: str
    keys: dict

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
                "unit": item.unit,
                "dosage": item.dosage,
                "time": item.time,
                "status": item.status,
                "low_stock_threshold": item.low_stock_threshold,
                "medicine_id": item.medicine_id,
                "medicine_details": item.medicine_details,
                "image_url": item.image_url
            } for item in results
        ]
        return {"items": items}

@router.post("/add")
async def add_to_inventory(request: InventoryAddRequest):
    """
    Thêm một thuốc mới (hoặc đã quét qua OCR) vào tủ thuốc cá nhân
    """
    with Session(engine) as session:
        item = UserInventory(
            user_id=request.user_id,
            name=request.name,
            type=request.type or "Chưa phân loại",
            qty=request.qty or 0,
            unit=request.unit or "viên",
            dosage=request.dosage or 1,
            time=request.time or "",
            medicine_id=request.medicine_id,
            status="safe",
            medicine_details=request.medicine_details or {},
            image_url=str(request.image_url) if request.image_url else None
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
                "unit": item.unit,
                "dosage": item.dosage,
                "time": item.time,
                "status": item.status,
                "low_stock_threshold": item.low_stock_threshold,
                "medicine_id": item.medicine_id,
                "medicine_details": item.medicine_details,
                "image_url": item.image_url
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
        
        print(f"--- [DEBUG] --- Deleting item {item_id}: image_url={item.image_url}")
        
        # Xóa ảnh trên Cloudinary nếu có
        if item.image_url and "cloudinary.com" in str(item.image_url):
            try:
                import cloudinary
                import cloudinary.uploader
                import os
                from dotenv import load_dotenv
                
                # Cố gắng nạp biến môi trường từ .env nội bộ của backend
                load_dotenv('/app/.env')
                
                # Trích xuất public_id từ URL Cloudinary
                url_str = str(item.image_url)
                parts = url_str.split('/upload/')
                if len(parts) == 2:
                    path_parts = parts[1].split('/')
                    if path_parts[0].startswith('v') and path_parts[0][1:].isdigit():
                        path_parts.pop(0)
                    public_id = '/'.join(path_parts).rsplit('.', 1)[0]
                    
                    # Cấu hình rõ ràng để tránh lỗi không tìm thấy credentials
                    cloudinary.config(url=os.environ.get('CLOUDINARY_URL'))
                    res = cloudinary.uploader.destroy(public_id)
                    print(f"--- [INFO: Cloudinary Delete Result] --- {res}")
            except Exception as e:
                import traceback
                print(f"--- [WARNING: Could not delete image on Cloudinary] --- Error: {e}")
                traceback.print_exc()

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
        
        return {"status": "success", "message": "Đã xóa thuốc khỏi tủ thuốc và hệ thống lưu trữ ảnh"}

class InventoryUpdateRequest(BaseModel):
    time: Optional[str] = None
    dosage: Optional[int] = None

@router.put("/{item_id}")
async def update_inventory_item(item_id: int, request: InventoryUpdateRequest):
    with Session(engine) as session:
        item = session.get(UserInventory, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Không tìm thấy thuốc")
        
        if request.time is not None:
            item.time = request.time
        if request.dosage is not None:
            item.dosage = request.dosage
            
        session.add(item)
        session.commit()
        session.refresh(item)
        
        return {"status": "success", "item": item}

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
        
        # Phép trừ logic tồn kho bằng số nguyên (O(1))
        current_qty = item.qty
        new_qty_num = current_qty - request.dosage
        
        if new_qty_num < 0:
            raise HTTPException(status_code=400, detail="Không đủ thuốc trong kho để uống liều này")
            
        # Cập nhật số lượng mới
        item.qty = new_qty_num
        
        # Kiểm tra ngưỡng thấp để cảnh báo
        warning = None
        if new_qty_num <= item.low_stock_threshold:
            item.status = "warning"
            warning = f"Cảnh báo: {item.name} sắp hết (Còn lại {item.qty} {item.unit})"
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
            "unit": item.unit,
            "warning": warning
        }

@router.post("/push/subscribe")
async def subscribe_push(request: PushSubscribeRequest):
    """
    Lưu cấu hình Web Push (Endpoint, Keys) của thiết bị người dùng vào DB
    """
    from models.subscription import NotificationSubscription
    with Session(engine) as session:
        # Kiểm tra xem endpoint này đã tồn tại chưa
        statement = select(NotificationSubscription).where(NotificationSubscription.endpoint == request.endpoint)
        existing = session.exec(statement).first()
        
        if existing:
            existing.user_id = request.user_id
            existing.keys = request.keys
            session.add(existing)
        else:
            new_sub = NotificationSubscription(
                user_id=request.user_id,
                endpoint=request.endpoint,
                keys=request.keys
            )
            session.add(new_sub)
        
        session.commit()
        return {"status": "success", "message": "Subscription saved"}