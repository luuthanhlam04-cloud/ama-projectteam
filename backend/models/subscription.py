from typing import Optional, Dict
from sqlmodel import SQLModel, Field, JSON
from datetime import datetime

class NotificationSubscription(SQLModel, table=True):
    __tablename__ = "notification_subscription"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    endpoint: str = Field(index=True, unique=True, description="URL endpoint của dịch vụ Push")
    keys: Dict = Field(sa_type=JSON, description="Cặp khóa p256dh và auth")
    created_at: datetime = Field(default_factory=datetime.utcnow)
