import json
import os
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_qdrant import QdrantVectorStore

def main():
    # 1. Đọc dữ liệu JSON
    file_path = os.path.join(os.path.dirname(__file__), "data/medicine_samples.json")
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 2. Chuyển đổi JSON thành LangChain Documents
    docs = []
    for item in data:
        page_content = (
            f"Thuốc: {item['brand_name']} ({item['generic_name']}). "
            f"Chỉ định: {item['indications']} "
            f"Cách dùng: {item['usage_instruction']} "
            f"Chống chỉ định: {item['contraindications']}"
        )
        doc = Document(page_content=page_content, metadata=item)
        docs.append(doc)

    # 3. Khởi tạo Embedding model
    embeddings = HuggingFaceEmbeddings(
        model_name="paraphrase-multilingual-MiniLM-L12-v2"
    )

    # 4. Lưu vector thẳng vào ổ cứng (chế độ local)
    db_path = os.path.join(os.path.dirname(__file__), "qdrant_db")
    
    QdrantVectorStore.from_documents(
        documents=docs,
        embedding=embeddings,
        path=db_path,  # Chìa khóa nằm ở đây: truyền path thay vì url
        collection_name="medical_knowledge",
        force_recreate=True 
    )
    print(f"Đã nạp thành công {len(docs)} loại thuốc vào file local tại: {db_path}")

if __name__ == "__main__":
    main()