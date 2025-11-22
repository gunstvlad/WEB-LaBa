# backend/app/routers/products.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from ..database import get_db
from .. import models, schemas

router = APIRouter()

@router.get("/products", response_model=List[schemas.ProductResponse])
def get_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    products = db.query(models.Product).offset(skip).limit(limit).all()
    return products

@router.get("/products/{product_id}", response_model=schemas.ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.post("/products", response_model=schemas.ProductResponse)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    db_product = models.Product(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@router.get("/products/category/{category}", response_model=List[schemas.ProductResponse])
def get_products_by_category(category: str, db: Session = Depends(get_db)):
    products = db.query(models.Product).filter(models.Product.category == category).all()
    return products

# backend/app/routers/products.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas

router = APIRouter()

# Ваши существующие эндпоинты
@router.get("/products", response_model=List[schemas.ProductResponse])
def get_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    products = db.query(models.Product).offset(skip).limit(limit).all()
    return products

@router.get("/products/{product_id}", response_model=schemas.ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="Товар не найден")
    return product

@router.get("/products/category/{category}", response_model=List[schemas.ProductResponse])
def get_products_by_category(category: str, db: Session = Depends(get_db)):
    products = db.query(models.Product).filter(models.Product.category == category).all()
    return products

# Новый эндпоинт для заполнения БД
@router.post("/seed-products", summary="Заполнить базу тестовыми товарами")
def seed_products(db: Session = Depends(get_db)):
    """
    Заполняет базу данных тестовыми товарами с фиксированными ID.
    ВАЖНО: Используется только для разработки!
    """
    
    # Тестовые товары с фиксированными ID
    products_data = [
        {
            "id": 1,
            "name": "Диван Aurora",
            "description": "Современный угловой диван с механизмом трансформации 'еврокнижка'. Изготовлен из высококачественной экокожи, имеет просторные спальные места. Каркас - массив березы, наполнитель - высокоэластичный ППУ. Размер: 220x160 см.",
            "price": 89900.0,
            "category": "sofa",
            "image_url": "/img/sofa1.png",
            "in_stock": True
        },
        {
            "id": 2,
            "name": "Диван Luna", 
            "description": "Элегантный прямой дисан с деревянными ножками из массива дуба. Идеально подходит для гостиной в классическом стиле. Механизм трансформации 'аккордеон', наполнитель - ортопедический латекс. Размер: 200x90 см.",
            "price": 124500.0,
            "category": "sofa",
            "image_url": "/img/sofa2.png",
            "in_stock": True
        },
        {
            "id": 3,
            "name": "Диван Cosmo",
            "description": "Компактный диван для небольших помещений. Имеет вместительный ящик для белья и регулируемые подушки. Механизм 'дельфин', каркас - ЛДСП. Идеален для малогабаритных квартир. Размер: 180x120 см.",
            "price": 76300.0,
            "category": "sofa", 
            "image_url": "/img/sofa3.png",
            "in_stock": True
        },
        {
            "id": 4,
            "name": "Шкаф-купе Milano",
            "description": "Вместительный шкаф-купе с зеркальными дверями. Внутреннее наполнение включает полки, штанги для вешалок и выдвижные ящики. Каркас - ЛДСП 16мм, фурнитура - Blum. Размер: 240x60x220 см.",
            "price": 45200.0,
            "category": "wardrobe",
            "image_url": "/img/wardrobe1.png",
            "in_stock": True
        },
        {
            "id": 5,
            "name": "Шкаф классический Vienna",
            "description": "Классический распашной шкаф из массива дерева. Солидный и долговечный вариант для спальни. Ручная обработка, натуральные материалы. Размер: 200x55x210 см.",
            "price": 38700.0,
            "category": "wardrobe",
            "image_url": "/img/wardrobe2.png",
            "in_stock": True
        },
        {
            "id": 6,
            "name": "Шкаф-гардеробная Modern",
            "description": "Система гардеробной с раздвижными дверями. Возможность кастомизации внутреннего наполнения под ваши потребности. В комплекте: штанги, полки, корзины. Размер: 300x65x230 см.",
            "price": 67900.0,
            "category": "wardrobe", 
            "image_url": "/img/wardrobe3.png",
            "in_stock": False  # Нет в наличии
        },
        {
            "id": 7,
            "name": "Кровать Valencia",
            "description": "Роскошная двуспальная кровать с высокой спинкой и мягкой обивкой из велюра. Оснащена подъемным механизмом для дополнительного хранения. Размер спального места: 200x160 см.",
            "price": 68700.0,
            "category": "bed",
            "image_url": "/img/bed1.png",
            "in_stock": True
        },
        {
            "id": 8,
            "name": "Кровать Oslo",
            "description": "Скандинавская кровать с минималистичным дизайном. Изготовлена из натурального дерева (сосна), покрыта экологичным лаком. Размер спального места: 200x140 см.",
            "price": 52400.0,
            "category": "bed",
            "image_url": "/img/bed2.png",
            "in_stock": True
        },
        {
            "id": 9,
            "name": "Кровать Imperial",
            "description": "Кровать премиум-класса с декоративной резьбой по дереву. Идеальный выбор для просторной спальни. Основание - реечное, ортопедическое. Размер спального места: 200x180 см.",
            "price": 95800.0,
            "category": "bed",
            "image_url": "/img/bed3.png",
            "in_stock": True
        }
    ]
    
    try:
        # Проверяем, есть ли уже товары
        existing_count = db.query(models.Product).count()
        if existing_count > 0:
            return {
                "message": f"В базе уже есть {existing_count} товаров",
                "action": "Пропущено",
                "existing_count": existing_count
            }
        
        # Добавляем товары с фиксированными ID
        added_count = 0
        for product_data in products_data:
            # Проверяем, существует ли товар с таким ID
            existing_product = db.query(models.Product).filter(models.Product.id == product_data["id"]).first()
            if not existing_product:
                product = models.Product(**product_data)
                db.add(product)
                added_count += 1
        
        db.commit()
        
        return {
            "message": "База успешно заполнена тестовыми товарами",
            "action": "Добавлено",
            "added_count": added_count,
            "total_products": len(products_data)
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail=f"Ошибка при заполнении базы: {str(e)}"
        )

@router.delete("/products/clear-all", summary="Очистить все товары (ТОЛЬКО ДЛЯ РАЗРАБОТКИ)")
def clear_all_products(
    db: Session = Depends(get_db),
    confirm: bool = False
):
    if not confirm:
        raise HTTPException(
            status_code=400, 
            detail="Требуется подтверждение: добавьте ?confirm=true к URL"
        )
    
    try:
        # Используем TRUNCATE с CASCADE для удаления связанных записей
        db.execute(text("TRUNCATE TABLE products RESTART IDENTITY CASCADE"))
        db.commit()
        
        return {
            "message": "Таблица products и связанные cart_items очищены",
            "reset_identity": "ID сброшены к 1"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка: {str(e)}")