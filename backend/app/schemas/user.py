from pydantic import BaseModel, EmailStr
from app.models.user import UserRole
from typing import Optional, List
from datetime import date

# Esquema base para Usuario
class UserBase(BaseModel):
    nombre: str
    email: EmailStr
    rol: UserRole = UserRole.CLIENTE

# Esquema para crear usuario
class UserCreate(UserBase):
    contraseña: str

# Esquema para actualizar usuario
class UserUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[EmailStr] = None
    contraseña: Optional[str] = None

# Esquema para respuesta de usuario (sin contraseña)
class UserResponse(UserBase):
    id: int
    
    class Config:
        from_attributes = True

# Esquema para inscripción en respuesta de usuario
class UserInscriptionResponse(BaseModel):
    id: int
    evento_id: int
    fecha_inscripcion: date
    evento_nombre: str
    evento_fecha_inicio: date
    evento_fecha_fin: date
    
    class Config:
        from_attributes = True

# Esquema completo de usuario con inscripciones
class UserWithInscriptions(UserResponse):
    inscripciones: List[UserInscriptionResponse] = []

# Esquemas para autenticación
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    contraseña: str