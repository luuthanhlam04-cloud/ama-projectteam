import { API_BASE_URL } from "../config";
import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Camera, X, Image as ImageIcon, Send, RefreshCw, Layers3, Scan, SwitchCamera } from 'lucide-react';

import { useMedicineStore } from '../store/medicineStore';

interface CameraScannerProps {
  isDarkMode: boolean;
}

export default function CameraScanner({ isDarkMode }: CameraScannerProps) {
  const { addMedicine } = useMedicineStore();

  const [scanStatus, setScanStatus] = useState<'setup' | 'scanning' | 'submitting'>('setup');
  const [capturedImages, setCapturedImages] = useState<File[]>([]);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Các state để quản lý luồng Camera
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Dọn dẹp stream để giải phóng phần cứng
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  // Ngắt camera khi unmount hoặc rời khỏi màn hình scanning
  useEffect(() => {
    if (scanStatus !== 'scanning') {
      stopCamera();
    }
    return () => stopCamera();
  }, [scanStatus, stopCamera]);

  // FIX LỖI: Đồng bộ DOM - Đảm bảo srcObject được gán khi thẻ <video> đã render
  useEffect(() => {
    if (scanStatus === 'scanning' && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [scanStatus, stream]);

  // Quét danh sách thiết bị camera khi component mount
  useEffect(() => {
    const getDevices = async () => {
      try {
        const mediaDevices = await navigator.mediaDevices.enumerateDevices();
        const videoInputDevices = mediaDevices.filter(device => device.kind === 'videoinput');
        setDevices(videoInputDevices);
        if (videoInputDevices.length > 0 && !currentDeviceId) {
          // Mặc định lấy camera đầu tiên tìm thấy
          setCurrentDeviceId(videoInputDevices[0].deviceId);
        }
      } catch (err) {
        console.error("Lỗi khi enumerateDevices:", err);
      }
    };
    getDevices();
  }, [currentDeviceId]);

  const startCamera = async (deviceIdToUse?: string, frontCam?: boolean) => {
    stopCamera();
    try {
      // Ưu tiên deviceId, nếu không có deviceId thì dùng facingMode (fallback)
      const constraints: MediaStreamConstraints = {
        video: deviceIdToUse 
          ? { deviceId: { exact: deviceIdToUse } } 
          : { facingMode: frontCam ? "user" : "environment" }
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      // Loại bỏ gán videoRef trực tiếp ở đây để tránh lỗi 'srcObject' of null
    } catch (err) {
      console.error("Không thể truy cập camera:", err);
      alert("Không thể truy cập camera. Vui lòng cấp quyền!");
      setScanStatus('setup');
    }
  };

  const startScanning = () => {
    setScanStatus('scanning');
    startCamera(currentDeviceId || undefined, isFrontCamera);
  };

  const toggleCamera = () => {
    if (devices.length > 1) {
      // Đảo qua thiết bị camera tiếp theo
      const currentIndex = devices.findIndex(d => d.deviceId === currentDeviceId);
      const nextIndex = (currentIndex + 1) % devices.length;
      const nextDeviceId = devices[nextIndex].deviceId;
      setCurrentDeviceId(nextDeviceId);
      
      // Update logic cho isFrontCamera mang tính tương đối (dựa vào tên/nhãn của thiết bị)
      const isFront = devices[nextIndex].label.toLowerCase().includes('front');
      setIsFrontCamera(isFront);
      
      startCamera(nextDeviceId, isFront);
    } else {
      // Fallback khi thiết bị không rõ label hoặc chỉ có 1 device mà trình duyệt gom nhóm
      const newFront = !isFrontCamera;
      setIsFrontCamera(newFront);
      startCamera(undefined, newFront);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Xử lý gương (mirror) nếu là camera trước
        if (isFrontCamera) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `captured_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
            setCapturedImages(prev => {
              const newArr = [...prev, file];
              return newArr;
            });
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  // Ghép các ảnh thành 1 lưới 2x2
  const stitchImages = async (files: File[]): Promise<File> => {
    return new Promise((resolve, reject) => {
      const offscreenCanvas = document.createElement('canvas');
      const ctx = offscreenCanvas.getContext('2d');
      if (!ctx) return reject("Canvas context not available");

      const images: HTMLImageElement[] = [];
      let loaded = 0;

      files.forEach((file, index) => {
        const img = new Image();
        img.onload = () => {
          loaded++;
          if (loaded === files.length) {
            // Dựa vào kích thước của ảnh đầu tiên làm chuẩn
            const w = images[0].width;
            const h = images[0].height;
            
            // Kích thước canvas mới (lưới 2x2)
            offscreenCanvas.width = w * 2;
            offscreenCanvas.height = h * 2;

            // Vẽ ảnh lên lưới 2x2
            ctx.drawImage(images[0], 0, 0, w, h);
            if (images[1]) ctx.drawImage(images[1], w, 0, w, h);
            if (images[2]) ctx.drawImage(images[2], 0, h, w, h);
            if (images[3]) ctx.drawImage(images[3], w, h, w, h);

            offscreenCanvas.toBlob((blob) => {
              if (blob) {
                const mergedFile = new File([blob], "stitched_image.jpg", { type: 'image/jpeg' });
                resolve(mergedFile);
              } else {
                reject("Failed to create blob");
              }
            }, 'image/jpeg', 0.85); // Nén nhẹ để file không quá nặng
          }
        };
        img.onerror = () => reject("Failed to load image");
        img.src = URL.createObjectURL(file);
        images[index] = img;
      });
    });
  };

  const submitPhotos = async () => {
    if (capturedImages.length === 0) return;
    
    setScanStatus('submitting');
    setIsAnalyzing(true);
    setOcrResult(null);

    try {
      let fileToSend: File;
      
      // Nếu có nhiều hơn 1 ảnh, thực hiện ghép ảnh lại
      if (capturedImages.length > 1) {
        fileToSend = await stitchImages(capturedImages);
      } else {
        fileToSend = capturedImages[0];
      }

      const formData = new FormData();
      formData.append("file", fileToSend);

      const response = await axios.post(`${API_BASE_URL}/api/scan/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      
      if (response.data.status === "success") {
        setOcrResult({
          ...response.data.result,
          image_url: response.data.image_url || null
        });
      }
    } catch (error) {
      console.error("Lỗi khi gọi API scan:", error);
      alert("Có lỗi xảy ra khi phân tích ảnh bằng AI.");
      
      // MOCK DATA ĐỂ TEST KHI BACKEND LỖI
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
  };

  const retakeAll = () => {
    setCapturedImages([]);
    setScanStatus('setup');
    setOcrResult(null);
  };

  const handleFinalSubmit = () => {
    if (!ocrResult || !ocrResult.name) {
      alert('Vui lòng đảm bảo AI đã nhận diện được tên thuốc!');
      return;
    }

    addMedicine({
      name: ocrResult.name,
      type: ocrResult.category || ocrResult.generic_name || 'Chưa phân loại',
      qty: parseInt(ocrResult.qty) || 0,
      unit: ocrResult.unit || 'viên',
      dosage: 1,
      time: '',
      status: 'safe',
      medicine_id: ocrResult.id || null,
      medicine_details: ocrResult,
      image_url: ocrResult.image_url || null
    });

    alert('Đã thêm thuốc vào Tủ thuốc thành công!');
    retakeAll();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files).slice(0, 4);
      
      setCapturedImages(filesArray);
      
      setScanStatus('submitting');
      setIsAnalyzing(true);
      setOcrResult(null);

      try {
        let fileToSend: File;
        if (filesArray.length > 1) {
          fileToSend = await stitchImages(filesArray);
        } else {
          fileToSend = filesArray[0];
        }

        const formData = new FormData();
        formData.append("file", fileToSend);

        const response = await axios.post(`${API_BASE_URL}/api/scan/`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        
        if (response.data.status === "success") {
          setOcrResult({
            ...response.data.result,
            image_url: response.data.image_url || null
          });
        }
      } catch (error) {
        console.error("Lỗi khi gọi API scan:", error);
        alert("Có lỗi xảy ra khi phân tích ảnh bằng AI.");
        
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
    <div className={`flex flex-col h-full overflow-hidden relative transition-colors duration-300 ${
      isDarkMode ? 'bg-slate-800' : 'bg-white'
    }`}>
      <input 
        type="file" 
        accept="image/*" 
        multiple 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
      />

      {/* ================= MÀN HÌNH 1: SETUP ================= */}
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

      {/* ================= MÀN HÌNH 2: SCANNING ================= */}
      {scanStatus === 'scanning' && (
        <>
          <div className="flex-1 bg-black flex flex-col items-center justify-center relative overflow-hidden">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover z-10 ${isFrontCamera ? 'scale-x-[-1]' : ''}`} 
            />
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="absolute inset-0 m-6 border-2 border-emerald-400/60 rounded-xl border-dashed animate-pulse z-20 pointer-events-none"></div>
            
            <button 
              onClick={toggleCamera}
              className="absolute top-4 right-4 z-30 w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
            >
              <SwitchCamera size={24} />
            </button>

            <div className="absolute bottom-6 flex gap-2 z-30">
              {[0, 1, 2, 3].map((index) => {
                const isCaptured = index < capturedImages.length;
                return (
                  <div key={index} className={`w-14 h-14 border rounded-lg flex flex-col items-center justify-center text-xs backdrop-blur-sm overflow-hidden ${
                    isCaptured 
                      ? 'text-emerald-400 border-emerald-500/50 bg-slate-900/80' 
                      : 'text-slate-300 border-slate-500/50 bg-slate-900/50'
                  }`}>
                    {isCaptured ? (
                      <img src={URL.createObjectURL(capturedImages[index])} className="w-full h-full object-cover" alt="Captured" />
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
              <button onClick={capturePhoto} className={`w-20 h-20 rounded-full bg-emerald-500 border-4 flex items-center justify-center hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95 ${
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

      {/* ================= MÀN HÌNH 3: XEM LẠI VÀ ĐIỀN FORM ================= */}
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
                    <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt={`Preview ${index}`} />
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
                {/* Đã sửa rounded-lg thành rounded-none */}
                <div>
                  <label className={`text-xs mb-1 block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Tên thuốc</label>
                  <input 
                    type="text" 
                    value={ocrResult?.name || ''} 
                    onChange={(e) => setOcrResult({...ocrResult, name: e.target.value})}
                    className={`w-full border rounded-none px-3 py-2.5 text-sm focus:outline-none ${
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
                    className={`w-full border rounded-none px-3 py-2.5 text-sm focus:outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-emerald-500/50' : 'bg-white border-slate-300 text-slate-800 focus:border-emerald-400 shadow-sm'
                    }`} 
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className={`text-xs mb-1 block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Số lượng / Hàm lượng</label>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        value={ocrResult?.qty || ''} 
                        onChange={(e) => setOcrResult({...ocrResult, qty: parseInt(e.target.value) || 0})}
                        className={`w-2/3 border rounded-none px-3 py-2.5 text-sm focus:outline-none ${
                          isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-emerald-500/50' : 'bg-white border-slate-300 text-slate-800 focus:border-emerald-400 shadow-sm'
                        }`} 
                      />
                      <input 
                        type="text" 
                        value={ocrResult?.unit || ''} 
                        onChange={(e) => setOcrResult({...ocrResult, unit: e.target.value})}
                        className={`w-1/3 border rounded-none px-3 py-2.5 text-sm focus:outline-none text-center ${
                          isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-emerald-500/50' : 'bg-white border-slate-300 text-slate-800 focus:border-emerald-400 shadow-sm'
                        }`} 
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className={`text-xs mb-1 block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Phân loại</label>
                    <input 
                      type="text" 
                      value={ocrResult?.category || ''} 
                      onChange={(e) => setOcrResult({...ocrResult, category: e.target.value})}
                      className={`w-full border rounded-none px-3 py-2.5 text-sm focus:outline-none ${
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