from sqlmodel import SQLModel, Field
from datetime import datetime

class ConsumptionHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(index=True)
    medicine_id: str = Field(index=True)
    action: str  # "consumed", "added", "expired"
    quantity_change: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)