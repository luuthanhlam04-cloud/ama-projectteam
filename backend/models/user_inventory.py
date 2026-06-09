from typing import Optional, Dict
from sqlmodel import SQLModel, Field, JSON

class UserInventory(SQLModel, table=True):
    __tablename__ = "user_inventory"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    medicine_id: Optional[str] = Field(default=None, index=True)
    name: str = Field(index=True)
    type: str  # Phân loại nhóm thuốc (e.g., 'Giảm đau, hạ sốt')
    qty: int = Field(default=0, description="Tổng số lượng thuốc hiện có")
    unit: str = Field(default="viên", description="Đơn vị tính chi tiết: viên, gói, ml, tuýp")
    dosage: int = Field(default=1, description="Số lượng tiêu hao mặc định mỗi lần uống")
    time: str = Field(default="", description="Lịch uống, lưu dưới dạng chuỗi JSON hoặc comma-separated") 
    status: str = Field(default="safe")         # 'safe' | 'warning'
    low_stock_threshold: int = Field(default=5)  # Ngưỡng cảnh báo sắp hết
    
    # Cột JSON lưu chi tiết thông tin thuốc (indications, contraindications...)
    medicine_details: Optional[Dict] = Field(default={}, sa_type=JSON)
    
    # Lưu URL tĩnh ảnh chụp thuốc thực tế sau khi phân tích OCR thành công
    image_url: Optional[str] = Field(default=None, description="URL ảnh lưu trên Cloudinary")
