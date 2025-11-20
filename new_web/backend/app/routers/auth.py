from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    hashed = auth.get_password_hash(user.password)
    db_user = models.User(email=user.email, hashed_password=hashed, full_name=user.full_name)
    db.add(db_user); db.commit(); db.refresh(db_user)
    return db_user

# В router/auth.py убедитесь, что возвращается правильная структура
@router.post("/login")
def login(data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user or not auth.verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    token = auth.create_access_token({"sub": user.email})
    
    # Возвращаем правильную структуру ответа
    return {
        "access_token": token, 
        "token_type": "bearer", 
        "user": {
            "email": user.email, 
            "name": user.full_name  # Убедитесь, что это поле называется name
        }
    }