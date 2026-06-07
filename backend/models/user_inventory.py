from typing import Optional, Dict
from sqlmodel import SQLModel, Field, JSON

class UserInventory(SQLModel, table=True):
    __tablename__ = "user_inventory"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    medicine_id: Optional[str] = Field(default=None, index=True)
    name: str = Field(index=True)
    type: str  # Phân loại nhóm thuốc (e.g., 'Giảm đau, hạ sốt')
    qty: str   # Số lượng/hàm lượng (e.g., '12 viên')
    time: str = Field(default="Chưa cài đặt")  # Lịch uống (e.g., 'Sau ăn 30 phút')
    status: str = Field(default="safe")         # 'safe' | 'warning'
    low_stock_threshold: int = Field(default=5)  # Ngưỡng cảnh báo sắp hết
    
    # Cột JSON lưu chi tiết thông tin thuốc (indications, contraindications...)
    medicine_details: Optional[Dict] = Field(default={}, sa_type=JSON)
