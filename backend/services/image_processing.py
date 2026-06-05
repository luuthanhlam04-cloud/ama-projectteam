import cv2
import numpy as np

def preprocess_for_ocr(image_path: str):
    # 1. Đọc ảnh
    img = cv2.imread(image_path)
    
    # 2. Chuyển sang hệ xám
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 3. Tăng độ tương phản (CLAHE)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    enhanced = clahe.apply(gray)
    
    # 4. Khử nhiễu
    denoised = cv2.fastNlMeansDenoising(enhanced, None, 10, 7, 21)
    
    # 5. Lưu ảnh đã xử lý để OCR đọc
    processed_path = image_path.replace(".", "_processed.")
    cv2.imwrite(processed_path, denoised)
    
    return processed_path