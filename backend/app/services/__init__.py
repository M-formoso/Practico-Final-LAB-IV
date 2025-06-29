from .user_service import UserService
from .event_service import EventService
from .category_service import CategoryService
from .inscription_service import InscriptionService

__all__ = [
    "UserService",
    "EventService", 
    "CategoryService",
    "InscriptionService"
]

# app/services/user_service.py
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.utils.security import get_password_hash, verify_password
from typing import Optional, List

class UserService:
    """
    Service para gestionar operaciones de usuarios.
    Se conecta con:
    - Models: User
    - Schemas: UserCreate, UserUpdate
    - Utils: security (para hash de contraseñas)
    """
    
    @staticmethod
    def create_user(db: Session, user_data: UserCreate) -> User:
        """
        Crea un nuevo usuario en la base de datos.
        Hashea la contraseña antes de guardarla.
        """
        hashed_password = get_password_hash(user_data.password)
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
    def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
        """
        Obtiene un usuario por su ID.
        """
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        """
        Obtiene un usuario por su email.
        Útil para login y verificar emails únicos.
        """
        return db.query(User).filter(User.email == email).first()
    
    @staticmethod
    def get_all_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
        """
        Obtiene todos los usuarios con paginación.
        """
        return db.query(User).offset(skip).limit(limit).all()
    
    @staticmethod
    def update_user(db: Session, user_id: int, user_data: UserUpdate) -> Optional[User]:
        """
        Actualiza un usuario existente.
        """
        db_user = db.query(User).filter(User.id == user_id).first()
        if not db_user:
            return None
        
        update_data = user_data.dict(exclude_unset=True)
        
        # Si se actualiza la contraseña, la hasheamos
        if "password" in update_data:
            update_data["contraseña"] = get_password_hash(update_data.pop("password"))
        
        for field, value in update_data.items():
            setattr(db_user, field, value)
        
        db.commit()
        db.refresh(db_user)
        return db_user
    
    @staticmethod
    def delete_user(db: Session, user_id: int) -> bool:
        """
        Elimina un usuario de la base de datos.
        """
        db_user = db.query(User).filter(User.id == user_id).first()
        if not db_user:
            return False
        
        db.delete(db_user)
        db.commit()
        return True
    
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        """
        Autentica un usuario verificando email y contraseña.
        Usado para el login.
        """
        user = UserService.get_user_by_email(db, email)
        if not user or not verify_password(password, user.contraseña):
            return None
        return user
