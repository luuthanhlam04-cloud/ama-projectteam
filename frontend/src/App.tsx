import { useState } from 'react';
import CameraScanner from './components/CameraScanner';
import ChatbotAI from './components/ChatbotAI';
import MedicineCabinet from './components/MedicineCabinet';
import { Menu, X, Sun, Moon, Home, Camera, Bot, Pill } from 'lucide-react'; 

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const handleSelectTab = (tab: string) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  const HomeDashboard = () => (
    <div className="flex-1 p-6 flex flex-col items-center justify-center space-y-6 animate-in fade-in zoom-in-95 duration-300 overflow-y-auto">
      <div className="text-center mb-2">
        <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Xin chào! 👋</h2>
        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Bạn muốn hệ thống hỗ trợ gì hôm nay?</p>
      </div>

      <div className="w-full space-y-4">
        <button onClick={() => handleSelectTab('camera')} className={`w-full p-5 rounded-3xl border flex items-center gap-4 transition-all duration-300 hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-slate-800 border-emerald-500/30 hover:bg-slate-700/80 text-slate-200' : 'bg-white border-emerald-100 shadow-[0_4px_15px_rgb(0,0,0,0.02)] text-slate-700'}`}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-emerald-500/20 text-emerald-500"><Camera size={28} /></div>
          <div className="text-left flex-1">
            <h3 className="font-bold text-lg text-emerald-500">Quét nhận diện</h3>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Chụp bao bì để AI phân tích tự động</p>
          </div>
        </button>

        <button onClick={() => handleSelectTab('ai')} className={`w-full p-5 rounded-3xl border flex items-center gap-4 transition-all duration-300 hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-slate-800 border-blue-500/30 hover:bg-slate-700/80 text-slate-200' : 'bg-white border-blue-100 shadow-[0_4px_15px_rgb(0,0,0,0.02)] text-slate-700'}`}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-blue-500/20 text-blue-500"><Bot size={28} /></div>
          <div className="text-left flex-1">
            <h3 className="font-bold text-lg text-blue-500">Trợ lý y tế AI</h3>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Hỏi đáp, tra cứu bằng giọng nói</p>
          </div>
        </button>

        <button onClick={() => handleSelectTab('cabinet')} className={`w-full p-5 rounded-3xl border flex items-center gap-4 transition-all duration-300 hover:scale-105 active:scale-95 ${isDarkMode ? 'bg-slate-800 border-amber-500/30 hover:bg-slate-700/80 text-slate-200' : 'bg-white border-amber-100 shadow-[0_4px_15px_rgb(0,0,0,0.02)] text-slate-700'}`}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-amber-500/20 text-amber-500"><Pill size={28} /></div>
          <div className="text-left flex-1">
            <h3 className="font-bold text-lg text-amber-500">Tủ thuốc gia đình</h3>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Quản lý số lượng và lịch uống</p>
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen flex justify-center items-center p-4 transition-colors duration-500 ${isDarkMode ? 'bg-slate-900' : 'bg-emerald-50/40'}`}>
      <div className={`w-full max-w-md h-[852px] rounded-[40px] flex flex-col overflow-hidden relative border transition-all duration-300 ${isDarkMode ? 'bg-slate-800/80 border-slate-700/50 text-white' : 'bg-white border-white/50 text-slate-800 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)]'}`}>
        
        {/* THANH TIÊU ĐỀ MÀU EMERALD */}
        <div className={`p-4 flex items-center justify-between shrink-0 z-30 relative transition-all duration-300 ${
          isDarkMode ? 'bg-slate-800 border-b border-slate-700/50' : 'bg-emerald-500 text-white shadow-md'
        }`}>
          <button onClick={() => setIsMenuOpen(true)} className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95 ${isDarkMode ? 'bg-slate-700 text-slate-200' : 'bg-emerald-600/50 text-white hover:bg-emerald-600'}`}>
            <Menu size={20} />
          </button>
          
          <h1 className="text-lg font-bold absolute left-1/2 -translate-x-1/2">Tủ Thuốc AI</h1>
          
          <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95 ${isDarkMode ? 'bg-slate-700 text-amber-400' : 'bg-emerald-600/50 text-white hover:bg-emerald-600'}`}>
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        {/* CONTAINER CHỨA NỘI DUNG (ĐÃ FIX ÉP FLEX-1 XUỐNG TẬN ĐÁY) */}
        <div className="flex-1 overflow-hidden flex flex-col relative z-10 w-full h-full">
          {activeTab === 'home' && <HomeDashboard />}
          
          {/* Bọc các component khác trong flex-1 để đảm bảo chúng giãn kín không gian, 
              không bị treo lơ lửng gây ra khoảng trống ở viền mờ phía dưới */}
          {activeTab === 'cabinet' && (
            <div className="flex-1 flex flex-col w-full h-full"><MedicineCabinet isDarkMode={isDarkMode} /></div>
          )}
          
          {activeTab === 'camera' && (
            <div className="flex-1 flex flex-col w-full h-full"><CameraScanner isDarkMode={isDarkMode} /></div>
          )}
          
          {activeTab === 'ai' && (
            <div className="flex-1 flex flex-col w-full h-full"><ChatbotAI isDarkMode={isDarkMode} /></div>
          )}
        </div>

        {/* MENU */}
        {isMenuOpen && <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-40 animate-in fade-in duration-300" onClick={() => setIsMenuOpen(false)}></div>}

        <div className={`absolute top-0 left-0 h-full w-[260px] z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0 shadow-[10px_0_40px_rgba(0,0,0,0.1)]' : '-translate-x-full shadow-none'} ${isDarkMode ? 'bg-slate-800 border-r border-slate-700/50' : 'bg-white border-r border-slate-100'}`}>
          <div className={`p-5 flex justify-between items-center border-b ${isDarkMode ? 'border-slate-700/50 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
            <h2 className="font-bold text-emerald-500">Danh mục</h2>
            <button onClick={() => setIsMenuOpen(false)} className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-200'}`}><X size={20} /></button>
          </div>

          <div className="flex flex-col p-4 gap-2">
            <button onClick={() => handleSelectTab('home')} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${activeTab === 'home' ? 'bg-emerald-500/20 text-emerald-500 font-semibold border border-emerald-500/30' : isDarkMode ? 'text-slate-300 hover:bg-slate-700/50' : 'text-slate-600 hover:bg-slate-50'}`}><Home className="shrink-0" size={20} /> <span className="text-sm">Trang chủ</span></button>
            <button onClick={() => handleSelectTab('cabinet')} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${activeTab === 'cabinet' ? 'bg-emerald-500/20 text-emerald-500 font-semibold border border-emerald-500/30' : isDarkMode ? 'text-slate-300 hover:bg-slate-700/50' : 'text-slate-600 hover:bg-slate-50'}`}><Pill className="shrink-0" size={20} /> <span className="text-sm">Tủ thuốc</span></button>
            <button onClick={() => handleSelectTab('camera')} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${activeTab === 'camera' ? 'bg-emerald-500/20 text-emerald-500 font-semibold border border-emerald-500/30' : isDarkMode ? 'text-slate-300 hover:bg-slate-700/50' : 'text-slate-600 hover:bg-slate-50'}`}><Camera className="shrink-0" size={20} /> <span className="text-sm">Quét ảnh</span></button>
            <button onClick={() => handleSelectTab('ai')} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${activeTab === 'ai' ? 'bg-emerald-500/20 text-emerald-500 font-semibold border border-emerald-500/30' : isDarkMode ? 'text-slate-300 hover:bg-slate-700/50' : 'text-slate-600 hover:bg-slate-50'}`}><Bot className="shrink-0" size={20} /> <span className="text-sm">Trợ lý AI</span></button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;