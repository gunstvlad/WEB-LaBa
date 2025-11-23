# backend/app/routers/reviews.py
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from .. import models, schemas, auth

router = APIRouter()

def get_current_user_from_header(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization:
        return None
    
    try:
        # Извлекаем токен из заголовка Authorization: Bearer <token>
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            return None
            
        payload = auth.verify_token(token)
        email: str = payload.get("sub")
        if email is None:
            return None
            
        user = db.query(models.User).filter(models.User.email == email).first()
        return user
    except Exception as e:
        print(f"Auth error: {e}")
        return None

@router.get("/reviews", response_model=List[schemas.ReviewResponse])
def get_reviews(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    reviews = db.query(models.Review).filter(models.Review.is_approved == True).offset(skip).limit(limit).all()
    return reviews

@router.post("/reviews", response_model=schemas.ReviewResponse)
def create_review(
    review: schemas.ReviewCreate, 
    current_user: models.User = Depends(get_current_user_from_header), 
    db: Session = Depends(get_db)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Необходима авторизация")
    
    if review.rating < 1 or review.rating > 5:
        raise HTTPException(status_code=400, detail="Рейтинг должен быть от 1 до 5")
    
    db_review = models.Review(
        user_id=current_user.id,
        user_name=current_user.full_name,
        rating=review.rating,
        text=review.text
    )
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    return db_review