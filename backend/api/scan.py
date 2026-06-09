import os
import traceback
import asyncio
from fastapi import APIRouter, UploadFile, File, HTTPException
from services.image_processing import preprocess_for_ocr
from services.ocr_engine import process_medicine_ocr
import cloudinary
import cloudinary.uploader

router = APIRouter()

@router.post("/")
async def scan_medicine(file: UploadFile = File(...)):
    upload_dir = "static/user_uploads"
    os.makedirs(upload_dir, exist_ok=True)
        
    temp_path = os.path.join(upload_dir, file.filename)
    processed_path = None
    
    try:
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Chạy tiền xử lý ảnh OpenCV trên một luồng khác để không block Main Event Loop
        processed_path = await asyncio.to_thread(preprocess_for_ocr, temp_path)
        result = await process_medicine_ocr(processed_path)
        
        # --- Tích hợp Upload Cloudinary (Xử lý ngoại lệ độc lập) ---
        image_url = None
        try:
            # Tải ảnh gốc CÓ MÀU lên Cloudinary (chạy trên thread để không block I/O)
            def upload_to_cloudinary():
                return cloudinary.uploader.upload(
                    temp_path,
                    folder="p-innovation/medicines"
                )
            upload_response = await asyncio.to_thread(upload_to_cloudinary)
            image_url = upload_response.get("secure_url")
        except Exception as upload_e:
            print("--- [WARNING: Cloudinary Upload Failed] ---")
            print(f"Error: {upload_e}")
            print("-----------------------------------------")
            # Không raise lỗi, cho phép tiếp tục trả về kết quả OCR văn bản
            image_url = None

        return {
            "status": "success",
            "result": result,
            "image_url": image_url
        }

    except Exception as e:
        print("--- [CRITICAL ERROR IN SCAN_MEDICINE] ---")
        traceback.print_exc() 
        print("-----------------------------------------")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Xóa cả ảnh gốc và ảnh đã xử lý để giải phóng dung lượng ổ cứng
        if os.path.exists(temp_path):
            os.remove(temp_path)
        if processed_path and os.path.exists(processed_path):
            os.remove(processed_path)