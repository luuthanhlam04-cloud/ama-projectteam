import os
import json
import asyncio
from datetime import datetime
from sqlmodel import Session, select
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from pywebpush import webpush, WebPushException
from core.database import engine
from models.user_inventory import UserInventory
from models.subscription import NotificationSubscription

scheduler = AsyncIOScheduler()

def send_web_push(subscription_info, payload):
    try:
        webpush(
            subscription_info=subscription_info,
            data=json.dumps(payload),
            vapid_private_key=os.getenv("VAPID_PRIVATE_KEY"),
            vapid_claims={
                "sub": os.getenv("VAPID_SUBJECT", "mailto:admin@example.com")
            }
        )
    except WebPushException as ex:
        print(f"Web Push failed: {repr(ex)}")
        # Có thể thực hiện xóa DB nếu lỗi do user thu hồi quyền (HTTP 410)

async def check_and_send_reminders():
    # Lấy giờ phút hiện tại theo định dạng HH:MM
    current_time_str = datetime.now().strftime("%H:%M")
    print(f"[Scheduler] Quét lịch uống thuốc lúc {current_time_str}")
    
    with Session(engine) as session:
        # Tìm các loại thuốc có thiết lập giờ uống
        # Giả định trường time chứa chuỗi JSON (ví dụ '["08:00", "20:00"]') hoặc plain text '08:00'
        # Do SQLModel không hỗ trợ array contains tốt trên mọi DB, ta quét tất cả các loại có `time != ""`
        statement = select(UserInventory).where(UserInventory.time != "")
        items = session.exec(statement).all()
        
        for item in items:
            if current_time_str in item.time:
                # Tìm endpoint của user này
                sub_stmt = select(NotificationSubscription).where(NotificationSubscription.user_id == item.user_id)
                subscriptions = session.exec(sub_stmt).all()
                
                for subscription in subscriptions:
                    # Chuẩn bị payload thông báo
                    payload = {
                        "title": f"Đến giờ uống thuốc: {item.name}",
                        "body": f"Liều lượng: {item.dosage} {item.unit}. Chạm vào thông báo này để xác nhận ĐÃ UỐNG.",
                        "data": {
                            "medicine_id": str(item.id),
                            "dosage": item.dosage,
                            "user_id": item.user_id,
                            "unit": item.unit
                        }
                    }
                    
                    sub_info = {
                        "endpoint": subscription.endpoint,
                        "keys": subscription.keys
                    }
                    
                    # Gửi Push trong luồng không đồng bộ
                    loop = asyncio.get_event_loop()
                    loop.run_in_executor(None, send_web_push, sub_info, payload)

def start_scheduler():
    if not scheduler.running:
        # Lên lịch quét mỗi 1 phút
        scheduler.add_job(
            check_and_send_reminders, 
            'cron', 
            minute='*', 
            misfire_grace_time=60
        )
        scheduler.start()
        print("APScheduler đã được khởi động.")
