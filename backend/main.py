import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Sửa cú pháp import router theo chuẩn FastAPI để không lỗi cho cả bạn và đồng đội
from api.scan import router as scan_router
from api.chat import router as chat_router
from api.inventory import router as inventory_router
from api.auth import router as auth_router

app = FastAPI(title="AMA Ultimate System API", version="1.0.0")

# 1. Cấu hình CORS - Giữ nguyên thiết lập bảo mật cổng 3000 của bạn
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Cấu hình thư mục vật lý (Hợp nhất về thư mục static của bạn)
static_path = os.path.join(os.path.dirname(__file__), "static")
medicine_assets_path = os.path.join(static_path, "medicine_assets")

if not os.path.exists(static_path):
    os.makedirs(medicine_assets_path, exist_ok=True)
    os.makedirs(os.path.join(static_path, "user_uploads"), exist_ok=True)

# ---> MOUNT CHO LUỒNG OCR (Của bạn)
# Phục vụ các URL dạng: http://localhost:8000/static/medicine_assets/...
app.mount("/static", StaticFiles(directory=static_path), name="static")

# ---> MOUNT CHO LUỒNG CHATBOT (Của đồng đội)
# ÁNH XẠ ẢO: Bắt các request gửi tới URL "/images/..." và trỏ thẳng vào thư mục vật lý "static/medicine_assets"
# Điều này giúp file JSON của chatbot (chứa link /images/drug_050.png) vẫn chạy bình thường mà không cần sửa DB.
app.mount("/images", StaticFiles(directory=medicine_assets_path), name="images")

# 3. Kết nối các nhánh logic (Routers) - Hệ thống hóa Prefix
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(scan_router, prefix="/api/scan", tags=["OCR"])
app.include_router(chat_router, prefix="/api/chat", tags=["AI Chat"])
app.include_router(inventory_router, prefix="/api/inventory", tags=["Inventory"])

@app.get("/")
async def root():
    return {"status": "success", "message": "AMA Ultimate System Backend is online"}
