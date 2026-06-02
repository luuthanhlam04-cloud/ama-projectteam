import os
from dotenv import load_dotenv
from openai import AsyncOpenAI

# Tự động tìm và nạp các biến từ file .env vào hệ thống
load_dotenv()

class GeminiService:
    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        
        if not self.api_key:
            raise ValueError("Không tìm thấy OPENROUTER_API_KEY trong file .env")

        self.client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=self.api_key
        )
        self.model = "google/gemini-2.5-flash-lite"

    async def get_response(self, system_prompt: str, user_query: str) -> str:
        try:
            completion = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_query}
                ]
            )
            return completion.choices[0].message.content
        except Exception as e:
            print(f"Lỗi khi gọi OpenRouter: {e}")
            raise Exception("Không thể kết nối tới mô hình AI.")

gemini_service = GeminiService()