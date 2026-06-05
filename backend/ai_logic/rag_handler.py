import os
import json
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient

class RAGHandler:
    def __init__(self):
        # Đồng nhất embedding model với file ingest_rag.py
        self.embeddings = HuggingFaceEmbeddings(
            model_name="paraphrase-multilingual-MiniLM-L12-v2"  # sửa từ all-MiniLM-L6-v2
        )
        
        self.db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "qdrant_db"))
        self.json_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "config", "medicine_samples.json"))
        
        # Khởi tạo Qdrant client và vector store
        self.client = QdrantClient(path=self.db_path)
        self.vector_store = QdrantVectorStore(
            client=self.client,
            collection_name="medical_knowledge",
            embedding=self.embeddings
        )
        
        # Load toàn bộ dữ liệu JSON một lần
        self.all_drugs = []
        if os.path.exists(self.json_path):
            with open(self.json_path, "r", encoding="utf-8") as f:
                self.all_drugs = json.load(f)
        else:
            print(f"Cảnh báo: Không tìm thấy file {self.json_path}")
        
        # Mapping từ triệu chứng phổ biến đến các từ khóa trong chỉ định và search_keywords
        self.symptom_synonyms = {
            "đau bụng": ["đau bụng", "đau thượng vị", "đau vùng bụng", "đau quặn", "đau bụng kinh", "đau dạ dày", "co thắt"],
            "tiêu chảy": ["tiêu chảy", "đi ngoài phân lỏng", "ỉa chảy", "lỵ"],
            "ợ nóng": ["ợ nóng", "ợ chua", "trào ngược", "nóng rát dạ dày"],
            "cảm cúm": ["cảm cúm", "cảm lạnh", "sốt", "nhức đầu", "nghẹt mũi", "sổ mũi"],
            "ho": ["ho", "đờm", "viêm họng", "khản tiếng"],
            "dị ứng": ["dị ứng", "mày đay", "phát ban", "viêm mũi dị ứng", "mề đay"],
            "đau nhức xương khớp": ["đau khớp", "viêm khớp", "thoái hóa khớp", "đau cơ", "đau lưng"],
            "huyết áp": ["tăng huyết áp", "cao huyết áp"],
            "táo bón": ["táo bón", "khó đi ngoài"],
        }

    def _match_keyword(self, text: str, keywords: list) -> bool:
        """Kiểm tra text có chứa bất kỳ keyword nào không (không phân biệt hoa thường)"""
        text_lower = text.lower()
        return any(kw.lower() in text_lower for kw in keywords)

    def query_vector_db(self, query: str, top_k: int = 6):
        query_lower = query.lower()
        context_chunks = []
        matched_images = []
        
        # --- Hàm gom ảnh (tránh trùng lặp) ---
        def add_image(drug):
            brand = drug.get("brand_name")
            img_url = drug.get("image_url")
            if img_url and not any(img["brand_name"] == brand for img in matched_images):
                matched_images.append({
                    "brand_name": brand,
                    "url": img_url
                })
        
        # --- LỚP 1: Mở rộng keyword matching dựa trên synonym mapping ---
        # Xác định các triệu chứng người dùng đề cập
        active_symptoms = []
        for symptom, synonyms in self.symptom_synonyms.items():
            if any(syn in query_lower for syn in synonyms):
                active_symptoms.append(symptom)
        
        # Nếu có triệu chứng khớp, thu thập tất cả các từ khóa liên quan
        expanded_keywords = []
        for symptom in active_symptoms:
            expanded_keywords.extend(self.symptom_synonyms[symptom])
        # Thêm chính query nếu có từ đơn lẻ
        expanded_keywords.append(query_lower)
        
        # Duyệt qua all_drugs đã load
        for item in self.all_drugs:
            indications = item.get("indications", "").lower()
            search_kw = [kw.lower() for kw in item.get("search_keywords", [])]
            brand_name = item.get("brand_name", "").lower()
            
            # Kiểm tra match với expanded_keywords
            match = any(
                kw in indications or kw in ' '.join(search_kw) or kw in brand_name
                for kw in expanded_keywords if len(kw) > 2
            )
            if match:
                info = (
                    f"- Thuốc: {item.get('brand_name')} ({item.get('generic_name')})\n"
                    f"  Phân loại: {item.get('category')}\n"
                    f"  Chỉ định: {item.get('indications')}\n"
                    f"  Cách dùng: {item.get('usage_instruction')}\n"
                    f"  Chống chỉ định: {item.get('contraindications')}"
                )
                if info not in context_chunks:
                    context_chunks.append(info)
                    add_image(item)
        
        # --- LỚP 2: Semantic search bằng Qdrant (bổ sung nếu chưa đủ top_k) ---
        if len(context_chunks) < top_k:
            try:
                results = self.vector_store.similarity_search(query, k=top_k)
                for doc in results:
                    meta = doc.metadata
                    # Tránh trùng lặp với các thuốc đã có trong context_chunks
                    brand = meta.get("brand_name")
                    if not any(brand in chunk for chunk in context_chunks):
                        info = (
                            f"- Thuốc: {brand} ({meta.get('generic_name', '')})\n"
                            f"  Phân loại: {meta.get('category', '')}\n"
                            f"  Chỉ định: {meta.get('indications', '')}\n"
                            f"  Cách dùng: {meta.get('usage_instruction', '')}\n"
                            f"  Chống chỉ định: {meta.get('contraindications', '')}"
                        )
                        context_chunks.append(info)
                        add_image(meta)
            except Exception as e:
                print(f"Lỗi truy vấn Qdrant: {e}")
        
        # Nếu không tìm thấy gì
        if not context_chunks:
            return "Hiện tại trong kho không có thuốc nào phù hợp với yêu cầu.", []
        
        # Giới hạn số lượng context trả về
        return "\n\n".join(context_chunks[:top_k]), matched_images

rag_handler = RAGHandler()