import cv2
import numpy as np

def preprocess_for_ocr(image_path: str):
    # 1. Đọc ảnh
    img = cv2.imread(image_path)
    if img is None:
        return image_path
        
    # Resize nếu ảnh quá lớn (giảm tải cho OpenCV và AI Vision)
    h, w = img.shape[:2]
    if max(h, w) > 1200:
        ratio = 1200.0 / max(h, w)
        img = cv2.resize(img, (int(w * ratio), int(h * ratio)))
    
    # 2. Chuyển sang hệ xám
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 3. Tăng độ tương phản (CLAHE)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    enhanced = clahe.apply(gray)
    
    # 4. Khử nhiễu nhẹ bằng Gaussian Blur thay vì fastNlMeansDenoising (nhanh gấp 50 lần)
    denoised = cv2.GaussianBlur(enhanced, (5, 5), 0)
    
    # 5. Lưu ảnh đã xử lý để OCR đọc
    processed_path = image_path.replace(".", "_processed.")
    cv2.imwrite(processed_path, denoised)
    
    return processed_path