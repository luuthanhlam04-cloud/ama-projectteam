import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, AlertTriangle, Volume2 } from 'lucide-react';
import axios from 'axios';

interface Message {
  sender: 'ai' | 'user';
  text: string;
  images?: any[];
  audioUrl?: string; 
}

// 1. KHAI BÁO INTERFACE ĐỂ NHẬN BIẾN TỪ APP.TSX
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
      const response = await axios.post('http://localhost:8000/api/chat', {
        text: userQuery,
        inventory: currentInventory, 
        history: messages.slice(-5)  
      });

      const data = response.data;
      
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

  return (
    // 2. ĐỔI MÀU NỀN TỔNG THỂ CỦA KHUNG CHAT
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
              {/* MÀU SẮC CHO BONG BÓNG CHAT */}
              <div className={`p-3 rounded-2xl text-sm whitespace-pre-wrap ${
                msg.sender === 'user' 
                  ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/30 rounded-tr-none' : 'bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-tr-none') 
                  : (isDarkMode ? 'bg-slate-700/50 text-slate-200 border border-slate-600/50 rounded-tl-none' : 'bg-slate-100 text-slate-800 border border-slate-200 rounded-tl-none')
              }`}>
                {msg.text}
                
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

              {/* MÀU SẮC CHO ẢNH RAG */}
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
        
        {/* HIỆU ỨNG TYPING */}
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