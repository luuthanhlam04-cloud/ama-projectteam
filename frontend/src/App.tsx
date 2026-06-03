import React, { useState, useRef, useEffect } from 'react';

interface MedicineImage {
  brand_name: string;
  url: string;
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  images?: MedicineImage[];
}

const BACKEND_URL = 'http://127.0.0.1:8000';

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Xin chào! Tôi là trợ lý tủ thuốc thông minh AMA. Hôm nay bạn đang gặp triệu chứng gì cần tôi hỗ trợ tư vấn thuốc không?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userQuery = input.trim();
    setInput('');
    
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: userQuery }]);
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userQuery })
      });

      if (!response.ok) throw new Error('Không thể kết nối đến server.');

      const data = await response.json();

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: data.bot_reply,
        images: data.matched_images || []
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'bot',
        text: 'Hệ thống đang bận hoặc mất kết nối server Backend. Hãy đảm bảo FastAPI đã bật CORS.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans antialiased">
      {/* Header */}
      <header className="bg-emerald-600 text-white shadow-md py-4 px-6 flex items-center gap-3 sticky top-0 z-10">
        <div className="w-3 h-3 bg-green-400 rounded-full animate-ping" />
        <h1 className="font-bold text-lg tracking-wide">AMA Medical Assistant (PWA)</h1>
      </header>

      {/* Vùng Chat */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 max-w-3xl w-full mx-auto">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm transition-all ${
              msg.sender === 'user' 
                ? 'bg-emerald-500 text-white rounded-tr-none' 
                : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'
            }`}>
              <p className="whitespace-pre-line text-sm leading-relaxed">{msg.text}</p>
              
              {/* Hiển thị ảnh thuốc */}
              {msg.images && msg.images.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
                  {msg.images.map((img, idx) => (
                    <div key={idx} className="bg-gray-50 p-2 rounded-lg border border-gray-200 text-center flex flex-col items-center">
                      <img 
                        src={`${BACKEND_URL}${img.url}`} 
                        alt={img.brand_name} 
                        className="h-28 object-contain rounded-md mb-2 mix-blend-multiply"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/150x150?text=Medicine'; }}
                      />
                      <span className="text-xs font-semibold text-gray-700 truncate w-full">{img.brand_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-500 border border-gray-200 rounded-2xl rounded-tl-none p-4 shadow-sm text-sm">
              Trợ lý đang phân tích...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </main>

      {/* Input gửi tin nhắn */}
      <footer className="bg-white border-t border-gray-200 p-4 sticky bottom-0 z-10">
        <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Mô tả triệu chứng bệnh..."
            className="flex-1 border border-gray-300 rounded-full px-5 py-3 text-sm focus:outline-none focus:border-emerald-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-emerald-500 text-white font-medium rounded-full px-6 py-3 text-sm hover:bg-emerald-600 disabled:opacity-50"
          >
            Gửi
          </button>
        </form>
      </footer>
    </div>
  );
}