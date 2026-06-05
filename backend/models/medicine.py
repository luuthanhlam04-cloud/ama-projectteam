from typing import Optional, List
from sqlmodel import SQLModel, Field, JSON

class Medicine(SQLModel, table=True):
    id: str = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    generic_name: str
    category: str
    dosage_form: str
    strength: Optional[str] = None
    indications: str
    contraindications: str
    side_effects: str
    usage_instruction: str
    storage: str
    image_url: Optional[str] = None
    source: Optional[str] = Field(default="Internal Database")
    search_keywords: List[str] = Field(default=[], sa_type=JSON)