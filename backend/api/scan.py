from fastapi import APIRouter, UploadFile, File
import uuid
import os
from services.ocr_engine import process_medicine_ocr

router = APIRouter()
UPLOAD_DIR = "static/user_uploads"

@router.post("/")
async def scan_medicine(file: UploadFile = File(...)):
    """Tiếp nhận ảnh và gọi bộ xử lý OCR."""
    # 1. Lưu file ảnh
    file_extension = file.filename.split(".")[-1]
    file_id = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, file_id)

    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)

    # 2. Gọi hàm OCR từ services
    ocr_result = process_medicine_ocr(file_path)

    return {
        "message": "Xử lý ảnh hoàn tất",
        "file_id": file_id,
        "image_url": f"/static/user_uploads/{file_id}",
        "ocr_data": ocr_result
    }