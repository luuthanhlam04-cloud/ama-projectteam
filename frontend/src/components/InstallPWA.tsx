import { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, X, Share } from 'lucide-react';

export default function InstallPWA() {
  const { isInstallable, isIOS, isInstalled, install } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(true);

  if (isInstalled || !isVisible) {
    return null;
  }

  // Nếu là iOS và chưa cài đặt, hiển thị hướng dẫn thủ công
  if (isIOS) {
    return (
      <div className="fixed bottom-0 left-0 right-0 p-4 z-[100] animate-in slide-in-from-bottom-5">
        <div className="bg-slate-800 text-slate-100 rounded-3xl p-5 shadow-2xl border border-slate-700 relative flex flex-col gap-3">
          <button 
            onClick={() => setIsVisible(false)}
            className="absolute top-4 right-4 text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
          
          <h3 className="font-bold text-base text-emerald-400">Cài đặt Ứng dụng</h3>
          <p className="text-sm text-slate-300">
            Cài đặt ứng dụng vào màn hình chính để trải nghiệm mượt mà như app gốc.
          </p>
          <div className="flex items-center gap-2 text-sm bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
            <p>1. Nhấn biểu tượng</p>
            <Share size={18} className="text-emerald-400 mx-0.5" />
            <p>Share ở dưới cùng.</p>
          </div>
          <div className="flex items-center gap-2 text-sm bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
            <p>2. Chọn <b>Thêm vào MH chính</b> (Add to Home Screen).</p>
          </div>
        </div>
      </div>
    );
  }

  // Nếu là Android/PC và có thể cài đặt, hiển thị nút tự động
  if (isInstallable) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-[100] animate-in slide-in-from-bottom-5">
        <div className="bg-emerald-500 text-white rounded-3xl p-5 shadow-[0_10_25px_-5px_rgba(16,185,129,0.5)] flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="font-bold text-base">Cài đặt AMA Scanner</h3>
            <p className="text-sm opacity-90">Truy cập nhanh như ứng dụng gốc</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={install}
              className="bg-white text-emerald-600 font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-1 active:scale-95 transition-transform shadow-sm"
            >
              <Download size={18} />
              Cài đặt
            </button>
            <button 
              onClick={() => setIsVisible(false)}
              className="p-2.5 bg-emerald-600/50 rounded-xl hover:bg-emerald-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Trường hợp trình duyệt không hỗ trợ hoặc đang chờ sự kiện
  return null;
}
