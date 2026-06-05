import os
import json
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
CHAT_MODEL = os.getenv("CHAT_MODEL", "google/gemini-2.5-flash-lite")

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

async def call_openrouter_vision(image_path: str):
    base64_image = encode_image(image_path)
    
    # Ép buộc mô hình trả về cấu trúc JSON thuần túy
    system_prompt = """Identify the medicine from the image. Return ONLY a raw JSON object with no markdown formatting. The JSON must contain the exact following keys:
"brand_name" (string), "generic_name" (string), "category" (string), "dosage_form" (string), "strength" (string), "indications" (string), "contraindications" (string), "side_effects" (string), "usage_instruction" (string), "storage" (string), "search_keywords" (array of strings).
If any information is unknown, assign the value "N/A"."""

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
                                {"type": "text", "text": system_prompt},
                                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                            ]
                        }
                    ]
                },
                timeout=45.0
            )
            
            if response.status_code == 200:
                raw_text = response.json()['choices'][0]['message']['content'].strip()
                
                # Khử bọc Markdown nếu API sinh lỗi định dạng
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]
                    
                try:
                    return json.loads(raw_text.strip())
                except json.JSONDecodeError:
                    return {"brand_name": raw_text[:50]} # Dự phòng nếu lỗi phân giải JSON
            
            print(f"[OPENROUTER ERROR {response.status_code}]: {response.text}")
            return {"brand_name": "Unknown"}
        except Exception as e:
            print(f"[HTTPX EXCEPTION]: {str(e)}")
            return {"brand_name": "API Error"}

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
                m_name = med.name.lower()
                name_score = fuzz.token_set_ratio(m_name, detected_text)
                
                keyword_score = 0
                if getattr(med, "search_keywords", None):
                    for kw in med.search_keywords:
                        kw_lower = kw.lower()
                        kw_match = fuzz.partial_ratio(kw_lower, detected_text)
                        if kw_match > keyword_score:
                            keyword_score = kw_match

                final_score = max(name_score, keyword_score * 0.95)

                if final_score > highest_score:
                    highest_score = final_score
                    best_match = med

            if highest_score >= 85 and best_match:
                return {
                    "id": best_match.id,
                    "name": best_match.name,
                    "confidence": round(highest_score, 2),
                    "method": "local_fuzzy_optimized",
                    "image_url": getattr(best_match, "image_url", f"/static/medicine_assets/{best_match.id}.png")
                }

    # --- TẦNG 2: CLOUD FALLBACK (Gemini) ---
    cloud_data = await call_openrouter_vision(image_path)
    
    # Định tuyến dữ liệu an toàn nếu API không trả về dict
    if not isinstance(cloud_data, dict):
        cloud_data = {"brand_name": str(cloud_data)}

    # Khớp nối trường dữ liệu
    return {
        "id": None,
        "name": cloud_data.get("brand_name", "Unknown"), 
        "brand_name": cloud_data.get("brand_name", "Unknown"),
        "generic_name": cloud_data.get("generic_name", "N/A"),
        "category": cloud_data.get("category", "N/A"),
        "dosage_form": cloud_data.get("dosage_form", "N/A"),
        "strength": cloud_data.get("strength", "N/A"),
        "indications": cloud_data.get("indications", "N/A"),
        "contraindications": cloud_data.get("contraindications", "N/A"),
        "side_effects": cloud_data.get("side_effects", "N/A"),
        "usage_instruction": cloud_data.get("usage_instruction", "N/A"),
        "storage": cloud_data.get("storage", "N/A"),
        "search_keywords": cloud_data.get("search_keywords", []),
        "image_url": None,
        "method": "cloud",
        "confidence": 100
    }