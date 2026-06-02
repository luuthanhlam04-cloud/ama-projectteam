import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  # Thêm thư viện này
from fastapi.staticfiles import StaticFiles
from api.chat import router as chat_router

app = FastAPI(title="AMA Project - Chatbot Demo")

# --- 1. CẤU HÌNH CỔNG CHIA SẺ CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Cho phép tất cả các nguồn (hoặc điền cụ thể url frontend của bạn)
    allow_credentials=True,
    allow_methods=["*"],  # Cho phép tất cả các phương thức GET, POST...
    allow_headers=["*"],  # Cho phép tất cả các Header gửi lên
)

# --- 2. MỞ CỔNG FILE TĨNH ĐỂ TRẢ ẢNH ---
images_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "data", "images"))
app.mount("/images", StaticFiles(directory=images_path), name="images")

app.include_router(chat_router, prefix="/api", tags=["Chatbot"])

@app.get("/")
def read_root():
    return {"message": "Server FastAPI đang hoạt động!"}