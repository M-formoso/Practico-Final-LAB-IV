from sqlalchemy import Column, Integer, String, Enum
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class UserRole(str, enum.Enum):
    ADMINISTRADOR = "Administrador"
    CLIENTE = "Cliente"

class User(Base):
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    contraseña = Column(String(255), nullable=False)  # Será hasheada
    rol = Column(Enum(UserRole), default=UserRole.CLIENTE, nullable=False)
    
    # Relaciones
    inscripciones = relationship("Inscription", back_populates="usuario")