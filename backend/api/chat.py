from fastapi import APIRouter, HTTPException, Header, Response, Cookie
from pydantic import BaseModel
from typing import Optional
from ai_logic.rag_handler import rag_handler
from ai_logic.gemini_service import gemini_service
from sqlmodel import Session, select
from core.database import engine
from models.user_inventory import UserInventory
from services.redis_service import redis_service, generate_signed_session_id, verify_session_id
import re
import logging

# Setup Logger
logger = logging.getLogger("ama_chat_api")
logger.setLevel(logging.DEBUG)

router = APIRouter()

class ChatRequest(BaseModel):
    text: str | None = None
    user_id: str | None = "demo_user_2026"

@router.post("")
async def chat_endpoint(
    user_input: ChatRequest,
    response: Response,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    session_id: Optional[str] = Cookie(None)
):
    try:
        # 1. Xác thực và quản lý Session ID
        signed_session_id = x_session_id or session_id
        session_uuid = None
        
        if signed_session_id:
            session_uuid = verify_session_id(signed_session_id)
            
        if not session_uuid:
            # Sinh session mới nếu rỗng hoặc chữ ký không hợp lệ
            signed_session_id = generate_signed_session_id()
            session_uuid = verify_session_id(signed_session_id)
            logger.info(f"Session verification failed or session is new. Issued signed session ID: {signed_session_id}")
        
        # Đặt cookie HttpOnly bảo mật và header phản hồi
        response.headers["X-Session-ID"] = signed_session_id
        response.set_cookie(
            key="session_id",
            value=signed_session_id,
            httponly=True,
            samesite="lax",
            secure=False  # Đặt là True nếu chạy qua HTTPS
        )

        query_text = user_input.text
        if not query_text or not query_text.strip():
            raise HTTPException(status_code=400, detail="Vui lòng nhập văn bản.")
        
        query_text = query_text.strip()
        user_id = user_input.user_id
        
        # 2. Lấy lịch sử hội thoại từ Redis (Fallback tự động nếu Redis offline)
        history = await redis_service.get_history(session_uuid)

        # Biến để lưu trữ ảnh
        retrieved_images_list = []
        
        # Tự động lấy danh sách tủ thuốc
        cabinet_text = ""
        with Session(engine) as session:
            statement = select(UserInventory).where(UserInventory.user_id == user_id).order_by(UserInventory.id.desc())
            results = session.exec(statement).all()
            if results:
                cabinet_text = "Danh sách thuốc trong tủ cá nhân hiện tại:\n"
                for item in results:
                    details_str = ""
                    if isinstance(item.medicine_details, dict):
                        details_str = item.medicine_details.get("indications", "")
                    cabinet_text += f"- Tên: {item.name}, Phân loại: {item.type}, Chỉ định: {details_str}, Số lượng: {item.qty} {item.unit}, image_url: {item.image_url}\n"
                    if item.image_url:
                        retrieved_images_list.append({
                            "brand_name": item.name,
                            "url": item.image_url
                        })
            else:
                cabinet_text = "Tủ thuốc cá nhân hiện đang trống."

        # --- ĐỊNH NGHĨA TOOLS ---
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "search_general_medicine",
                    "description": "Tìm kiếm thông tin thuốc từ cơ sở dữ liệu tĩnh. Nếu tủ thuốc không có thuốc phù hợp, BẮT BUỘC dùng tool này để tìm và đề xuất thuốc mua ngoài.",
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
            }
        ]
        
        # --- HÀM XỬ LÝ (HANDLERS) ---
        async def handle_search_general(query: str):
            nonlocal retrieved_images_list
            import asyncio
            context, images = await asyncio.to_thread(rag_handler.query_vector_db, query)
            retrieved_images_list.extend(images)
            return {"medicine_data_found": context}

        tool_handlers = {
            "search_general_medicine": handle_search_general
        }

        # --- SYSTEM PROMPT MỚI ---
        system_prompt = f"""Bạn là trợ lý y tế ảo chuyên nghiệp quản lý tủ thuốc gia đình.
GIAO TIẾP 100% BẰNG TIẾNG VIỆT CHUẨN.
{cabinet_text}
Nếu người dùng chỉ chào hỏi bình thường, hãy chào lại thân thiện và hỏi họ cần giúp gì.
KHI NGƯỜI DÙNG HỎI VỀ THUỐC HAY BỆNH, HÃY DÙNG TOOL PHÙ HỢP ĐỂ TÌM THÔNG TIN.

QUY TẮC TRẢ LỜI:
1. **PHÁT HIỆN ĐỐI TƯỢNG NHẠY CẢM**: "mang thai", "trẻ em", "suy gan"... CẢNH BÁO AN TOÀN ĐẦU TIÊN!
2. **CÁCH TRẢ LỜI VÀ LỰA CHỌN THUỐC**: 
   - CHỈ đề xuất đúng loại thuốc có công dụng chữa trị trực tiếp triệu chứng/bệnh lý của người dùng. 
   - TUYỆT ĐỐI KHÔNG liệt kê tất cả các loại thuốc đang có trong tủ thuốc (việc này sẽ làm sai lệch hình ảnh và làm người dùng rối). Kể cả khi bạn đọc được danh sách 10 loại thuốc trong tủ, bạn chỉ được nhắc tên 1 hoặc 2 loại thuốc đúng bệnh. Các thuốc không liên quan thì tuyệt đối không được nhắc tới chữ nào.
3. **BẮT BUỘC TỰ ĐỘNG HIỂN THỊ ẢNH**: Bất cứ khi nào bạn liệt kê hoặc khuyên dùng một loại thuốc (từ tủ thuốc hoặc đề xuất mua ngoài), NẾU thuốc đó có `image_url`, bạn **BẮT BUỘC PHẢI** in ra đường dẫn ảnh của nó ở ngay dưới tên thuốc bằng cú pháp Markdown chính xác: `![Tên thuốc](chèn_nguyên_văn_đường_dẫn_image_url_vào_đây)`. Tuyệt đối không được quên thẻ ảnh này.
4. **CẢNH BÁO LUÔN CÓ**: "Ứng dụng chỉ mang tính tham khảo, không thay thế lời khuyên bác sĩ..."
5. **KHÔNG CÓ THUỐC TRONG TỦ / TÌM THUỐC NGOÀI**: Nếu tủ thuốc cá nhân không có thuốc phù hợp với bệnh lý của họ, HOẶC người dùng yêu cầu tư vấn thuốc bên ngoài:
   - BẠN BẮT BUỘC PHẢI TỰ ĐỘNG GỌI TOOL `search_general_medicine` để tìm thông tin về bệnh lý và đề xuất thuốc từ cơ sở dữ liệu y tế (kể cả khi người dùng không yêu cầu thẳng là "hãy tìm trong qdrant/database").
   - Tuyệt đối không được phép từ chối tư vấn bằng câu "Tôi chỉ có thể tư vấn thuốc trong tủ". Bạn CÓ QUYỀN VÀ NGHĨA VỤ phải gọi tool `search_general_medicine`.
   - TUYỆT ĐỐI CHỈ đề xuất các loại thuốc nằm trong danh sách kết quả được trả về trực tiếp bởi tool `search_general_medicine`.
   - NGHIÊM CẤM TỰ Ý ĐỀ XUẤT các thuốc từ kiến thức chung của bạn nếu chúng không có trong kết quả trả về của tool.
"""
        
        # 3. Gửi sang Gemini kèm theo history từ Redis và Tools
        bot_reply = await gemini_service.get_response_with_tools(
            system_prompt=system_prompt, 
            user_query=query_text,
            tools=tools,
            tool_handlers=tool_handlers,
            history=history
        )
        
        if not bot_reply:
            bot_reply = "Xin lỗi, hệ thống AI đang quá tải hoặc không thể xử lý câu hỏi của bạn lúc này. Vui lòng thử lại sau."
        
        # 4. Lọc ảnh cải tiến
        final_images = []
        bot_reply_lower = bot_reply.lower()
        
        # Các cụm từ cảnh báo không nên dùng
        negative_phrases = [
            "không nên dùng", "chống chỉ định", "không dùng", "tránh dùng",
            "cảnh báo không dùng", "không được dùng", "cấm dùng",
            "không khuyến cáo", "không an toàn", "có thể gây hại"
        ]
        
        for img in retrieved_images_list:
            brand_name = img["brand_name"]
            brand_lower = brand_name.lower()
            
            brand_pos = bot_reply_lower.find(brand_lower)
            if brand_pos == -1:
                first_word = brand_lower.split()[0]
                if len(first_word) > 3:
                    brand_pos = bot_reply_lower.find(first_word)
            
            # Khôi phục lại: Nếu bot KHÔNG nhắc tới thuốc này trong câu trả lời, KHÔNG HIỆN!
            if brand_pos == -1:
                continue
                
            is_negative = False
            window_start = max(0, brand_pos - 150)
            window_end = min(len(bot_reply_lower), brand_pos + 500)
            context_window = bot_reply_lower[window_start:window_end]
            is_negative = any(phrase in context_window for phrase in negative_phrases)
            
            # Cho phép hiện ảnh miễn là không bị dính cảnh báo cấm dùng
            if not is_negative:
                if brand_name not in [i["brand_name"] for i in final_images]:
                    final_images.append(img)
        
        # Đã loại bỏ logic xóa `final_images` khi bot nói "không có thuốc phù hợp", 
        # vì nó vô tình xóa luôn ảnh của thuốc được đề xuất mua ngoài từ search_general_medicine.
        
        # 7. Lưu tin nhắn mới vào Redis (nếu Redis online)
        await redis_service.save_message(session_uuid, "user", query_text)
        await redis_service.save_message(session_uuid, "assistant", bot_reply)
        
        # Log
        logger.debug(f"User query: {query_text}")
        logger.debug(f"Bot reply preview: {bot_reply[:200]}...")
        logger.debug(f"Matched images: {[i['brand_name'] for i in final_images]}")
        
        return {
            "user_ask": query_text,
            "bot_reply": bot_reply,
            "matched_images": final_images,
            "session_id": signed_session_id,
            "status": "Thành công"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chat_endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/clear-session")
async def clear_session_endpoint(
    response: Response,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
    session_id: Optional[str] = Cookie(None)
):
    signed_session_id = x_session_id or session_id
    if signed_session_id:
        session_uuid = verify_session_id(signed_session_id)
        if session_uuid:
            await redis_service.clear_session(session_uuid)
            
    # Xóa session ở Client
    response.delete_cookie(key="session_id")
    response.headers["X-Session-ID"] = ""
    logger.info(f"Cleared session history for signed session ID: {signed_session_id}")
    return {"status": "success", "message": "Session history cleared successfully"}
