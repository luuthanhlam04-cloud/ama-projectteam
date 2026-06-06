import { useState, useRef } from 'react';
import { Camera, X, Image as ImageIcon, Send, RefreshCw, Layers3, Scan } from 'lucide-react';

// Giả lập chức năng nén ảnh (Dùng cho chụp trực tiếp)
const simulateImageCompression = async (imageUrl: string) => {
  return new Promise<File>((resolve) => {
    const simulatedFile = new File([''], "simulated_compressed_image.jpg", { type: "image/jpeg" });
    resolve(simulatedFile);
  });
};

export default function CameraScanner() {
  const [scanStatus, setScanStatus] = useState<'setup' | 'scanning' | 'submitting'>('setup');
  const [capturedImages, setCapturedImages] = useState<File[]>([]);
  
  // Công cụ tham chiếu đến thẻ chọn file ẩn
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ================= CÁC HÀM XỬ LÝ =================
  const startScanning = () => setScanStatus('scanning');

  const captureSimulatedPhoto = async () => {
    const imageUrl = `https://simulated-api.example.com/captured_photo_${Date.now()}.jpg`;
    const compressedImage = await simulateImageCompression(imageUrl);
    setCapturedImages((prev) => [...prev, compressedImage]);
  };

  const submitPhotos = () => setScanStatus('submitting');

  const retakeAll = () => {
    setCapturedImages([]);
    setScanStatus('setup');
  };

  const handleFinalSubmit = () => {
    alert('Đã nộp toàn bộ ảnh và thông tin lên Backend!');
    retakeAll();
  };

  // Hàm xử lý khi người dùng chọn ảnh từ thiết bị
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Biến danh sách file chọn được thành một mảng (Array)
      const filesArray = Array.from(e.target.files);
      
      // Gộp ảnh vừa chọn vào danh sách ảnh hiện có (Giới hạn tối đa 4 ảnh)
      setCapturedImages((prev) => {
        const combined = [...prev, ...filesArray];
        return combined.slice(0, 4); // Chỉ lấy tối đa 4 ảnh
      });
      
      // Chuyển thẳng sang bước xem lại và điền form
      setScanStatus('submitting');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-2xl overflow-hidden relative border border-slate-600/50 shadow-inner">
      
      {/* THẺ CHỌN FILE ẨN (Trái tim của tính năng Tải ảnh) */}
      <input 
        type="file" 
        accept="image/*" 
        multiple // Cho phép chọn nhiều ảnh cùng lúc
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
      />

      {/* ================= MÀN HÌNH 1: BẮT ĐẦU ================= */}
      {scanStatus === 'setup' && (
        <div className="flex-1 bg-slate-900 flex flex-col items-center justify-center p-6 space-y-6">
          <Layers3 size={64} className="text-emerald-400" />
          <h2 className="text-xl font-semibold text-center text-slate-100">Bắt đầu luồng quét thuốc</h2>
          <p className="text-sm text-slate-400 text-center px-4">
            Chúng ta sẽ chụp 4 góc của bao bì thuốc để đảm bảo AI nhận diện chính xác nhất. Bố cục 4 ảnh đang được chuẩn bị.
          </p>
          <div className="flex gap-4">
            <button onClick={startScanning} className="w-40 h-40 border border-slate-700 bg-slate-800 rounded-3xl flex flex-col items-center justify-center space-y-3 hover:bg-slate-700 hover:scale-105 transition-all">
              <Scan size={48} className="text-emerald-400" />
              <span className="text-xs text-slate-300">Bắt đầu quét</span>
            </button>
            
            {/* ĐÃ GẮN SỰ KIỆN CHO NÚT TẢI ẢNH */}
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="w-40 h-40 border border-slate-700 bg-slate-800 rounded-3xl flex flex-col items-center justify-center space-y-3 hover:bg-slate-700 hover:scale-105 transition-all cursor-pointer"
            >
              <ImageIcon size={48} className="text-slate-400" />
              <span className="text-xs text-slate-300">Tải ảnh</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= MÀN HÌNH 2: CAMERA QUÉT 4 ẢNH ================= */}
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
                      // Hiển thị ảnh thật nếu người dùng tải lên, hoặc ảnh giả lập nếu bấm chụp
                      <img src={capturedImages[index].name === 'simulated_compressed_image.jpg' ? `https://images.unsplash.com/photo-1595079676339-1534801ad6cf?q=80&w=128&auto=format&fit=crop&sig=${index}` : URL.createObjectURL(capturedImages[index])} className="w-full h-full object-cover rounded-lg" alt="Captured" />
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
              <button onClick={captureSimulatedPhoto} className="w-20 h-20 rounded-full bg-emerald-500 border-4 border-slate-800 outline outline-2 outline-emerald-500 flex items-center justify-center hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95">
                <Camera className="text-slate-900 w-8 h-8" />
              </button>
            ) : (
              <button onClick={submitPhotos} className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95">
                <Send className="text-slate-900 w-8 h-8" />
              </button>
            )}
            
            {/* ĐÃ GẮN SỰ KIỆN CHO NÚT TẢI ẢNH (Ở MÀN HÌNH QUÉT) */}
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center hover:bg-slate-700 transition-colors"
            >
              <ImageIcon className="text-slate-300 w-6 h-6" />
            </button>
          </div>
        </>
      )}

      {/* ================= MÀN HÌNH 3: XEM LẠI VÀ ĐIỀN FORM ================= */}
      {scanStatus === 'submitting' && (
        <div className="flex flex-col h-full bg-slate-900 animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          <div className="h-36 bg-slate-800 flex p-4 gap-3 overflow-x-auto border-b border-slate-700/50 shrink-0">
            {[1, 2, 3, 4].map((index) => {
              const file = capturedImages[index-1];
              return (
                <div key={index} className="w-24 h-full bg-slate-700 rounded-xl flex flex-col items-center justify-center border border-emerald-500/30 shrink-0 relative overflow-hidden">
                  {file ? (
                    <img src={file.name === 'simulated_compressed_image.jpg' ? `https://images.unsplash.com/photo-1595079676339-1534801ad6cf?q=80&w=128&auto=format&fit=crop&sig=${index}` : URL.createObjectURL(file)} className="w-full h-full object-cover" alt={`Preview ${index}`} />
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
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Tên thuốc</label>
                <input type="text" defaultValue="Panadol Extra" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:border-emerald-500/50 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Thành phần chính</label>
                <input type="text" defaultValue="Paracetamol 500mg, Caffeine 65mg" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:border-emerald-500/50 focus:outline-none" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-1 block">Số lượng (Viên)</label>
                  <input type="number" defaultValue="10" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:border-emerald-500/50 focus:outline-none" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-1 block">Hạn sử dụng</label>
                  <input type="text" defaultValue="12/2026" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:border-emerald-500/50 focus:outline-none" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-slate-800/90 border-t border-slate-700/50 shrink-0">
            <button onClick={handleFinalSubmit} className="w-full bg-emerald-500 text-slate-900 font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 hover:bg-emerald-400 transition-colors active:scale-[0.98]">
              <Send size={20} />
              Xác nhận & Thêm vào kho
            </button>
          </div>
        </div>
      )}
      
    </div>
  );
}