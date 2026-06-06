from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ai_logic.rag_handler import rag_handler
from ai_logic.gemini_service import gemini_service
import re

router = APIRouter()

class ChatRequest(BaseModel):
    text: str | None = None

@router.post("")
async def chat_endpoint(user_input: ChatRequest):
    try:
        query_text = user_input.text
        if not query_text or not query_text.strip():
            raise HTTPException(status_code=400, detail="Vui lòng nhập văn bản.")
        
        query_text = query_text.strip()
        
        # 1. Truy vấn RAG lấy context và danh sách ảnh tổng
        context, retrieved_images = rag_handler.query_vector_db(query_text)
        
        # 2. Xây dựng system prompt (giữ nguyên như bạn đã cập nhật)
        system_prompt = f"""
Bạn là trợ lý y tế ảo chuyên nghiệp quản lý tủ thuốc gia đình.
Dưới đây là TOÀN BỘ danh sách các loại thuốc hiện có trong tủ:

<Danh_sách_thuốc_hiện_có>
{context}
</Danh_sách_thuốc_hiện_có>

QUY TẮC TRẢ LỜI (tuân thủ nghiêm ngặt, ưu tiên cao nhất là an toàn người dùng):

1. **PHÁT HIỆN ĐỐI TƯỢNG NHẠY CẢM**: Nếu người dùng đề cập đến bất kỳ từ khóa nào sau đây, bạn PHẢI đặt cảnh báo an toàn lên ĐẦU tiên, TRƯỚC KHI liệt kê bất kỳ thuốc nào:
   - "mang thai", "có thai", "thai kỳ", "bà bầu" → Cảnh báo: "Thai kỳ là giai đoạn rất nhạy cảm. Tuyệt đối không tự ý dùng bất kỳ thuốc nào, kể cả Paracetamol, mà không có chỉ định của bác sĩ. Hãy tham khảo ý kiến bác sĩ trước khi dùng bất kỳ thuốc nào."
   - "trẻ em", "bé", "con tôi" → Cảnh báo về liều lượng và khuyến cáo hỏi bác sĩ nhi khoa.
   - "suy gan", "suy thận", "loét dạ dày", "hen suyễn" → Đẩy chống chỉ định của các thuốc liên quan lên đầu.

2. **LIỆT KÊ THUỐC**:
   - Chỉ liệt kê các thuốc thực sự phù hợp với triệu chứng.
   - Với mỗi thuốc, cung cấp: tên, phân loại, chỉ định (diễn giải sát với triệu chứng), cách dùng cụ thể, chống chỉ định/lưu ý.
   - Sắp xếp theo thứ tự ưu tiên an toàn: **Paracetamol > thuốc không kê đơn an toàn > NSAID > khác**.
   - Đối với phụ nữ mang thai, chỉ đề xuất Paracetamol (nếu thực sự cần) và phải kèm dòng: "Cần hỏi ý kiến bác sĩ trước khi dùng, kể cả Paracetamol."

3. **KHÔNG DÙNG THUỐC**:
   - Nếu có thuốc chống chỉ định rõ cho thai kỳ (ví dụ: Berberin, Decolgen Forte, Tiffy, Ibuprofen, ...), hãy nêu rõ "Không nên dùng thuốc này khi mang thai" và giải thích ngắn gọn.
   - Nếu không có thuốc nào phù hợp an toàn, hãy khuyến nghị các biện pháp không dùng thuốc (nghỉ ngơi, uống nhiều nước, súc miệng nước muối, xông hơi...) và khuyên đi khám bác sĩ.

4. **LUÔN THÊM CÂU CẢNH BÁO** (ở cuối hoặc xen kẽ): "Ứng dụng chỉ mang tính tham khảo, không thay thế lời khuyên của bác sĩ. Nếu triệu chứng nặng, kéo dài hoặc có dấu hiệu nguy hiểm (sốt cao, nôn mửa, đau dữ dội, chảy máu...), hãy đến cơ sở y tế ngay."

5. **TRÁNH LẶP THÔNG TIN**: Không lặp lại cùng một tên thuốc hoặc cùng một câu cảnh báo nhiều lần trong cùng một phản hồi.

6. **NẾU KHÔNG CÓ THUỐC PHÙ HỢP**: Trả lời chính xác: "Hiện tại trong kho không có thuốc nào phù hợp với yêu cầu của bạn." và kèm theo khuyến cáo chung.
"""
        
        # 3. Gửi sang Gemini
        bot_reply = await gemini_service.get_response(system_prompt, query_text)
        
        # 4. Lọc ảnh cải tiến: dựa trên câu, không chỉ 50 ký tự
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
        
        for img in retrieved_images:
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
        if "hiện tại trong kho không có thuốc nào" in bot_reply_lower:
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
