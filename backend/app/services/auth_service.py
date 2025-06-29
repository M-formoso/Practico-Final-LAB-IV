# app/services/auth_service.py
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import timedelta
from app.models import User
from app.schemas import UserCreate, UserLogin
from app.utils.security import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    ACCESS_TOKEN_EXPIRE_MINUTES
)

class AuthService:
    
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> User:
        """Obtener usuario por email"""
        return db.query(User).filter(User.email == email).first()
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> User:
        """Obtener usuario por ID"""
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> User:
        """Autenticar usuario con email y contraseña"""
        user = AuthService.get_user_by_email(db, email)
        if not user:
            return False
        if not verify_password(password, user.contraseña):
            return False
        return user
    
    @staticmethod
    def register_user(db: Session, user_data: UserCreate) -> User:
        """Registrar un nuevo usuario"""
        # Verificar si el email ya existe
        existing_user = AuthService.get_user_by_email(db, email=user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un usuario con este email"
            )
        
        # Crear nuevo usuario
        hashed_password = get_password_hash(user_data.contraseña)
        db_user = User(
            nombre=user_data.nombre,
            email=user_data.email,
            contraseña=hashed_password,
            rol=user_data.rol
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        return db_user
    
    @staticmethod
    def login_user(db: Session, user_credentials: UserLogin) -> dict:
        """Iniciar sesión y generar token"""
        # Autenticar usuario
        user = AuthService.authenticate_user(
            db, 
            email=user_credentials.email, 
            password=user_credentials.contraseña
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email o contraseña incorrectos",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Crear token de acceso
        return AuthService.create_user_token(user)
    
    @staticmethod
    def create_user_token(user: User) -> dict:
        """Crear token JWT para el usuario"""
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email, "role": user.rol.value, "user_id": user.id},
            expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user.id,
            "email": user.email,
            "role": user.rol.value
        }
    
    @staticmethod
    def verify_user_exists(db: Session, user_id: int) -> bool:
        """Verificar si un usuario existe por ID"""
        user = AuthService.get_user_by_id(db, user_id)
        return user is not None