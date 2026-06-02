import { useState } from 'react';
import CameraScanner from './components/CameraScanner';
import ChatbotAI from './components/ChatbotAI';
import MedicineCabinet from './components/MedicineCabinet';
import { Menu, X, Sun, Moon, Home, Camera, Bot, Pill } from 'lucide-react'; 

function App() {
  // Thay đổi: Đặt trạng thái mặc định là 'home' thay vì 'camera'
  const [activeTab, setActiveTab] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const handleSelectTab = (tab: string) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  // ================= MÀN HÌNH TRANG CHỦ CHỌN CHỨC NĂNG =================
  const HomeDashboard = () => (
    <div className="flex-1 p-6 flex flex-col items-center justify-center space-y-6 animate-in fade-in zoom-in-95 duration-300 overflow-y-auto">
      <div className="text-center mb-2">
        <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Xin chào! 👋</h2>
        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Bạn muốn hệ thống hỗ trợ gì hôm nay?</p>
      </div>

      <div className="w-full space-y-4">
        {/* Nút Chọn Quét Camera */}
        <button
          onClick={() => handleSelectTab('camera')}
          className={`w-full p-5 rounded-3xl border flex items-center gap-4 transition-all hover:scale-105 active:scale-95 shadow-sm ${
            isDarkMode
              ? 'bg-slate-800 border-emerald-500/30 hover:bg-slate-700/80 text-slate-200'
              : 'bg-white border-emerald-500/30 hover:bg-emerald-50 text-slate-700'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-emerald-500/20 text-emerald-500">
            <Camera size={28} />
          </div>
          <div className="text-left flex-1">
            <h3 className="font-bold text-lg text-emerald-500">Quét nhận diện</h3>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Chụp bao bì để AI phân tích tự động</p>
          </div>
        </button>

        {/* Nút Chọn Trợ lý AI */}
        <button
          onClick={() => handleSelectTab('ai')}
          className={`w-full p-5 rounded-3xl border flex items-center gap-4 transition-all hover:scale-105 active:scale-95 shadow-sm ${
            isDarkMode
              ? 'bg-slate-800 border-blue-500/30 hover:bg-slate-700/80 text-slate-200'
              : 'bg-white border-blue-500/30 hover:bg-blue-50 text-slate-700'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-blue-500/20 text-blue-500">
            <Bot size={28} />
          </div>
          <div className="text-left flex-1">
            <h3 className="font-bold text-lg text-blue-500">Trợ lý y tế AI</h3>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Hỏi đáp, tra cứu bằng giọng nói</p>
          </div>
        </button>

        {/* Nút Chọn Tủ thuốc */}
        <button
          onClick={() => handleSelectTab('cabinet')}
          className={`w-full p-5 rounded-3xl border flex items-center gap-4 transition-all hover:scale-105 active:scale-95 shadow-sm ${
            isDarkMode
              ? 'bg-slate-800 border-amber-500/30 hover:bg-slate-700/80 text-slate-200'
              : 'bg-white border-amber-500/30 hover:bg-amber-50 text-slate-700'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-amber-500/20 text-amber-500">
            <Pill size={28} />
          </div>
          <div className="text-left flex-1">
            <h3 className="font-bold text-lg text-amber-500">Tủ thuốc gia đình</h3>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Quản lý số lượng và lịch uống</p>
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen flex justify-center items-center p-4 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
      
      <div className={`w-full max-w-md h-[852px] rounded-[40px] shadow-2xl flex flex-col overflow-hidden relative border transition-all duration-300 ${
        isDarkMode ? 'bg-slate-800/80 border-slate-700/50 text-white' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        
        {/* THANH TIÊU ĐỀ */}
        <div className={`p-4 flex items-center justify-between shrink-0 z-30 relative border-b transition-colors ${
          isDarkMode ? 'bg-slate-800/95 border-slate-700/50' : 'bg-slate-50 border-slate-200'
        }`}>
          <button 
            onClick={() => setIsMenuOpen(true)} 
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors active:scale-95 ${
              isDarkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            <Menu size={20} />
          </button>
          
          <h1 className="text-lg font-bold text-emerald-500 absolute left-1/2 -translate-x-1/2">Tủ Thuốc AI</h1>
          
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95 ${
              isDarkMode ? 'bg-slate-700 text-amber-400 hover:bg-slate-600' : 'bg-slate-200 text-indigo-600 hover:bg-slate-300'
            }`}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        {/* HIỂN THỊ NỘI DUNG DỰA THEO TAB */}
        <div className="flex-1 overflow-hidden flex flex-col relative z-10">
          {activeTab === 'home' && <HomeDashboard />}
          {activeTab === 'cabinet' && <MedicineCabinet />}
          {activeTab === 'camera' && <CameraScanner />}
          {activeTab === 'ai' && <ChatbotAI />}
        </div>

        {/* LỚP PHỦ MỜ */}
        {isMenuOpen && <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200" onClick={() => setIsMenuOpen(false)}></div>}

        {/* THANH SIDEBAR */}
        <div className={`absolute top-0 left-0 h-full w-[260px] z-50 flex flex-col transform transition-transform duration-300 ease-in-out shadow-[10px_0_30px_rgba(0,0,0,0.3)] ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isDarkMode ? 'bg-slate-800 border-r border-slate-700/50' : 'bg-white border-r border-slate-200'}`}>
          
          <div className={`p-5 flex justify-between items-center border-b ${isDarkMode ? 'border-slate-700/50 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
            <h2 className="font-bold text-emerald-500">Danh mục</h2>
            <button onClick={() => setIsMenuOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"><X size={20} /></button>
          </div>

          <div className="flex flex-col p-4 gap-2">
            {/* THÊM NÚT TRANG CHỦ VÀO MENU */}
            <button onClick={() => handleSelectTab('home')} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors ${
              activeTab === 'home' 
                ? 'bg-slate-500/20 text-slate-400 font-semibold border border-slate-500/30' 
                : isDarkMode ? 'text-slate-300 hover:bg-slate-700/50' : 'text-slate-600 hover:bg-slate-100'
            }`}><Home className="shrink-0" size={20} /> <span className="text-sm">Trang chủ</span></button>

            <button onClick={() => handleSelectTab('cabinet')} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors ${
              activeTab === 'cabinet' 
                ? 'bg-amber-500/20 text-amber-500 font-semibold border border-amber-500/30' 
                : isDarkMode ? 'text-slate-300 hover:bg-slate-700/50' : 'text-slate-600 hover:bg-slate-100'
            }`}><Pill className="shrink-0" size={20} /> <span className="text-sm">Tủ thuốc</span></button>
            
            <button onClick={() => handleSelectTab('camera')} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors ${
              activeTab === 'camera' 
                ? 'bg-emerald-500/20 text-emerald-500 font-semibold border border-emerald-500/30' 
                : isDarkMode ? 'text-slate-300 hover:bg-slate-700/50' : 'text-slate-600 hover:bg-slate-100'
            }`}><Camera className="shrink-0" size={20} /> <span className="text-sm">Quét ảnh</span></button>
            
            <button onClick={() => handleSelectTab('ai')} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors ${
              activeTab === 'ai' 
                ? 'bg-blue-500/20 text-blue-500 font-semibold border border-blue-500/30' 
                : isDarkMode ? 'text-slate-300 hover:bg-slate-700/50' : 'text-slate-600 hover:bg-slate-100'
            }`}><Bot className="shrink-0" size={20} /> <span className="text-sm">Trợ lý AI</span></button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;