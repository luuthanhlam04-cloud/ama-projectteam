import json
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from dotenv import load_dotenv
load_dotenv()

from sqlmodel import SQLModel, create_engine, Session
from models import Medicine, User, ConsumptionHistory, UserInventory

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://ama_admin:ama_password@localhost:5433/ama_db")
engine = create_engine(DATABASE_URL, echo=False)

def init_db():
    print("Creating tables in PostgreSQL...")
    SQLModel.metadata.create_all(engine)

def load_postgres():
    init_db()
    
    data_path = os.path.join(BASE_DIR, "config", "medicine_samples.json")
    if not os.path.exists(data_path):
        print(f"Error: Data file not found at {data_path}")
        return

    with open(data_path, "r", encoding="utf-8") as f:
        medicines = json.load(f)
    
    with Session(engine) as session:
        count = 0
        for med_data in medicines:
            if not session.get(Medicine, med_data["id"]):
                # Chuyển đổi khóa brand_name sang name
                if "brand_name" in med_data:
                    med_data["name"] = med_data.pop("brand_name")
                
                session.add(Medicine(**med_data))
                count += 1
        session.commit()
    print(f"Postgres: Successfully loaded {count} new medicines.")

if __name__ == "__main__":
    load_postgres()
