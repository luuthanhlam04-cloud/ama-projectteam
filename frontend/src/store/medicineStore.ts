import { create } from 'zustand';

// Định nghĩa cấu trúc dữ liệu
export interface Medicine {
  id: string;
  name: string;
  type: string;
  qty: string;
  time: string;
  status: 'safe' | 'warning';
}

interface MedicineStore {
  medicines: Medicine[];
  addMedicine: (med: Medicine) => void;
}

// Khởi tạo kho
export const useMedicineStore = create<MedicineStore>((set) => ({
  medicines: [
    { id: '1', name: 'Paracetamol 500mg', type: 'Giảm đau, hạ sốt', qty: '12 viên', time: 'Sau ăn 30 phút', status: 'safe' },
  ],
  addMedicine: (med) => set((state) => ({ 
    medicines: [med, ...state.medicines] 
  })),
}));