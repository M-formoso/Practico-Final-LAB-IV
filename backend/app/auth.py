from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserRole
from app.utils.security import verify_token
from typing import Optional

# Configurar el esquema de autenticación Bearer
security = HTTPBearer()

class AuthService:
    """Servicio para manejar autenticación y autorización"""
    
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        """Autenticar usuario con email y contraseña"""
        from app.utils.security import verify_password
        
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return None
        if not verify_password(password, user.contraseña):
            return None
        return user
    
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        """Obtener usuario por email"""
        return db.query(User).filter(User.email == email).first()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Obtener el usuario actual desde el token JWT"""
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Verificar el token
    email = verify_token(credentials.credentials)
    if email is None:
        raise credentials_exception
    
    # Buscar el usuario en la base de datos
    user = AuthService.get_user_by_email(db, email=email)
    if user is None:
        raise credentials_exception
    
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Obtener usuario activo (puedes agregar más validaciones aquí)"""
    # Aquí podrías agregar validaciones adicionales como usuario activo/bloqueado
    return current_user

def require_admin(current_user: User = Depends(get_current_active_user)) -> User:
    """Requerir que el usuario sea administrador"""
    if current_user.rol != UserRole.ADMINISTRADOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos de administrador para realizar esta acción"
        )
    return current_user

def require_auth(current_user: User = Depends(get_current_active_user)) -> User:
    """Requerir autenticación (alias para get_current_active_user)"""
    return current_user

# Dependencias opcionales para cuando el usuario puede estar o no autenticado
def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Obtener usuario actual (opcional - puede ser None)"""
    if not credentials:
        return None
    
    try:
        email = verify_token(credentials.credentials)
        if email is None:
            return None
        
        user = AuthService.get_user_by_email(db, email=email)
        return user
    except Exception:
        return None