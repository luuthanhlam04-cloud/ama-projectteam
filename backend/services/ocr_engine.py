import os

def process_medicine_ocr(image_path: str):
    """
    Hàm giả lập xử lý OCR để tránh lỗi khởi động.
    Logic thực tế sử dụng Gemini API hoặc EasyOCR sẽ được nạp ở Giai đoạn 4.
    """
    return {
        "status": "success",
        "detected_name": "Deep Heat Rub",
        "confidence": 0.95,
        "metadata": {
            "origin": "Japan",
            "type": "Cream"
        }
    }