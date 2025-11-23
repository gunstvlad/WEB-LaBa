# backend/app/routers/cart.py
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas, auth
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)
router = APIRouter()

def get_current_user(token: Optional[str] = None, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    logger.info(f"🔐 Получен token: {token}")
    logger.info(f"🔐 Получен authorization header: {authorization}")
    
    # Пробуем получить токен из разных источников
    actual_token = None
    
    if token:
        # Токен из query параметра
        actual_token = token
        logger.info("🔐 Используем токен из query параметра")
    elif authorization and authorization.startswith("Bearer "):
        # Токен из заголовка Authorization
        actual_token = authorization[7:]
        logger.info("🔐 Используем токен из заголовка Authorization")
    else:
        logger.error("❌ Токен не предоставлен")
        raise HTTPException(status_code=401, detail="Токен не предоставлен")
    
    try:
        # Верифицируем токен
        payload = auth.verify_token(actual_token)
        logger.info(f"🔐 Декодированный payload: {payload}")
        
        email = payload.get("sub")
        if not email:
            logger.error("❌ В токене отсутствует email (sub)")
            raise HTTPException(status_code=401, detail="Invalid token")
        
        logger.info(f"🔐 Извлечен email: {email}")
        
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            logger.error(f"❌ Пользователь с email {email} не найден")
            # Создаем временного пользователя для тестирования
            user = models.User(
                email=email,
                hashed_password="temp",
                full_name="Temp User"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info(f"🔐 Создан временный пользователь: {user.email}")
        
        logger.info(f"🔐 Найден пользователь: {user.email}")
        return user
        
    except Exception as e:
        logger.error(f"❌ Ошибка аутентификации: {e}")
        raise HTTPException(status_code=401, detail=f"Ошибка аутентификации: {str(e)}")

@router.get("/cart", response_model=List[schemas.CartItemResponse])
def get_cart_items(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    logger.info(f"🛒 Получение корзины для пользователя: {current_user.email}")
    
    # Используем join чтобы загрузить связанные товары и отфильтровать невалидные
    cart_items = db.query(models.CartItem).join(models.Product).filter(
        models.CartItem.user_id == current_user.id
    ).all()
    
    logger.info(f"🛒 Найдено элементов в корзине: {len(cart_items)}")
    return cart_items

@router.post("/cart", response_model=schemas.CartItemResponse)
def add_to_cart(
    cart_item: schemas.CartItemCreate, 
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    logger.info(f"🛒 Добавление в корзину: product_id={cart_item.product_id}, quantity={cart_item.quantity}")
    logger.info(f"🛒 Пользователь: {current_user.email}")
    
    # ВРЕМЕННО: Создаем товар если его нет (для тестирования)
    product = db.query(models.Product).filter(models.Product.id == cart_item.product_id).first()
    if not product:
        logger.info(f"🛒 Товар с ID {cart_item.product_id} не найден, создаем временный")
        product = models.Product(
            id=cart_item.product_id,
            name=f"Товар {cart_item.product_id}",
            price=10000.0,
            category="sofa",
            description="Временный товар для тестирования"
        )
        db.add(product)
        db.commit()
        db.refresh(product)
        logger.info(f"🛒 Создан временный товар: {product.name}")
    
    logger.info(f"🛒 Найден товар: {product.name}")
    
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
        logger.info(f"🛒 Обновлен существующий элемент: id={existing_item.id}, quantity={existing_item.quantity}")
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
        logger.info(f"🛒 Создан новый элемент корзины: id={db_cart_item.id}")
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

@router.delete("/cart/clear")
def clear_cart(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(models.CartItem).filter(models.CartItem.user_id == current_user.id).delete()
    db.commit()
    return {"message": "Корзина очищена"}