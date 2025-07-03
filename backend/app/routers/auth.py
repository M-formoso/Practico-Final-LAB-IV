# app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import UserCreate, UserResponse, Token, UserLogin
from app.services.auth_service import AuthService
from app.auth import get_current_user
from app.models import User

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """Registrar un nuevo usuario"""
    return AuthService.register_user(db, user)

@router.post("/login", response_model=Token)
async def login_user(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Iniciar sesión y obtener token JWT"""
    return AuthService.login_user(db, user_credentials)

@router.post("/login/form", response_model=Token)
async def login_with_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login usando OAuth2PasswordRequestForm (para compatibilidad con formularios)"""
    
    # Convertir OAuth2PasswordRequestForm a UserLogin
    user_credentials = UserLogin(
        email=form_data.username,  # OAuth2 usa 'username' pero nosotros usamos email
        contraseña=form_data.password
    )
    
    return AuthService.login_user(db, user_credentials)

@router.get("/verify")
async def verify_token_endpoint(current_user: User = Depends(get_current_user)):
    """Verificar si el token actual es válido"""
    return {
        "message": "Token válido", 
        "status": "valid",
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "role": current_user.rol.value
        }
    }