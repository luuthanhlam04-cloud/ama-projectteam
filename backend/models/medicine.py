from typing import Optional, List
from sqlmodel import SQLModel, Field, JSON

class Medicine(SQLModel, table=True):
    # Khóa chính dạng chuỗi (drug_048)
    id: str = Field(default=None, primary_key=True)
    
    brand_name: str = Field(index=True)
    generic_name: str
    category: str
    dosage_form: str
    strength: Optional[str] = None
    indications: str
    contraindications: str
    side_effects: str
    usage_instruction: str
    storage: str
    
    # Thêm trường này vì JSON của Minh có chứa link ảnh
    image_url: Optional[str] = None
    
    # Chuyển sang Optional nếu file JSON không phải lúc nào cũng có nguồn
    source: Optional[str] = Field(default="Internal Database")
    
    # Cấu trúc cho Fuzzy Match tại Giai đoạn 3
    # sa_type=JSON giúp PostgreSQL hiểu đây là mảng dữ liệu
    search_keywords: List[str] = Field(default=[], sa_type=JSON)