from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    user_id: str

@router.post("/")
async def chat_with_ai(request: ChatRequest):
    # Logic: Search Qdrant -> Prompt LLM -> Return Text & Audio Link
    return {
        "answer": "Hệ thống đang sẵn sàng xử lý câu hỏi của bạn.",
        "voice_url": None
    }