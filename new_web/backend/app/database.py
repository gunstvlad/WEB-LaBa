# backend/app/database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Для разработки - замените на ваши реальные данные PostgreSQL
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://username:password@localhost/mebelny_magazin"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()