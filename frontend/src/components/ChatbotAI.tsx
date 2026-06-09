import { useState, useRef, useEffect } from 'react';
import { Send, User, AlertTriangle } from 'lucide-react';
import axios from 'axios';

const BASE_URL = "http://localhost:8000";
const AVATAR_URL = `${BASE_URL}/images/avatar.png`;
const BG_URL = `${BASE_URL}/images/bg.png`;

interface Message {
  sender: 'ai' | 'user';
  text: string;
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
      const response = await axios.post(`${BASE_URL}/api/chat`, { text: userQuery }, { withCredentials: true });
      setMessages(prev => [...prev, { sender: 'ai', text: response.data.bot_reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { sender: 'ai', text: 'Hệ thống đang bảo trì.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // THAY ĐỔI: Thêm nền cố định vào đây để lót dưới cùng, che mọi hở viền
    <div className={`flex flex-col h-full w-full relative ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
      
      {/* ẢNH NỀN MỜ (Z-INDEX thấp nhất) */}
      <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url('${BG_URL}')`, filter: 'blur(10px)' }} />
      <div className={`absolute inset-0 z-0 ${isDarkMode ? 'bg-slate-900/80' : 'bg-white/80'}`} />

      {/* CẢNH BÁO */}
      <div className={`border-b p-2 flex items-center justify-center gap-2 relative z-10 ${
        isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-100 border-slate-200'
      }`}>
        <AlertTriangle size={14} className="text-red-500" />
        <span className="text-[10px] font-bold text-red-500 uppercase">AI chỉ tư vấn tham khảo, không thay thế bác sĩ</span>
      </div>

      {/* VÙNG CHAT */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 relative z-10">
        {messages.map((msg, index) => (
          <div key={index} className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-700 border border-slate-600">
              {msg.sender === 'ai' && <img src={AVATAR_URL} className="w-full h-full object-cover" />}
            </div>
            <div className={`p-3 text-sm max-w-[80%] ${
              msg.sender === 'user' ? 'bg-emerald-600 text-white' : (isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-800')
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* THANH CHAT - Gắn sát đáy, không để hở */}
      <div className={`p-4 border-t relative z-20 flex items-center gap-2 ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <input 
          value={inputText} 
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          className={`flex-1 px-4 py-3 text-sm focus:outline-none ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-800'}`}
          placeholder="Nhập triệu chứng..."
        />
        <button onClick={handleSendMessage} className="p-3 bg-emerald-500 text-white">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}