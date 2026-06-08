FROM python:3.12-slim

# 1. Cài đặt các thư viện hệ thống cần thiết cho xử lý âm thanh và hình ảnh
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libasound2-dev \
    portaudio19-dev \
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2. Sao chép requirements.txt
COPY requirements.txt .

# 3. Cài đặt các thư viện PyTorch bản CPU trước 
# Thêm torchvision và torchaudio bản cpu để đảm bảo đồng bộ
RUN pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# 4. Cài đặt các thư viện còn lại trong requirements
RUN pip install --no-cache-dir -r requirements.txt

# 4b. Tải sẵn các mô hình EasyOCR và HuggingFace Embedding trong quá trình build để không bị block lúc runtime
RUN python -c "import easyocr; easyocr.Reader(['vi', 'en'], gpu=False)"
RUN python -c "from langchain_huggingface import HuggingFaceEmbeddings; HuggingFaceEmbeddings(model_name='paraphrase-multilingual-MiniLM-L12-v2')"

# 5. Sao chép toàn bộ mã nguồn
COPY . .

# 6. Chạy FastAPI (Giữ --reload nếu đang trong quá trình phát triển)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]