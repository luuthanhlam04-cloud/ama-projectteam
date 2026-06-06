import { useState, useRef } from 'react';
import axios from 'axios';
import { Camera, X, Image as ImageIcon, Send, RefreshCw, Layers3, Scan } from 'lucide-react';

// BƯỚC 1: IMPORT ZUSTAND STORE
import { useMedicineStore } from '../store/medicineStore';

const simulateImageCompression = async (imageUrl: string) => {
  return new Promise<File>((resolve) => {
    const simulatedFile = new File([''], "simulated_compressed_image.jpg", { type: "image/jpeg" });
    resolve(simulatedFile);
  });
};

interface CameraScannerProps {
  isDarkMode: boolean;
}

export default function CameraScanner({ isDarkMode }: CameraScannerProps) {
  // BƯỚC 2: GỌI HÀM THÊM THUỐC TỪ STORE
  const { addMedicine } = useMedicineStore();

  const [scanStatus, setScanStatus] = useState<'setup' | 'scanning' | 'submitting'>('setup');
  const [capturedImages, setCapturedImages] = useState<File[]>([]);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setOcrResult(null);
  };

  // BƯỚC 3: XỬ LÝ LƯU VÀO TỦ THUỐC
  const handleFinalSubmit = () => {
    if (!ocrResult || !ocrResult.name) {
      alert('Vui lòng đảm bảo AI đã nhận diện được tên thuốc!');
      return;
    }

    // Đẩy dữ liệu vào trạng thái toàn cục (Zustand)
    addMedicine({
      id: Date.now().toString(),
      name: ocrResult.name,
      // Lấy phân loại hoặc thành phần làm type, nếu không có thì gán mặc định
      type: ocrResult.category || ocrResult.generic_name || 'Chưa phân loại',
      // Dữ liệu từ OCR có thể chứa hàm lượng (strength), tạm dùng làm thông tin hiển thị hoặc để mặc định
      qty: ocrResult.strength || '1', 
      time: 'Chưa cài đặt',
      status: 'safe'
    });

    alert('Đã thêm thuốc vào Tủ thuốc thành công!');
    retakeAll(); // Reset màn hình camera về trạng thái ban đầu
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      
      setCapturedImages((prev) => {
        const combined = [...prev, ...filesArray];
        return combined.slice(0, 4);
      });
      
      setScanStatus('submitting');
      setIsAnalyzing(true);
      setOcrResult(null);

      try {
        const formData = new FormData();
        formData.append("file", filesArray[0]);

        const response = await axios.post("http://localhost:8000/api/scan/", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        
        if (response.data.status === "success") {
          // Khi Backend trả về, lưu vào state để hiển thị lên form
          setOcrResult(response.data.result);
        }
      } catch (error) {
        console.error("Lỗi khi gọi API scan:", error);
        alert("Có lỗi xảy ra khi phân tích ảnh bằng AI.");
        
        // MOCK DATA ĐỂ TEST KHI BACKEND LỖI (Sau này xóa đi khi BE đã ổn định)
        setOcrResult({
          method: 'local_fuzzy_optimized',
          name: 'Panadol Extra',
          generic_name: 'Paracetamol 500mg, Caffeine 65mg',
          strength: '1 vỉ (10 viên)',
          category: 'Giảm đau, hạ sốt'
        });
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  return (
    <div className={`flex flex-col h-full rounded-2xl overflow-hidden relative border shadow-inner transition-colors duration-300 ${
      isDarkMode ? 'bg-slate-800 border-slate-600/50' : 'bg-white border-slate-200'
    }`}>
      <input 
        type="file" 
        accept="image/*" 
        multiple 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
      />

      {/* ================= MÀN HÌNH 1 & 2 GIỮ NGUYÊN ================= */}
      {scanStatus === 'setup' && (
        <div className={`flex-1 flex flex-col items-center justify-center p-6 space-y-6 ${
          isDarkMode ? 'bg-slate-900' : 'bg-slate-50'
        }`}>
          <Layers3 size={64} className={isDarkMode ? 'text-emerald-400' : 'text-emerald-500'} />
          <h2 className={`text-xl font-semibold text-center ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            Bắt đầu luồng quét thuốc
          </h2>
          <p className={`text-sm text-center px-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Chúng ta sẽ chụp 4 góc của bao bì thuốc để đảm bảo AI nhận diện chính xác nhất. Bố cục 4 ảnh đang được chuẩn bị.
          </p>
          <div className="flex gap-4">
            <button onClick={startScanning} className={`w-40 h-40 border rounded-3xl flex flex-col items-center justify-center space-y-3 transition-all hover:scale-105 ${
              isDarkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-700' : 'border-slate-200 bg-white hover:bg-slate-100 shadow-sm'
            }`}>
              <Scan size={48} className={isDarkMode ? 'text-emerald-400' : 'text-emerald-500'} />
              <span className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>Bắt đầu quét</span>
            </button>
            
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className={`w-40 h-40 border rounded-3xl flex flex-col items-center justify-center space-y-3 transition-all hover:scale-105 cursor-pointer ${
                isDarkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-700' : 'border-slate-200 bg-white hover:bg-slate-100 shadow-sm'
              }`}
            >
              <ImageIcon size={48} className={isDarkMode ? 'text-slate-400' : 'text-slate-500'} />
              <span className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>Tải ảnh</span>
            </button>
          </div>
        </div>
      )}

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
                  <div key={index} className={`w-14 h-14 border rounded-lg flex flex-col items-center justify-center text-xs backdrop-blur-sm ${
                    isCaptured 
                      ? 'text-emerald-400 border-emerald-500/50 bg-slate-900/80' 
                      : 'text-slate-300 border-slate-500/50 bg-slate-900/50'
                  }`}>
                    {isCaptured ? (
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
          
          <div className={`h-32 flex items-center justify-center gap-8 px-6 border-t shrink-0 ${
            isDarkMode ? 'bg-slate-900/95 border-slate-700/50' : 'bg-white border-slate-200'
          }`}>
            <button onClick={retakeAll} className={`w-14 h-14 rounded-full border flex items-center justify-center transition-colors ${
              isDarkMode ? 'bg-slate-800 border-slate-600 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-600'
            }`}>
              <X className="w-6 h-6" />
            </button>
            
            {capturedImages.length < 4 ? (
              <button onClick={captureSimulatedPhoto} className={`w-20 h-20 rounded-full bg-emerald-500 border-4 flex items-center justify-center hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95 ${
                isDarkMode ? 'border-slate-800 outline outline-2 outline-emerald-500' : 'border-white outline outline-2 outline-emerald-500'
              }`}>
                <Camera className="text-white w-8 h-8" />
              </button>
            ) : (
              <button onClick={submitPhotos} className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95">
                <Send className="text-white w-8 h-8 ml-1" />
              </button>
            )}
            
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className={`w-14 h-14 rounded-full border flex items-center justify-center transition-colors ${
                isDarkMode ? 'bg-slate-800 border-slate-600 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <ImageIcon className="w-6 h-6" />
            </button>
          </div>
        </>
      )}

      {/* ================= MÀN HÌNH 3: XEM LẠI VÀ ĐIỀN FORM (Đã mở khóa readOnly) ================= */}
      {scanStatus === 'submitting' && (
        <div className={`flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-300 ${
          isDarkMode ? 'bg-slate-900' : 'bg-slate-50'
        }`}>
          
          <div className={`h-36 flex p-4 gap-3 overflow-x-auto border-b shrink-0 ${
            isDarkMode ? 'bg-slate-800 border-slate-700/50' : 'bg-white border-slate-200'
          }`}>
            {[1, 2, 3, 4].map((index) => {
              const file = capturedImages[index-1];
              return (
                <div key={index} className={`w-24 h-full rounded-xl flex flex-col items-center justify-center border shrink-0 relative overflow-hidden ${
                  isDarkMode ? 'bg-slate-700 border-emerald-500/30' : 'bg-slate-100 border-emerald-500/30'
                }`}>
                  {file ? (
                    <img src={file.name === 'simulated_compressed_image.jpg' ? `https://images.unsplash.com/photo-1595079676339-1534801ad6cf?q=80&w=128&auto=format&fit=crop&sig=${index}` : URL.createObjectURL(file)} className="w-full h-full object-cover" alt={`Preview ${index}`} />
                  ) : (
                    <ImageIcon className={isDarkMode ? 'text-slate-500' : 'text-slate-400'} />
                  )}
                  <span className={`absolute bottom-1 text-[10px] px-1.5 py-0.5 rounded z-10 ${
                    isDarkMode ? 'text-slate-400 bg-slate-900' : 'text-slate-600 bg-white/80 backdrop-blur'
                  }`}>Ảnh {index}</span>
                </div>
              );
            })}
            <button onClick={retakeAll} className={`w-24 h-full rounded-xl flex flex-col items-center justify-center border border-dashed transition-colors shrink-0 text-xs gap-1 ${
              isDarkMode ? 'bg-slate-800/50 border-slate-600 text-slate-400 hover:bg-slate-700' : 'bg-slate-50 border-slate-300 text-slate-500 hover:bg-slate-100'
            }`}>
              <RefreshCw size={16} />
              Chụp lại
            </button>
          </div>
          
          <div className="flex-1 p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-semibold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>Kiểm tra lại thông tin</h3>
              <span className={`text-[10px] px-2 py-1 rounded-full border ${
                isDarkMode ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border-emerald-300'
              }`}>
                {ocrResult?.method === 'cloud' ? 'Gemini AI Vision' : (ocrResult?.method === 'local_fuzzy_optimized' ? 'Local OCR Engine' : 'AI Analysis')}
              </span>
            </div>
            
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <RefreshCw className={`animate-spin ${isDarkMode ? 'text-emerald-400' : 'text-emerald-500'}`} size={32} />
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Đang phân tích hình ảnh...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* BƯỚC 4: THÊM HÀM ONCHANGE VÀ XÓA READONLY ĐỂ CHO PHÉP SỬA */}
                <div>
                  <label className={`text-xs mb-1 block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Tên thuốc</label>
                  <input 
                    type="text" 
                    value={ocrResult?.name || ''} 
                    onChange={(e) => setOcrResult({...ocrResult, name: e.target.value})}
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-emerald-500/50' : 'bg-white border-slate-300 text-slate-800 focus:border-emerald-400 shadow-sm'
                    }`} 
                  />
                </div>
                <div>
                  <label className={`text-xs mb-1 block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Thành phần chính</label>
                  <input 
                    type="text" 
                    value={ocrResult?.generic_name || ''} 
                    onChange={(e) => setOcrResult({...ocrResult, generic_name: e.target.value})}
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-emerald-500/50' : 'bg-white border-slate-300 text-slate-800 focus:border-emerald-400 shadow-sm'
                    }`} 
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className={`text-xs mb-1 block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Số lượng / Hàm lượng</label>
                    <input 
                      type="text" 
                      value={ocrResult?.strength || ''} 
                      onChange={(e) => setOcrResult({...ocrResult, strength: e.target.value})}
                      className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-emerald-500/50' : 'bg-white border-slate-300 text-slate-800 focus:border-emerald-400 shadow-sm'
                      }`} 
                    />
                  </div>
                  <div className="flex-1">
                    <label className={`text-xs mb-1 block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Phân loại</label>
                    <input 
                      type="text" 
                      value={ocrResult?.category || ''} 
                      onChange={(e) => setOcrResult({...ocrResult, category: e.target.value})}
                      className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-emerald-500/50' : 'bg-white border-slate-300 text-slate-800 focus:border-emerald-400 shadow-sm'
                      }`} 
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className={`p-4 border-t shrink-0 ${
            isDarkMode ? 'bg-slate-800/90 border-slate-700/50' : 'bg-white border-slate-200'
          }`}>
            <button 
              onClick={handleFinalSubmit} 
              disabled={isAnalyzing}
              className="w-full bg-emerald-500 text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 hover:bg-emerald-400 transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
              Xác nhận & Thêm vào kho
            </button>
          </div>
        </div>
      )}
      
    </div>
  );
}