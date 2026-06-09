import { API_BASE_URL } from "../config";
import { create } from 'zustand';
import axios from 'axios';

// Định nghĩa cấu trúc dữ liệu
export interface Medicine {
  id: string;
  name: string;
  type: string;
  qty: number;
  unit: string;
  dosage: number;
  time: string;
  status: 'safe' | 'warning';
  medicine_id?: string;
  medicine_details?: any;
  image_url?: string;
}

interface MedicineStore {
  medicines: Medicine[];
  isLoading: boolean;
  error: string | null;
  fetchMedicines: (userId: string) => Promise<void>;
  addMedicine: (med: any) => Promise<void>;
  updateMedicine: (id: string, updates: any) => Promise<void>;
  deleteMedicine: (itemId: string) => Promise<void>;
}

// Khởi tạo kho trạng thái
export const useMedicineStore = create<MedicineStore>((set) => ({
  medicines: [],
  isLoading: false,
  error: null,
  
  fetchMedicines: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_BASE_URL}/api/inventory/?user_id=${userId}`);
      set({ medicines: response.data.items, isLoading: false });
    } catch (err: any) {
      console.error("Lỗi tải danh sách tủ thuốc:", err);
      set({ 
        error: "Không thể kết nối đến máy chủ. Đang hiển thị dữ liệu mẫu.",
        isLoading: false,
        // Dữ liệu mẫu hiển thị làm dự phòng
        medicines: [
          { id: '1', name: 'Paracetamol 500mg', type: 'Giảm đau, hạ sốt', qty: 12, unit: 'viên', dosage: 1, time: '', status: 'safe' },
        ]
      });
    }
  },
  
  addMedicine: async (med) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/inventory/add`, {
        user_id: 'demo_user_2026',
        name: med.name,
        type: med.type,
        qty: med.qty,
        unit: med.unit || 'viên',
        dosage: med.dosage || 1,
        time: med.time || '',
        medicine_id: med.medicine_id || null,
        medicine_details: med.medicine_details || {},
        image_url: med.image_url || null
      });
      if (response.data.status === 'success') {
        const newItem = response.data.item;
        set((state) => ({
          medicines: [newItem, ...state.medicines]
        }));
      }
    } catch (err) {
      console.error("Lỗi khi lưu thuốc lên server:", err);
      // Dự phòng lưu cục bộ ở frontend nếu API lỗi
      const fallbackItem: Medicine = {
        id: med.id || Date.now().toString(),
        name: med.name,
        type: med.type,
        qty: med.qty,
        unit: med.unit || 'viên',
        dosage: med.dosage || 1,
        time: med.time || '',
        status: med.status || 'safe',
        medicine_id: med.medicine_id,
        medicine_details: med.medicine_details,
        image_url: med.image_url
      };
      set((state) => ({
        medicines: [fallbackItem, ...state.medicines]
      }));
    }
  },
  
  updateMedicine: async (id, updates) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/inventory/${id}`, updates);
      if (response.data.status === 'success') {
        set((state) => ({
          medicines: state.medicines.map(m => m.id === id ? { ...m, ...updates } : m)
        }));
      }
    } catch (err) {
      console.error("Lỗi khi cập nhật thuốc:", err);
      // Fallback
      set((state) => ({
        medicines: state.medicines.map(m => m.id === id ? { ...m, ...updates } : m)
      }));
    }
  },
  
  deleteMedicine: async (itemId) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/inventory/${itemId}`);
      set((state) => ({
        medicines: state.medicines.filter((m) => m.id !== itemId)
      }));
    } catch (err) {
      console.error("Lỗi khi xóa thuốc trên server:", err);
      // Vẫn xóa cục bộ để giao diện phản hồi nhanh
      set((state) => ({
        medicines: state.medicines.filter((m) => m.id !== itemId)
      }));
    }
  }
}));