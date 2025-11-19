# backend/app/auth.py
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status

SECRET_KEY = "your-secret-key"  # В продакшене вынести в .env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt_sha256"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        # Не логируем plain_password — только ошибку
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password verification error")

def get_password_hash(password):
    try:
        return pwd_context.hash(password)
    except ValueError as e:
        # Защита: если вдруг передали очень длинный пароль и произошла ошибка
        # (при bcrypt_sha256 это маловероятно), возвращаем явную ошибку клиенту
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise credentials_exception