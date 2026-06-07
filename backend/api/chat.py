from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ai_logic.rag_handler import rag_handler
from ai_logic.gemini_service import gemini_service
from sqlmodel import Session, select
from core.database import engine
from models.user_inventory import UserInventory
import re

router = APIRouter()

class ChatRequest(BaseModel):
    text: str | None = None
    user_id: str | None = "demo_user_2026"

@router.post("")
async def chat_endpoint(user_input: ChatRequest):
    try:
        query_text = user_input.text
        if not query_text or not query_text.strip():
            raise HTTPException(status_code=400, detail="Vui lòng nhập văn bản.")
        
        query_text = query_text.strip()
        user_id = user_input.user_id
        
        # Biến để lưu trữ ảnh nếu RAG được gọi qua tool
        retrieved_images_list = []
        
        # --- ĐỊNH NGHĨA TOOLS ---
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "search_general_medicine",
                    "description": "Tìm kiếm thông tin thuốc từ cơ sở dữ liệu y tế tĩnh. Gọi hàm này khi người dùng hỏi về công dụng, liều dùng, tác dụng phụ của một loại thuốc, hoặc hỏi tư vấn triệu chứng bệnh lý chung (không nói là trong tủ thuốc của họ).",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Câu truy vấn tìm kiếm thuốc hoặc triệu chứng (ví dụ: 'thuốc trị đau đầu', 'paracetamol')"
                            }
                        },
                        "required": ["query"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_my_cabinet",
                    "description": "Lấy danh sách các loại thuốc đang có sẵn trong tủ thuốc cá nhân của người dùng. Gọi hàm này khi người dùng hỏi 'tôi đang có thuốc gì', 'trong tủ nhà tôi còn thuốc X không', hoặc 'có thuốc nào chữa bệnh Y trong tủ không'.",
                    "parameters": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                }
            }
        ]
        
        # --- HÀM XỬ LÝ (HANDLERS) ---
        async def handle_search_general(query: str):
            nonlocal retrieved_images_list
            context, images = rag_handler.query_vector_db(query)
            retrieved_images_list.extend(images)
            return {"medicine_data_found": context}

        async def handle_get_cabinet():
            with Session(engine) as session:
                statement = select(UserInventory).where(UserInventory.user_id == user_id).order_by(UserInventory.id.desc())
                results = session.exec(statement).all()
                if not results:
                    return {"cabinet_inventory": "Tủ thuốc cá nhân hiện đang trống. Không có thuốc nào."}
                
                cabinet_data = []
                for item in results:
                    cabinet_data.append({
                        "name": item.name,
                        "type": item.type,
                        "quantity": item.qty,
                        "status": item.status,
                        "details": item.medicine_details
                    })
                return {"cabinet_inventory": cabinet_data}

        tool_handlers = {
            "search_general_medicine": handle_search_general,
            "get_my_cabinet": handle_get_cabinet
        }

        # --- SYSTEM PROMPT MỚI ---
        system_prompt = """
Bạn là trợ lý y tế ảo chuyên nghiệp quản lý tủ thuốc gia đình.
Nếu người dùng chỉ chào hỏi bình thường, hãy chào lại thân thiện và hỏi họ cần giúp gì.
KHI NGƯỜI DÙNG HỎI VỀ THUỐC HAY BỆNH, HÃY DÙNG TOOL PHÙ HỢP ĐỂ TÌM THÔNG TIN.

QUY TẮC TRẢ LỜI:
1. **PHÁT HIỆN ĐỐI TƯỢNG NHẠY CẢM**: "mang thai", "trẻ em", "suy gan"... CẢNH BÁO AN TOÀN ĐẦU TIÊN!
2. **LIỆT KÊ THUỐC**: Nếu họ hỏi thuốc trong tủ, chỉ khuyên dùng những thuốc mà tủ thuốc trả về. Nếu tủ có Paracetamol và phù hợp, hãy khuyên dùng. Sắp xếp: Paracetamol > thuốc không kê đơn > NSAID.
3. **CẢNH BÁO LUÔN CÓ**: "Ứng dụng chỉ mang tính tham khảo, không thay thế lời khuyên bác sĩ..."
4. **KHÔNG CÓ THUỐC**: Nếu tìm tủ không có thuốc phù hợp, hãy khuyên họ đi mua hoặc đi khám.
"""
        
        # 3. Gửi sang Gemini
        bot_reply = await gemini_service.get_response_with_tools(
            system_prompt=system_prompt, 
            user_query=query_text,
            tools=tools,
            tool_handlers=tool_handlers
        )
        
        # 4. Lọc ảnh cải tiến
        final_images = []
        bot_reply_lower = bot_reply.lower()
        
        # Các cụm từ cảnh báo không nên dùng
        negative_phrases = [
            "không nên dùng", "chống chỉ định", "không dùng", "tránh dùng",
            "cảnh báo không dùng", "không được dùng", "cấm dùng",
            "không khuyến cáo", "không an toàn", "có thể gây hại"
        ]
        
        # Tách câu dựa trên dấu kết thúc câu
        sentences = re.split(r'[.!?]', bot_reply_lower)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        for img in retrieved_images_list:
            brand_name = img["brand_name"]
            brand_lower = brand_name.lower()
            if brand_lower not in bot_reply_lower:
                continue
            
            is_negative = False
            for sent in sentences:
                if brand_lower in sent:
                    if any(phrase in sent for phrase in negative_phrases):
                        is_negative = True
                        break
            
            if not is_negative:
                if brand_name not in [i["brand_name"] for i in final_images]:
                    final_images.append(img)
        
        # Nếu bot nói không có thuốc phù hợp thì clear ảnh
        if "hiện tại trong kho không có thuốc nào" in bot_reply_lower or "tủ thuốc cá nhân hiện đang trống" in bot_reply_lower:
            final_images = []
        
        # Log
        print(f"User: {query_text}")
        print(f"Bot reply preview: {bot_reply[:200]}...")
        print(f"Matched images: {[i['brand_name'] for i in final_images]}")
        
        return {
            "user_ask": query_text,
            "bot_reply": bot_reply,
            "matched_images": final_images,
            "status": "Thành công"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in chat_endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))
