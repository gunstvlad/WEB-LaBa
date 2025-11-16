# backend/app/routers/cart.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas, auth

router = APIRouter()

def get_current_user(token: str = Depends(auth.verify_token), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == token.get("sub")).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return user

@router.get("/cart", response_model=List[schemas.CartItemResponse])
def get_cart_items(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    cart_items = db.query(models.CartItem).filter(models.CartItem.user_id == current_user.id).all()
    return cart_items

@router.post("/cart", response_model=schemas.CartItemResponse)
def add_to_cart(cart_item: schemas.CartItemCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Проверяем существование товара
    product = db.query(models.Product).filter(models.Product.id == cart_item.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    
    # Проверяем, есть ли уже этот товар в корзине
    existing_item = db.query(models.CartItem).filter(
        models.CartItem.user_id == current_user.id,
        models.CartItem.product_id == cart_item.product_id
    ).first()
    
    if existing_item:
        # Обновляем количество
        existing_item.quantity += cart_item.quantity
        db.commit()
        db.refresh(existing_item)
        return existing_item
    else:
        # Создаем новую запись
        db_cart_item = models.CartItem(
            user_id=current_user.id,
            product_id=cart_item.product_id,
            quantity=cart_item.quantity
        )
        db.add(db_cart_item)
        db.commit()
        db.refresh(db_cart_item)
        return db_cart_item

@router.put("/cart/{item_id}", response_model=schemas.CartItemResponse)
def update_cart_item(item_id: int, quantity: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    cart_item = db.query(models.CartItem).filter(
        models.CartItem.id == item_id,
        models.CartItem.user_id == current_user.id
    ).first()
    
    if not cart_item:
        raise HTTPException(status_code=404, detail="Элемент корзины не найден")
    
    if quantity <= 0:
        db.delete(cart_item)
        db.commit()
        raise HTTPException(status_code=200, detail="Элемент удален из корзины")
    
    cart_item.quantity = quantity
    db.commit()
    db.refresh(cart_item)
    return cart_item

@router.delete("/cart/{item_id}")
def remove_from_cart(item_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    cart_item = db.query(models.CartItem).filter(
        models.CartItem.id == item_id,
        models.CartItem.user_id == current_user.id
    ).first()
    
    if not cart_item:
        raise HTTPException(status_code=404, detail="Элемент корзины не найден")
    
    db.delete(cart_item)
    db.commit()
    return {"message": "Товар удален из корзины"}