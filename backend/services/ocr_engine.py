import os
import base64
import httpx
import easyocr
import asyncio
from rapidfuzz import fuzz
from dotenv import load_dotenv
from sqlmodel import Session, select
from core.database import engine

try:
    from models.medicine import Medicine
except ImportError:
    from model import Medicine

load_dotenv()

reader = easyocr.Reader(['vi', 'en'], gpu=False)
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "").strip()
CHAT_MODEL = os.getenv("CHAT_MODEL", "google/gemini-2.0-flash-001")

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
                    "Content-Type": "application/json"
                },
                json={
                    "model": CHAT_MODEL,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": "Identify the medicine brand name. Return only the name."},
                                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                            ]
                        }
                    ]
                },
                timeout=45.0
            )
            if response.status_code == 200:
                return response.json()['choices'][0]['message']['content'].strip()
            
            print(f"[OPENROUTER ERROR {response.status_code}]: {response.text}")
            return "Unknown"
        except Exception as e:
            print(f"[HTTPX EXCEPTION]: {str(e)}")
            return "API Error"

async def process_medicine_ocr(image_path: str):
    detected_text = ""
    try:
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(None, lambda: reader.readtext(image_path, detail=0, batch_size=1))
        detected_text = " ".join(results).lower().strip()
    except Exception as e:
        print(f"OCR Local Error: {e}")

    if detected_text:
        with Session(engine) as session:
            db_medicines = session.exec(select(Medicine)).all()
            best_match = None
            highest_score = 0
            
            for med in db_medicines:
                # Ưu tiên 1: So khớp trực tiếp tên thuốc (Brand name)
                m_name = med.name.lower()
                
                # Dùng token_set_ratio sẽ tốt hơn cho các chuỗi OCR lộn xộn
                name_score = fuzz.token_set_ratio(m_name, detected_text)
                
                # Ưu tiên 2: So khớp với các keyword phụ
                keyword_score = 0
                if getattr(med, "search_keywords", None):
                    for kw in med.search_keywords:
                        kw_lower = kw.lower()
                        # Dùng partial_ratio cho keyword nhưng phạt nhẹ nếu keyword quá ngắn
                        kw_match = fuzz.partial_ratio(kw_lower, detected_text)
                        if kw_match > keyword_score:
                            keyword_score = kw_match

                # Tính điểm tổng hợp: Tên thuốc có giá trị quyết định hơn keyword phụ
                # Nếu name_score cao, lấy name_score. Nếu keyword cao, lấy keyword nhưng giảm trọng số đi một chút (vd: 0.9)
                # Để tránh việc keyword "cướp" mất kết quả của brand_name
                final_score = max(name_score, keyword_score * 0.95)

                # Dùng >= thay vì > để nếu có đồng điểm, thuật toán có thể 
                # bổ sung thêm logic "Tie-breaker" (bầu chọn) ở đây nếu cần
                if final_score > highest_score:
                    highest_score = final_score
                    best_match = med

            # Nâng ngưỡng tin cậy lên 85 (có thể tinh chỉnh thành 88-90 tùy thực tế)
            if highest_score >= 85 and best_match:
                return {
                    "id": best_match.id,
                    "name": best_match.name,
                    "confidence": round(highest_score, 2),
                    "method": "local_fuzzy_optimized",
                    "image_url": getattr(best_match, "image_url", f"/static/medicine_assets/{best_match.id}.png")
                }