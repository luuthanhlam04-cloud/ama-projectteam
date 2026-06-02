import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
# Đảm bảo đã tạo thư mục api và các file scan.py, chat.py, inventory.py, auth.py
from api import scan, chat, inventory, auth

app = FastAPI(title="AMA Ultimate System API", version="1.0.0")

# 1. Cấu hình CORS - Giữ nguyên thiết lập cũ để Frontend cổng 3000 truy cập được
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Cấu hình Static Files
# os.path.dirname(__file__) đảm bảo lấy đúng đường dẫn tuyệt đối của thư mục backend
static_path = os.path.join(os.path.dirname(__file__), "static")

# Tự động tạo thư mục nếu chưa có để tránh lỗi sập server khi khởi động
if not os.path.exists(static_path):
    os.makedirs(os.path.join(static_path, "medicine_assets"), exist_ok=True)
    os.makedirs(os.path.join(static_path, "user_uploads"), exist_ok=True)

# Mount thư mục static để phục vụ URL (ví dụ: http://localhost:8000/static/medicine_assets/drug_049.png)
app.mount("/static", StaticFiles(directory=static_path), name="static")

# 3. Kết nối các nhánh logic (Routers) - Xương sống điều phối
app.include_router(auth, prefix="/api/auth", tags=["Auth"])
app.include_router(scan, prefix="/api/scan", tags=["OCR"])
app.include_router(chat, prefix="/api/chat", tags=["AI Chat"])
app.include_router(inventory, prefix="/api/inventory", tags=["Inventory"])

@app.get("/")
async def root():
    # Giữ nguyên phản hồi root cũ để kiểm tra trạng thái nhanh
    return {"status": "success", "message": "AMA Ultimate System Backend is online"}