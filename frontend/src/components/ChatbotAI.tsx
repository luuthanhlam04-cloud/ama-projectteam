import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Mic } from 'lucide-react';
import axios from 'axios';

// Định nghĩa cấu trúc tin nhắn để có thể chứa cả hình ảnh trả về từ Backend
interface Message {
  sender: 'ai' | 'user';
  text: string;
  images?: any[];
}

export default function ChatbotAI() {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'ai', text: 'Xin chào! Tôi là trợ lý AI quản lý tủ thuốc. Bạn đang gặp triệu chứng gì?' }
  ]);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ==================== HÀM GIAO TIẾP VỚI BACKEND ====================
  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userQuery = inputText;
    // 1. Hiển thị câu hỏi của người dùng lên màn hình ngay lập tức
    setMessages(prev => [...prev, { sender: 'user', text: userQuery }]);
    setInputText('');
    setIsLoading(true);

    try {
      // 2. Gửi yêu cầu qua Backend FastAPI bằng Axios
      const response = await axios.post('http://localhost:8000/api/chat', {
        text: userQuery
      });

      // 3. Nhận dữ liệu trả về (gồm câu chữ và hình ảnh)
      const data = response.data;
      
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        text: data.bot_reply,         // Câu trả lời từ Gemini
        images: data.matched_images   // Mảng ảnh RAG quét được
      }]);

    } catch (error) {
      console.error("Lỗi kết nối Backend:", error);
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        text: 'Xin lỗi, tôi không thể kết nối tới máy chủ AI lúc này. Vui lòng kiểm tra lại Backend.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setInputText("Tôi đang bị nhức đầu và sổ mũi, trong tủ có thuốc nào dùng được không?");
    } else {
      setIsRecording(true);
      setInputText("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-800/50 rounded-2xl border border-slate-600/50 overflow-hidden relative">
      
      {/* VÙNG HIỂN THỊ TIN NHẮN */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.sender === 'user' ? 'bg-emerald-500' : 'bg-slate-700'}`}>
              {msg.sender === 'user' ? <User size={16} className="text-slate-900" /> : <Bot size={16} className="text-emerald-400" />}
            </div>
            
            <div className={`flex flex-col gap-2 max-w-[80%]`}>
              {/* Bong bóng chữ */}
              <div className={`p-3 rounded-2xl text-sm whitespace-pre-wrap ${msg.sender === 'user' ? 'bg-emerald-500/20 text-emerald-100 rounded-tr-none border border-emerald-500/30' : 'bg-slate-700/50 text-slate-200 rounded-tl-none border border-slate-600/50'}`}>
                {msg.text}
              </div>

              {/* Nếu AI có trả về danh sách thuốc kèm ảnh, hiển thị ở đây */}
              {msg.images && msg.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {msg.images.map((img: any, i: number) => (
                    <div key={i} className="flex flex-col items-center bg-slate-800 border border-slate-600 p-2 rounded-xl">
                      {img.url ? (
                        <img 
                          src={img.url.startsWith('http') ? img.url : `http://localhost:8000${img.url}`} 
                          alt={img.brand_name} 
                          className="w-16 h-16 object-cover rounded-lg bg-white" 
                        />
                      ) : (
                        <div className="w-16 h-16 bg-slate-700 rounded-lg flex items-center justify-center text-[10px] text-slate-400 text-center px-1">Chưa có ảnh</div>
                      )}
                      <span className="text-[10px] text-emerald-400 mt-1 font-semibold max-w-[64px] truncate" title={img.brand_name}>{img.brand_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Hiệu ứng gõ phím khi chờ Backend trả lời */}
        {isLoading && (
          <div className="flex gap-3 flex-row items-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-slate-700"><Bot size={16} className="text-emerald-400" /></div>
            <div className="flex gap-2 p-3 rounded-2xl bg-slate-700/50 text-slate-400 border border-slate-600/50 items-center">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* THANH NHẬP CHỮ VÀ MIC */}
      <div className="p-3 border-t border-slate-700/50 bg-slate-800 flex items-center gap-2 shrink-0">
        <button onClick={toggleRecording} className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${isRecording ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}><Mic size={18} /></button>
        <input 
          type="text" 
          value={inputText} 
          onChange={(e) => setInputText(e.target.value)} 
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} 
          placeholder={isRecording ? "Hệ thống đang thu âm..." : "Hỏi về triệu chứng của bạn..."} 
          disabled={isRecording || isLoading} 
          className="flex-1 bg-slate-900 border border-slate-700 rounded-full px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 disabled:opacity-50 transition-opacity" 
        />
        <button 
          onClick={handleSendMessage} 
          disabled={isRecording || !inputText.trim() || isLoading} 
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-50 disabled:bg-slate-700 bg-emerald-500 hover:bg-emerald-400"
        >
          <Send size={18} className="text-slate-900 ml-1" />
        </button>
      </div>
    </div>
  );
}