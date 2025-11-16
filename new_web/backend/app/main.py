from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import engine, Base
from . import models
from .routers import users, products, cart, reviews

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="мебельный магазин")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    )

app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(products.router, prefix="/products", tags=["Products"])
app.include_router(cart.router, prefix="/cart", tags=["Cart"])
app.include_router(reviews.router, prefix="/reviews", tags=["Reviews"])


@app.get("/")
def read_root():
    return {"message": "Welcome to the Furniture Store API!"}

