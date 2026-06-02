import os
import traceback # Thêm thư viện này
from fastapi import APIRouter, UploadFile, File, HTTPException
from services.image_processing import preprocess_for_ocr
from services.ocr_engine import process_medicine_ocr

router = APIRouter()

@router.post("/")
async def scan_medicine(file: UploadFile = File(...)):
    upload_dir = "static/user_uploads"
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
        
    temp_path = os.path.join(upload_dir, file.filename)
    processed_path = None
    
    try:
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        processed_path = preprocess_for_ocr(temp_path)
        result = await process_medicine_ocr(processed_path)
        
        return {
            "status": "success",
            "result": result,
            "processed_image": f"/{processed_path}"
        }

    except Exception as e:
        # IN LỖI CHI TIẾT RA TERMINAL ĐỂ DEBUG
        print("--- [CRITICAL ERROR IN SCAN_MEDICINE] ---")
        traceback.print_exc() 
        print("-----------------------------------------")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        if processed_path and os.path.exists(processed_path):
            os.remove(processed_path)