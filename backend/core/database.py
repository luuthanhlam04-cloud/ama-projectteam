import os
# pyrefly: ignore [missing-import]
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

# Kết nối tới Qdrant Cloud server qua URL và API key
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)