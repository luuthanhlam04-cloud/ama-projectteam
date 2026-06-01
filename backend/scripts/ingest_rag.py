import os
import sys
import json
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

# Thiết lập đường dẫn tuyệt đối
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

def run_ingest():
    data_path = "/app/data/medicine_samples.json"
    collection_name = "medicine_knowledge"
    model_name = os.getenv("EMBEDDING_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")
    qdrant_url = "http://qdrant:6333"

    if not os.path.exists(data_path):
        print(f"Lỗi: Không tìm thấy file dữ liệu tại {data_path}")
        return

    # 1. Khởi tạo mô hình Embedding local
    print(f"Đang tải mô hình embedding: {model_name}...")
    embeddings = HuggingFaceEmbeddings(model_name=model_name)

    # 2. Đọc và chuẩn bị dữ liệu Document
    with open(data_path, "r", encoding="utf-8") as f:
        medicines = json.load(f)
    
    docs = []
    for item in medicines:
        content = (
            f"Thuốc: {item['brand_name']} ({item['generic_name']}). "
            f"Chỉ định: {item['indications']}. Cách dùng: {item['usage_instruction']}"
        )
        docs.append(Document(page_content=content, metadata=item))

    # 3. Khởi tạo/Tạo mới Collection trong Qdrant container
    # Model all-MiniLM-L6-v2 luôn có size là 384
    client = QdrantClient(url=qdrant_url)
    print(f"Đang tạo Collection '{collection_name}' với size 384...")
    client.recreate_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=384, distance=Distance.COSINE),
    )

    # 4. Đẩy dữ liệu vào Qdrant
    QdrantVectorStore.from_documents(
        documents=docs,
        embedding=embeddings,
        url=qdrant_url,
        collection_name=collection_name,
    )
    
    print(f"Hoàn thành: Đã nạp {len(docs)} loại thuốc vào Qdrant (Local Embedding).")

if __name__ == "__main__":
    run_ingest()