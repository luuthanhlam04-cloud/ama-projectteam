import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, AlertTriangle, Volume2 } from 'lucide-react';
import axios from 'axios';

interface Message {
  sender: 'ai' | 'user';
  text: string;
  images?: any[];
  audioUrl?: string; 
}

interface ChatbotAIProps {
  isDarkMode: boolean;
}

export default function ChatbotAI({ isDarkMode }: ChatbotAIProps) {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'ai', text: 'Xin chào! Tôi là trợ lý AI y tế. Bạn đang gặp triệu chứng gì?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentInventory = [
    { name: "Panadol Extra", quantity: 10, expiry: "12/2026" }
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userQuery = inputText;
    setMessages(prev => [...prev, { sender: 'user', text: userQuery }]);
    setInputText('');
    setIsLoading(true);

    try {
      const storedSessionId = localStorage.getItem('ama_session_id');
      const headers: any = {};
      if (storedSessionId) {
        headers['X-Session-ID'] = storedSessionId;
      }

      const response = await axios.post('http://localhost:8000/api/chat', {
        text: userQuery,
        inventory: currentInventory, 
        history: [] // Backend bây giờ tự quản lý lịch sử thông qua Redis
      }, {
        headers,
        withCredentials: true
      });

      const data = response.data;
      
      // Lưu trữ Session ID trả về từ Backend
      if (data.session_id) {
        localStorage.setItem('ama_session_id', data.session_id);
      }
      
      const newAiMessage: Message = { 
        sender: 'ai', 
        text: data.bot_reply,
        images: data.matched_images,
        audioUrl: data.audio_url 
      };

      setMessages(prev => [...prev, newAiMessage]);

      if (data.audio_url) {
        const audio = new Audio(`http://localhost:8000${data.audio_url}`);
        audio.play().catch(e => console.log("Trình duyệt chặn autoplay audio:", e));
      }

    } catch (error) {
      console.error("Lỗi kết nối Backend:", error);
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        text: 'Xin lỗi, hệ thống AI đang bảo trì. Vui lòng thử lại sau.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện này để bảo mật dữ liệu?")) {
      setIsLoading(true);
      try {
        const storedSessionId = localStorage.getItem('ama_session_id');
        const headers: any = {};
        if (storedSessionId) {
          headers['X-Session-ID'] = storedSessionId;
        }

        await axios.post('http://localhost:8000/api/chat/clear-session', {}, {
          headers,
          withCredentials: true
        });

        // Xóa thông tin session ở localStorage
        localStorage.removeItem('ama_session_id');
        
        // Reset giao diện về lời chào mặc định
        setMessages([
          { sender: 'ai', text: 'Tôi đã xóa sạch lịch sử hội thoại trên bộ nhớ. Tôi có thể hỗ trợ gì thêm cho bạn?' }
        ]);
        alert("Đã xóa lịch sử trò chuyện thành công!");
      } catch (error) {
        console.error("Lỗi khi xóa session:", error);
        alert("Không thể xóa lịch sử hội thoại trên hệ thống. Vui lòng thử lại.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className={`flex flex-col h-full rounded-2xl border overflow-hidden relative transition-colors duration-300 ${
      isDarkMode ? 'bg-slate-800/50 border-slate-600/50' : 'bg-white border-slate-200'
    }`}>
      
      {/* CẢNH BÁO Y TẾ */}
      <div className={`border-b p-2 flex items-center justify-center gap-2 shrink-0 ${
        isDarkMode ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'
      }`}>
        <AlertTriangle size={14} className={isDarkMode ? 'text-red-400' : 'text-red-500'} />
        <span className={`text-[10px] font-medium uppercase tracking-wider ${
          isDarkMode ? 'text-red-300' : 'text-red-600'
        }`}>
          AI chỉ tư vấn tham khảo, không thay thế chỉ định của bác sĩ
        </span>
      </div>

      {/* THANH ĐẦU ĐỀ CHATBOT VỚI NÚT XÓA LỊCH SỬ */}
      <div className={`px-4 py-2 border-b flex items-center justify-between shrink-0 ${
        isDarkMode ? 'bg-slate-800/80 border-slate-700/50' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className={`text-[11px] font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>Hội thoại bảo mật</span>
        </div>
        <button
          onClick={handleClearHistory}
          disabled={isLoading || messages.length <= 1}
          className={`text-[11px] px-2.5 py-1 rounded-xl font-medium transition-all hover:scale-105 active:scale-95 ${
            isDarkMode 
              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 disabled:opacity-30 disabled:pointer-events-none' 
              : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 disabled:opacity-30 disabled:pointer-events-none'
          }`}
        >
          Xóa lịch sử
        </button>
      </div>

      {/* VÙNG HIỂN THỊ TIN NHẮN */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.sender === 'user' 
                ? 'bg-emerald-500' 
                : (isDarkMode ? 'bg-slate-700' : 'bg-slate-200')
            }`}>
              {msg.sender === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-emerald-500" />}
            </div>
            
            <div className={`flex flex-col gap-2 max-w-[80%]`}>
              <div className={`p-3 rounded-2xl text-sm whitespace-pre-wrap ${
                msg.sender === 'user' 
                  ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/30 rounded-tr-none' : 'bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-tr-none') 
                  : (isDarkMode ? 'bg-slate-700/50 text-slate-200 border border-slate-600/50 rounded-tl-none' : 'bg-slate-100 text-slate-800 border border-slate-200 rounded-tl-none')
              }`}>
                {msg.sender === 'user' ? msg.text : (
                  // Parser đơn giản để biến markdown ![alt](url) thành ảnh và **text** thành in đậm
                  msg.text.split(/(!\[.*?\]\(.*?\))/g).map((part, idx) => {
                    const imgMatch = part.match(/!\[(.*?)\]\((.*?)\)/);
                    if (imgMatch) {
                      return (
                        <img 
                          key={idx}
                          src={imgMatch[2]} 
                          alt={imgMatch[1]} 
                          className="w-full max-w-[250px] rounded-lg my-2 border border-slate-200 shadow-sm"
                        />
                      );
                    }
                    
                    // Xử lý in đậm
                    return (
                      <span key={idx}>
                        {part.split(/(\*\*.*?\*\*)/g).map((bPart, bIdx) => {
                          const boldMatch = bPart.match(/\*\*(.*?)\*\*/);
                          if (boldMatch) return <strong key={bIdx}>{boldMatch[1]}</strong>;
                          return bPart;
                        })}
                      </span>
                    );
                  })
                )}
                
                {msg.audioUrl && (
                  <button 
                    onClick={() => new Audio(`http://localhost:8000${msg.audioUrl}`).play()}
                    className={`mt-2 p-1.5 rounded-full inline-flex items-center gap-1 text-[10px] transition-colors ${
                      isDarkMode ? 'text-emerald-400 hover:text-emerald-300 bg-slate-800/50' : 'text-emerald-600 hover:text-emerald-700 bg-white shadow-sm'
                    }`}
                  >
                    <Volume2 size={12} /> Phát âm thanh
                  </button>
                )}
              </div>

              {msg.images && msg.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {msg.images.map((img: any, i: number) => (
                    <div key={i} className={`flex flex-col items-center border p-2 rounded-xl ${
                      isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-slate-50 border-slate-200'
                    }`}>
                      {img.url ? (
                        <img 
                          src={img.url.startsWith('http') ? img.url : `http://localhost:8000${img.url}`} 
                          alt={img.brand_name} 
                          className="w-16 h-16 object-cover rounded-lg bg-white" 
                        />
                      ) : (
                        <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-[10px] text-center px-1 ${
                          isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'
                        }`}>Chưa có ảnh</div>
                      )}
                      <span className={`text-[10px] mt-1 font-semibold max-w-[64px] truncate ${
                        isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
                      }`} title={img.brand_name}>{img.brand_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3 flex-row items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
              <Bot size={16} className="text-emerald-500" />
            </div>
            <div className={`flex gap-2 p-3 rounded-2xl border items-center ${
              isDarkMode ? 'bg-slate-700/50 border-slate-600/50' : 'bg-slate-100 border-slate-200'
            }`}>
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. THANH NHẬP CHỮ DƯỚI CÙNG */}
      <div className={`p-3 border-t flex items-center gap-2 shrink-0 transition-colors ${
        isDarkMode ? 'border-slate-700/50 bg-slate-800' : 'border-slate-200 bg-slate-50'
      }`}>
        <input 
          type="text" 
          value={inputText} 
          onChange={(e) => setInputText(e.target.value)} 
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} 
          placeholder="Hỏi về triệu chứng của bạn..." 
          disabled={isLoading} 
          className={`flex-1 border rounded-full px-4 py-2.5 text-sm focus:outline-none disabled:opacity-50 transition-colors ${
            isDarkMode 
              ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-emerald-500/50' 
              : 'bg-white border-slate-300 text-slate-800 focus:border-emerald-400 placeholder:text-slate-400'
          }`} 
        />
        <button 
          onClick={handleSendMessage} 
          disabled={!inputText.trim() || isLoading} 
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-50 disabled:bg-slate-300 bg-emerald-500 hover:bg-emerald-400"
        >
          <Send size={18} className="text-white ml-1" />
        </button>
      </div>
    </div>
  );
}