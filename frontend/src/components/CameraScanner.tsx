import { useState, useRef } from 'react';
import { Camera, X, Image as ImageIcon, Send, RefreshCw, Layers3, Scan, Loader2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import axios from 'axios';

export default function CameraScanner() {
  const [scanStatus, setScanStatus] = useState<'setup' | 'scanning' | 'submitting'>('setup');
  const [capturedImages, setCapturedImages] = useState<File[]>([]);
  
  // 1. Thêm State để lưu thông tin thuốc trả về từ Backend
  const [drugInfo, setDrugInfo] = useState({
    name: "",
    ingredients: "",
    quantity: "10",
    expiry: ""
  });
  
  // 2. Thêm State để làm hiệu ứng loading chờ AI xử lý
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ================= CÁC HÀM XỬ LÝ GIAO DIỆN =================
  const startScanning = () => setScanStatus('scanning');

  const retakeAll = () => {
    setCapturedImages([]);
    setScanStatus('setup');
    setDrugInfo({ name: "", ingredients: "", quantity: "10", expiry: "" });
  };

  const handleFinalSubmit = () => {
    // Chỗ này bạn có thể gọi thêm API để lưu vào database kho thuốc
    console.log("Dữ liệu nộp lên kho:", drugInfo);
    alert('Đã nộp toàn bộ ảnh và thông tin lên Backend!');
    retakeAll();
  };

  // ================= HÀM XỬ LÝ GỌI API OCR =================
  const analyzeImages = async (files: File[]) => {
    setScanStatus('submitting'); 
    setIsAnalyzing(true); 

    try {
      const formData = new FormData();
      
      // Nén từng ảnh và đưa vào form data
      for (const file of files) {
        const options = {
          maxSizeMB: 1, // Giới hạn dưới 1MB theo yêu cầu
          maxWidthOrHeight: 1920,
          useWebWorker: true
        };
        const compressedFile = await imageCompression(file, options);
        formData.append('images', compressedFile);
      }

      // Gọi API sang Backend (Cổng 8000)
      const response = await axios.post('http://localhost:8000/api/scan', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Cập nhật Form bằng dữ liệu trả về (Bạn nhớ check lại key JSON chính xác mà Backend trả ra nhé)
      setDrugInfo({
        name: response.data.ten_thuoc || "",
        ingredients: response.data.thanh_phan || "",
        quantity: response.data.so_luong || "10",
        expiry: response.data.han_su_dung || ""
      });

    } catch (error) {
      console.error("Lỗi khi đọc ảnh:", error);
      alert("Không thể phân tích ảnh, vui lòng chụp rõ hơn hoặc thử lại!");
    } finally {
      setIsAnalyzing(false); 
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files).slice(0, 4);
      setCapturedImages((prev) => {
        const combined = [...prev, ...filesArray];
        return combined.slice(0, 4);
      });
      
      // Bắt đầu gọi API ngay khi chọn ảnh xong
      analyzeImages(filesArray);
    }
  };

  // Nút gửi ở màn hình quét (dành cho khi bạn ghép nối camera chụp trực tiếp)
  const submitPhotos = () => {
    analyzeImages(capturedImages);
  };

  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-2xl overflow-hidden relative border border-slate-600/50 shadow-inner">
      <input 
        type="file" 
        accept="image/*" 
        multiple 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
      />

      {/* MÀN HÌNH 1: BẮT ĐẦU */}
      {scanStatus === 'setup' && (
        <div className="flex-1 bg-slate-900 flex flex-col items-center justify-center p-6 space-y-6">
          <Layers3 size={64} className="text-emerald-400" />
          <h2 className="text-xl font-semibold text-center text-slate-100">Bắt đầu luồng quét thuốc</h2>
          <p className="text-sm text-slate-400 text-center px-4">
            Chúng ta sẽ chụp 4 góc của bao bì thuốc để đảm bảo AI nhận diện chính xác nhất.
          </p>
          <div className="flex gap-4">
            <button onClick={startScanning} className="w-40 h-40 border border-slate-700 bg-slate-800 rounded-3xl flex flex-col items-center justify-center space-y-3 hover:bg-slate-700 hover:scale-105 transition-all">
              <Scan size={48} className="text-emerald-400" />
              <span className="text-xs text-slate-300">Bắt đầu quét</span>
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="w-40 h-40 border border-slate-700 bg-slate-800 rounded-3xl flex flex-col items-center justify-center space-y-3 hover:bg-slate-700 hover:scale-105 transition-all cursor-pointer">
              <ImageIcon size={48} className="text-slate-400" />
              <span className="text-xs text-slate-300">Tải ảnh</span>
            </button>
          </div>
        </div>
      )}

      {/* MÀN HÌNH 2: CAMERA QUÉT */}
      {scanStatus === 'scanning' && (
        <>
          <div className="flex-1 bg-black flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 z-0">
              <img src="https://images.unsplash.com/photo-1595079676339-1534801ad6cf?q=80&w=640&auto=format&fit=crop" className="w-full h-full object-cover opacity-60" alt="Camera preview" />
            </div>
            <div className="absolute inset-0 m-6 border-2 border-emerald-400/60 rounded-xl border-dashed animate-pulse z-10"></div>
            
            <div className="absolute bottom-6 flex gap-2 z-20">
              {[0, 1, 2, 3].map((index) => {
                const isCaptured = index < capturedImages.length;
                return (
                  <div key={index} className={`w-14 h-14 border border-slate-500/50 rounded-lg bg-slate-900/50 flex flex-col items-center justify-center text-xs ${isCaptured ? 'text-emerald-400 border-emerald-500/50' : 'text-slate-500'}`}>
                    {isCaptured ? (
                      <img src={URL.createObjectURL(capturedImages[index])} className="w-full h-full object-cover rounded-lg" alt="Captured" />
                    ) : (
                      <>
                        <ImageIcon size={18} />
                        <span>Ảnh {index + 1}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="h-32 bg-slate-900/95 flex items-center justify-center gap-8 px-6 border-t border-slate-700/50 shrink-0">
            <button onClick={retakeAll} className="w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center hover:bg-slate-700 transition-colors">
              <X className="text-slate-300 w-6 h-6" />
            </button>
            
            {capturedImages.length < 4 ? (
              // Nút chụp ảo, trong thực tế sẽ lấy file từ Canvas/Video stream
              <button onClick={() => fileInputRef.current?.click()} className="w-20 h-20 rounded-full bg-emerald-500 border-4 border-slate-800 outline outline-2 outline-emerald-500 flex items-center justify-center hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95">
                <Camera className="text-slate-900 w-8 h-8" />
              </button>
            ) : (
              <button onClick={submitPhotos} className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95">
                <Send className="text-slate-900 w-8 h-8" />
              </button>
            )}
            
            <button onClick={() => fileInputRef.current?.click()} className="w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center hover:bg-slate-700 transition-colors">
              <ImageIcon className="text-slate-300 w-6 h-6" />
            </button>
          </div>
        </>
      )}

      {/* MÀN HÌNH 3: XEM LẠI VÀ ĐIỀN FORM */}
      {scanStatus === 'submitting' && (
        <div className="flex flex-col h-full bg-slate-900 animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          <div className="h-36 bg-slate-800 flex p-4 gap-3 overflow-x-auto border-b border-slate-700/50 shrink-0">
            {[1, 2, 3, 4].map((index) => {
              const file = capturedImages[index-1];
              return (
                <div key={index} className="w-24 h-full bg-slate-700 rounded-xl flex flex-col items-center justify-center border border-emerald-500/30 shrink-0 relative overflow-hidden">
                  {file ? (
                    <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt={`Preview ${index}`} />
                  ) : (
                    <ImageIcon className="text-slate-500" />
                  )}
                  <span className="absolute bottom-1 text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded z-10">Ảnh {index}</span>
                </div>
              );
            })}
            <button onClick={retakeAll} className="w-24 h-full bg-slate-800/50 rounded-xl flex flex-col items-center justify-center border border-dashed border-slate-600 text-slate-400 hover:bg-slate-700 transition-colors shrink-0 text-xs gap-1">
              <RefreshCw size={16} />
              Chụp lại
            </button>
          </div>
          
          <div className="flex-1 p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-emerald-400 font-semibold">Kết quả phân tích</h3>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full border border-emerald-500/30">
                Gemini OCR Hybrid
              </span>
            </div>
            
            {/* KIỂM TRA TRẠNG THÁI LOADING */}
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                <p className="text-sm text-slate-400 animate-pulse">Hệ thống đang trích xuất dữ liệu...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Đã chuyển defaultValue thành value và thêm onChange để người dùng có thể chỉnh sửa */}
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Tên thuốc</label>
                  <input 
                    type="text" 
                    value={drugInfo.name} 
                    onChange={(e) => setDrugInfo({...drugInfo, name: e.target.value})}
                    placeholder="Đang chờ phân tích..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:border-emerald-500/50 focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Thành phần chính</label>
                  <input 
                    type="text" 
                    value={drugInfo.ingredients} 
                    onChange={(e) => setDrugInfo({...drugInfo, ingredients: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:border-emerald-500/50 focus:outline-none" 
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 mb-1 block">Số lượng (Viên)</label>
                    <input 
                      type="number" 
                      value={drugInfo.quantity} 
                      onChange={(e) => setDrugInfo({...drugInfo, quantity: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:border-emerald-500/50 focus:outline-none" 
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 mb-1 block">Hạn sử dụng</label>
                    <input 
                      type="text" 
                      value={drugInfo.expiry} 
                      onChange={(e) => setDrugInfo({...drugInfo, expiry: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:border-emerald-500/50 focus:outline-none" 
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-slate-800/90 border-t border-slate-700/50 shrink-0">
            <button 
              onClick={handleFinalSubmit} 
              disabled={isAnalyzing} 
              className={`w-full font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 transition-colors active:scale-[0.98] ${
                isAnalyzing ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-emerald-500 text-slate-900 hover:bg-emerald-400'
              }`}
            >
              <Send size={20} />
              {isAnalyzing ? 'Đang phân tích...' : 'Xác nhận & Thêm vào kho'}
            </button>
          </div>
        </div>
      )}
      
    </div>
  );
}