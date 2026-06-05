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
                m_name = med.name.lower()
                score = fuzz.partial_ratio(detected_text, m_name)
                
                if getattr(med, "search_keywords", None):
                    for kw in med.search_keywords:
                        kw_score = fuzz.partial_ratio(detected_text, kw.lower())
                        score = max(score, kw_score)

                if score > highest_score:
                    highest_score = score
                    best_match = med

            if highest_score > 85 and best_match:
                return {
                    "id": best_match.id,
                    "name": best_match.name,
                    "confidence": round(highest_score, 2),
                    "method": "local_fuzzy",
                    "image_url": getattr(best_match, "image_url", f"/static/medicine_assets/{best_match.id}.png")
                }

    cloud_name = await call_openrouter_vision(image_path)
    return {
        "name": cloud_name,
        "confidence": 100,
        "method": "cloud"
    }