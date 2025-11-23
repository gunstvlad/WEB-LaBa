# backend/app/routers/orders.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(prefix="/orders", tags=["Orders"])

# backend/app/routers/orders.py - обновите create_order
@router.post("/", response_model=schemas.OrderResponse)
def create_order(
    order_data: schemas.OrderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Рассчитываем общую сумму и создаем элементы заказа
    total_amount = 0
    order_items = []
    
    for item in order_data.items:
        # Получаем продукт из базы
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with id {item.product_id} not found"
            )
        
        if not product.in_stock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product {product.name} is out of stock"
            )
        
        # Используем цену из базы данных, а не из запроса
        item_price = item.price if item.price is not None else product.price
        item_total = item_price * item.quantity
        total_amount += item_total
        
        # Создаем OrderItem
        order_item = models.OrderItem(
            product_id=item.product_id,
            quantity=item.quantity,
            price=item_price  # Используем вычисленную цену
        )
        order_items.append(order_item)
    
    # Создаем заказ
    order = models.Order(
        user_id=current_user.id,
        total_amount=total_amount,
        status="pending",
        items=order_items
    )
    
    db.add(order)
    db.commit()
    db.refresh(order)
    
    return order

@router.get("/", response_model=List[schemas.OrderResponse])
def get_user_orders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    orders = db.query(models.Order).filter(models.Order.user_id == current_user.id).order_by(models.Order.created_at.desc()).all()
    return orders

@router.get("/{order_id}", response_model=schemas.OrderResponse)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.user_id == current_user.id
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    return order