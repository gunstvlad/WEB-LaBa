# backend/app/routers/reviews.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas, auth

router = APIRouter()

def get_current_user_optional(token: str = Depends(auth.verify_token), db: Session = Depends(get_db)):
    try:
        user = db.query(models.User).filter(models.User.email == token.get("sub")).first()
        return user
    except:
        return None

@router.get("/reviews", response_model=List[schemas.ReviewResponse])
def get_reviews(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    reviews = db.query(models.Review).filter(models.Review.is_approved == True).offset(skip).limit(limit).all()
    return reviews

@router.post("/reviews", response_model=schemas.ReviewResponse)
def create_review(review: schemas.ReviewCreate, current_user: models.User = Depends(get_current_user_optional), db: Session = Depends(get_db)):
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