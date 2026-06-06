import { useState } from 'react';
import { Search, Plus, Pill, Clock, X, Check } from 'lucide-react';
import { useMedicineStore } from '../store/medicineStore';

export default function MedicineCabinet() {
  const { medicines, addMedicine } = useMedicineStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newTime, setNewTime] = useState('');

  // SỬA LỖI Ở ĐÂY: Thêm (med: any) để TypeScript không báo lỗi đỏ
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
    <div className="flex flex-col h-full relative">
      
      {/* Thanh tìm kiếm */}
      <div className="mb-4 relative shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm tên hoặc loại thuốc..." 
          className="w-full bg-slate-800 border border-slate-600/50 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50" 
        />
      </div>
      
      {/* Danh sách thuốc */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-16">
        {filteredMedicines.length > 0 ? (
          // SỬA LỖI Ở ĐÂY: Thêm (med: any)
          filteredMedicines.map((med: any) => (
            <div key={med.id} className="bg-slate-800/60 p-5 rounded-3xl border border-slate-700/50 flex gap-4 hover:bg-slate-700/50 transition-colors animate-in fade-in slide-in-from-bottom-2">
              <div className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center bg-emerald-500/20 text-emerald-400 mt-1">
                <Pill size={24} />
              </div>
              <div className="flex flex-col w-full">
                <h3 className="text-slate-100 font-bold text-lg mb-2">{med.name}</h3>
                <div className="flex flex-col gap-2">
                  <p className="text-slate-400 text-sm">Phân loại: <span className="text-slate-300 font-medium">{med.type}</span></p>
                  <p className="text-slate-400 text-sm">Trong kho: <span className="text-slate-300 font-medium">{med.qty}</span></p>
                  <div className="self-start mt-1">
                    <span className="flex items-center gap-1.5 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg font-medium">
                      <Clock size={16} /> Lịch: {med.time}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
            <Pill size={40} className="opacity-50" />
            <p>Không tìm thấy thuốc nào!</p>
          </div>
        )}
      </div>
      
      {/* Nút Thêm */}
      <button 
        onClick={() => setIsAddModalOpen(true)}
        className="absolute bottom-4 right-2 w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-400 transition-all hover:scale-105 active:scale-95 z-10"
      >
        <Plus className="text-slate-900 w-7 h-7" />
      </button>

      {/* Form điền thủ công */}
      {isAddModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-800 w-full max-w-sm rounded-3xl border border-slate-600/50 p-5 shadow-2xl flex flex-col gap-4 scale-in-center">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h3 className="font-bold text-emerald-400 text-lg">Thêm thuốc thủ công</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-200"><X size={24} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Tên thuốc *</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-emerald-500/50 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Phân loại</label>
                <input type="text" value={newType} onChange={(e) => setNewType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-emerald-500/50 focus:outline-none" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-1 block">Số lượng</label>
                  <input type="text" value={newQty} onChange={(e) => setNewQty(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-emerald-500/50 focus:outline-none" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-1 block">Lịch uống</label>
                  <input type="text" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-emerald-500/50 focus:outline-none" />
                </div>
              </div>
            </div>
            <button onClick={handleManualAdd} className="w-full mt-2 bg-emerald-500 text-slate-900 font-bold rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-emerald-400 transition-colors active:scale-95">
              <Check size={20} /> Hoàn tất lưu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}