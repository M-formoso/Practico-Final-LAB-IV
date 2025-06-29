from pydantic import BaseModel
from typing import Optional
from datetime import date

# Esquema base para Inscripción
class InscriptionBase(BaseModel):
    evento_id: int
    usuario_id: int

# Esquema para crear inscripción
class InscriptionCreate(BaseModel):
    evento_id: int
    # usuario_id se obtendrá del token JWT

# Esquema para respuesta de inscripción
class InscriptionResponse(InscriptionBase):
    id: int
    fecha_inscripcion: date
    
    class Config:
        from_attributes = True

# Esquema detallado de inscripción con datos del evento
class InscriptionDetailResponse(BaseModel):
    id: int
    evento_id: int
    usuario_id: int
    fecha_inscripcion: date
    evento_nombre: str
    evento_descripcion: Optional[str] = None
    evento_fecha_inicio: date
    evento_fecha_fin: date
    evento_lugar: str
    categoria_nombre: str
    
    class Config:
        from_attributes = True

# Esquema para respuesta de inscripción activa
class ActiveInscriptionResponse(BaseModel):
    id: int
    evento_id: int
    fecha_inscripcion: date
    evento_nombre: str
    evento_fecha_inicio: date
    evento_fecha_fin: date
    evento_lugar: str
    categoria_nombre: str
    
    class Config:
        from_attributes = True

# Esquema para historial de inscripciones
class InscriptionHistoryResponse(BaseModel):
    id: int
    evento_id: int
    fecha_inscripcion: date
    evento_nombre: str
    evento_fecha_inicio: date
    evento_fecha_fin: date
    evento_lugar: str
    categoria_nombre: str
    estado: str  # "activo", "finalizado", "cancelado"
    
    class Config:
        from_attributes = True