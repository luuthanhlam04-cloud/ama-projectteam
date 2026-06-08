import os
import json
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

    async def get_response(self, system_prompt: str, user_query: str, history: list = None) -> str:
        try:
            messages = [{"role": "system", "content": system_prompt}]
            if history:
                for msg in history:
                    messages.append({"role": msg["role"], "content": msg["content"]})
            messages.append({"role": "user", "content": user_query})

            completion = await self.client.chat.completions.create(
                model=self.model,
                messages=messages
            )
            return completion.choices[0].message.content
        except Exception as e:
            print(f"Lỗi khi gọi OpenRouter: {e}")
            raise Exception("Không thể kết nối tới mô hình AI.")

    async def get_response_with_tools(self, system_prompt: str, user_query: str, tools: list = None, tool_handlers: dict = None, history: list = None) -> str:
        try:
            messages = [{"role": "system", "content": system_prompt}]
            if history:
                for msg in history:
                    messages.append({"role": msg["role"], "content": msg["content"]})
            messages.append({"role": "user", "content": user_query})
            
            completion = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=tools,
                tool_choice="auto" if tools else "none"
            )
            
            response_message = completion.choices[0].message
            
            # Check if model wants to call tools
            if response_message.tool_calls:
                # Add assistant message to history
                messages.append(response_message)
                
                # Execute all tool calls
                for tool_call in response_message.tool_calls:
                    function_name = tool_call.function.name
                    function_args = json.loads(tool_call.function.arguments)
                    
                    if tool_handlers and function_name in tool_handlers:
                        # Gọi hàm thực tế trong backend
                        print(f"AI đang gọi hàm: {function_name} với tham số {function_args}")
                        function_response = await tool_handlers[function_name](**function_args)
                        
                        # Gắn kết quả vào lịch sử hội thoại cho AI đọc
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "name": function_name,
                            "content": json.dumps(function_response, ensure_ascii=False)
                        })
                
                # Gọi lại AI lần 2 để nó tổng hợp câu trả lời từ kết quả của Tool
                second_completion = await self.client.chat.completions.create(
                    model=self.model,
                    messages=messages
                )
                return second_completion.choices[0].message.content
                
            return response_message.content
        except Exception as e:
            print(f"Lỗi khi gọi OpenRouter với Tools: {e}")
            raise Exception("Không thể kết nối tới mô hình AI (có công cụ).")

gemini_service = GeminiService()