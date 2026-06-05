import os
from sqlmodel import create_engine, Session, SQLModel
from qdrant_client import QdrantClient
from dotenv import load_dotenv

load_dotenv()

# Sử dụng tên service 'db' (Postgres) và 'qdrant' như trong docker-compose
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://ama_admin:ama_password@db:5432/ama_db")
engine = create_engine(DATABASE_URL, echo=False)

def init_db():
    """Khởi tạo bảng trong Postgres"""
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

# Kết nối tới Qdrant local (chế độ file trên máy)
QDRANT_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "qdrant_db")
qdrant_client = QdrantClient(path=QDRANT_DB_PATH)