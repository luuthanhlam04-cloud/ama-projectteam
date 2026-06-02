from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ai_logic.rag_handler import rag_handler
from ai_logic.gemini_service import gemini_service

router = APIRouter()

class ChatRequest(BaseModel):
    text: str | None = None

@router.post("/chat")
async def chat_endpoint(user_input: ChatRequest):
    try:
        query_text = user_input.text
        if not query_text or not query_text.strip():
            raise HTTPException(status_code=400, detail="Vui lòng nhập văn bản.")
        
        query_text = query_text.strip()
        
        # 1. Truy vấn RAG lấy context và danh sách ảnh tổng
        context, retrieved_images = rag_handler.query_vector_db(query_text)
        
        # 2. Xây dựng system prompt với các quy tắc an toàn và cảnh báo
        system_prompt = f"""
        Bạn là trợ lý y tế ảo chuyên nghiệp quản lý tủ thuốc gia đình.
        Dưới đây là TOÀN BỘ danh sách các loại thuốc hiện có trong tủ:
        
        <Danh_sách_thuốc_hiện_có>
        {context}
        </Danh_sách_thuốc_hiện_có>
        
        QUY TẮC TRẢ LỜI (tuân thủ nghiêm ngặt):
        1. Chỉ liệt kê các thuốc thực sự phù hợp với triệu chứng người dùng mô tả. Nếu có nhiều thuốc, hãy sắp xếp theo thứ tự ưu tiên an toàn (Paracetamol > NSAID > khác) và phân loại rõ ràng.
        2. Với mỗi thuốc, cung cấp đủ: tên, chỉ định (diễn giải sát với triệu chứng), cách dùng cụ thể (nếu có), và chống chỉ định/lưu ý.
        3. LUÔN thêm câu cảnh báo: "Ứng dụng chỉ mang tính tham khảo, không thay thế lời khuyên của bác sĩ. Nếu triệu chứng nặng, kéo dài hoặc có dấu hiệu nguy hiểm (sốt cao, nôn mửa, đau dữ dội, chảy máu...), hãy đến cơ sở y tế ngay."
        4. Nếu người dùng có bệnh nền (suy gan, suy thận, loét dạ dày, hen suyễn, thai kỳ), bạn PHẢI đặt các cảnh báo chống chỉ định lên đầu câu trả lời, trước khi đưa ra hướng dẫn dùng thuốc.
        5. Đặc biệt với đau bụng: Khuyến cáo không tự ý dùng NSAID (ibuprofen, diclofenac, meloxicam) nếu chưa rõ nguyên nhân vì có thể gây loét dạ dày. Ưu tiên các thuốc giảm co thắt hoặc kháng acid nếu phù hợp.
        6. Tuyệt đối không được thêm bất kỳ loại thuốc nào không có trong danh sách trên.
        7. Nếu không tìm thấy thuốc phù hợp, trả lời chính xác: "Hiện tại trong kho không có thuốc nào phù hợp với yêu cầu của bạn."
        """
        
        # 3. Gửi sang Gemini để lấy phản hồi
        bot_reply = await gemini_service.get_response(system_prompt, query_text)
        
        # 4. Lọc ảnh chỉ hiển thị khi AI thực sự khuyến nghị (không chỉ nhắc tên một cách tiêu cực)
        final_images = []
        bot_reply_lower = bot_reply.lower()
        
        # Chuẩn bị danh sách thuốc bị cảnh báo không nên dùng (nếu có)
        negative_indicators = ["không nên dùng", "chống chỉ định", "không dùng", "tránh dùng", "cảnh báo không dùng"]
        
        for img in retrieved_images:
            brand_lower = img["brand_name"].lower()
            # Kiểm tra xem AI có nhắc đến tên thuốc trong câu trả lời không
            if brand_lower in bot_reply_lower:
                # Tìm vị trí của tên thuốc trong câu trả lời
                # Nếu trước tên thuốc có các từ phủ định (ví dụ "không dùng Panadol") thì bỏ qua
                idx = bot_reply_lower.find(brand_lower)
                start = max(0, idx - 50)
                surrounding = bot_reply_lower[start:idx+len(brand_lower)+50]
                is_negative = any(neg in surrounding for neg in negative_indicators)
                if not is_negative:
                    if img["brand_name"] not in [i["brand_name"] for i in final_images]:
                        final_images.append(img)
        
        # Nếu bot thông báo không có thuốc, clear ảnh
        if "Hiện tại trong kho không có thuốc nào" in bot_reply:
            final_images = []
        
        # Log để debug (có thể ghi vào file)
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