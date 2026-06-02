import os
import base64
import httpx
import easyocr
import asyncio
from rapidfuzz import fuzz
from dotenv import load_dotenv
from sqlmodel import Session, select
from core.database import engine

# Kiểm tra lại tên thư mục trong backend/ là 'model' hay 'models'
# Nếu thư mục là 'models', hãy đổi dòng dưới thành: from models import Medicine
try:
    from model import Medicine
except ImportError:
    from models import Medicine

load_dotenv()
reader = easyocr.Reader(['vi', 'en'], gpu=False)
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

async def call_openrouter_vision(image_path: str):
    base64_image = encode_image(image_path)
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "HTTP-Referer": "http://localhost:8000",
                    "X-Title": "AMA Project"
                },
                json={
                    "model": "google/gemini-2.0-flash-001",
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": "Identify the medicine brand name in this image. Return only the name."},
                                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64_image}"}}
                            ]
                        }
                    ]
                },
                timeout=30.0
            )
            result = response.json()
            if "choices" in result and len(result["choices"]) > 0:
                return result['choices'][0]['message']['content'].strip()
            return "API Error"
        except Exception:
            return "Connection Error"

async def process_medicine_ocr(image_path: str):
    # --- TẦNG 1: LOCAL OCR ---
    detected_text = ""
    try:
        loop = asyncio.get_event_loop()
        # detail=0 để lấy text, batch_size=1 để fix lỗi preds_str trên CPU
        results = await loop.run_in_executor(
            None, 
            lambda: reader.readtext(image_path, detail=0, batch_size=1)
        )
        detected_text = " ".join(results).lower()
        print(f"DEBUG: Detected Text: {detected_text}")
    except Exception as e:
        print(f"OCR Local Error: {e}")

    if detected_text:
        with Session(engine) as session:
            db_medicines = session.exec(select(Medicine)).all()
            best_match = None
            highest_score = 0
            
            for med in db_medicines:
                # Sử dụng brand_name theo đúng model/medicine.py
                m_name = getattr(med, "brand_name", "").lower()
                if not m_name: continue
                
                score = fuzz.partial_ratio(detected_text, m_name)
                
                # So khớp thêm với search_keywords để tăng độ chính xác
                if hasattr(med, "search_keywords") and med.search_keywords:
                    for kw in med.search_keywords:
                        kw_score = fuzz.partial_ratio(detected_text, kw.lower())
                        score = max(score, kw_score)

                if score > highest_score:
                    highest_score = score
                    best_match = med

            if highest_score > 85 and best_match:
                return {
                    "id": best_match.id,
                    "name": best_match.brand_name,
                    "confidence": round(highest_score, 2),
                    "method": "local",
                    "image_url": getattr(best_match, "image_url", None)
                }

    # --- TẦNG 2: CLOUD FALLBACK ---
    cloud_name = await call_openrouter_vision(image_path)
    return {
        "name": cloud_name,
        "confidence": 100,
        "method": "cloud"
    }