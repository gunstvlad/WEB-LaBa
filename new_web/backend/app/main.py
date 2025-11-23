# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="Мебельный магазин API")

# Правильные настройки CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5501",  # Live Server
        "http://127.0.0.1:5501",  # Live Server альтернативный
        "http://localhost:3000",  # React dev server
        "http://127.0.0.1:3000",  # React dev server альтернативный
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Разрешить все методы
    allow_headers=["*"],  # Разрешить все заголовки
)

# Добавьте обработчик для OPTIONS запросов
@app.options("/api/{path:path}")
async def options_handler():
    return JSONResponse(status_code=200, content={})

from .routers import users, products, cart, reviews, auth, orders

app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(users.router, prefix="/api", tags=["users"])
app.include_router(products.router, prefix="/api", tags=["products"])
app.include_router(cart.router, prefix="/api", tags=["cart"])
app.include_router(reviews.router, prefix="/api", tags=["reviews"])
app.include_router(orders.router, prefix="/api", tags=["orders"])


@app.get("/")
def read_root():
    return {"message": "Мебельный магазин API"}