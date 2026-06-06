import { useState } from 'react';
import { Search, Plus, Pill, Clock, X, Check } from 'lucide-react';
import { useMedicineStore } from '../store/medicineStore';

interface MedicineCabinetProps {
  isDarkMode: boolean;
}

export default function MedicineCabinet({ isDarkMode }: MedicineCabinetProps) {
  const { medicines, addMedicine } = useMedicineStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newTime, setNewTime] = useState('');

  const filteredMedicines = medicines.filter((med: any) => 
    med.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    med.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleManualAdd = () => {
    if (!newName.trim()) {
      alert("Vui lòng nhập ít nhất Tên thuốc!");
      return;
    }
    
    addMedicine({
      id: Date.now().toString(),
      name: newName,
      type: newType || 'Chưa phân loại',
      qty: newQty || '1',
      time: newTime || 'Chưa cài đặt',
      status: 'safe'
    });

    setIsAddModalOpen(false);
    setNewName(''); setNewType(''); setNewQty(''); setNewTime('');
  };

  return (
    <div className={`flex flex-col h-full relative transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      
      {/* Thanh tìm kiếm */}
      <div className="p-4 pb-0 relative shrink-0">
        <Search className={`absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm tên hoặc loại thuốc..." 
          className={`w-full border rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none transition-colors ${
            isDarkMode 
              ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-emerald-500/50 placeholder:text-slate-500' 
              : 'bg-white border-slate-200 text-slate-800 focus:border-emerald-400 placeholder:text-slate-400 shadow-sm'
          }`} 
        />
      </div>
      
      {/* Danh sách thuốc */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 p-4 pb-16">
        {filteredMedicines.length > 0 ? (
          filteredMedicines.map((med: any) => (
            <div key={med.id} className={`p-5 rounded-3xl border flex gap-4 transition-colors animate-in fade-in slide-in-from-bottom-2 ${
              isDarkMode ? 'bg-slate-800/60 border-slate-700/50 hover:bg-slate-700/50' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'
            }`}>
              <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center mt-1 ${
                isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
              }`}>
                <Pill size={24} />
              </div>
              <div className="flex flex-col w-full">
                <h3 className={`font-bold text-lg mb-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{med.name}</h3>
                <div className="flex flex-col gap-2">
                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Phân loại: <span className={`font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{med.type}</span></p>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Trong kho: <span className={`font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{med.qty}</span></p>
                  <div className="self-start mt-1">
                    <span className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium ${
                      isDarkMode ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-emerald-600 bg-emerald-50 border border-emerald-200'
                    }`}>
                      <Clock size={16} /> Lịch: {med.time}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className={`flex flex-col items-center justify-center h-full gap-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            <Pill size={40} className="opacity-50" />
            <p>Không tìm thấy thuốc nào!</p>
          </div>
        )}
      </div>
      
      {/* Nút Thêm */}
      <button 
        onClick={() => setIsAddModalOpen(true)}
        className="absolute bottom-4 right-4 w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-400 transition-all hover:scale-105 active:scale-95 z-10"
      >
        <Plus className="text-white w-7 h-7" />
      </button>

      {/* Form điền thủ công */}
      {isAddModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-sm rounded-3xl border p-5 shadow-2xl flex flex-col gap-4 scale-in-center ${
            isDarkMode ? 'bg-slate-800 border-slate-600/50' : 'bg-white border-slate-200'
          }`}>
            <div className={`flex justify-between items-center border-b pb-3 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
              <h3 className={`font-bold text-lg ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>Thêm thuốc thủ công</h3>
              <button onClick={() => setIsAddModalOpen(false)} className={`transition-colors ${isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className={`text-xs mb-1 block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Tên thuốc *</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-emerald-500/50' : 'bg-white border-slate-300 text-slate-800 focus:border-emerald-400'}`} />
              </div>
              <div>
                <label className={`text-xs mb-1 block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Phân loại</label>
                <input type="text" value={newType} onChange={(e) => setNewType(e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-emerald-500/50' : 'bg-white border-slate-300 text-slate-800 focus:border-emerald-400'}`} />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={`text-xs mb-1 block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Số lượng</label>
                  <input type="text" value={newQty} onChange={(e) => setNewQty(e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-emerald-500/50' : 'bg-white border-slate-300 text-slate-800 focus:border-emerald-400'}`} />
                </div>
                <div className="flex-1">
                  <label className={`text-xs mb-1 block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Lịch uống</label>
                  <input type="text" value={newTime} onChange={(e) => setNewTime(e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-emerald-500/50' : 'bg-white border-slate-300 text-slate-800 focus:border-emerald-400'}`} />
                </div>
              </div>
            </div>
            
            <button onClick={handleManualAdd} className="w-full mt-2 bg-emerald-500 text-white font-bold rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-emerald-400 transition-colors active:scale-95">
              <Check size={20} /> Hoàn tất lưu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}