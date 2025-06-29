from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import date

# Esquema base para Evento
class EventBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    fecha_inicio: date
    fecha_fin: date
    lugar: str
    cupos: int
    categoria_id: int
    
    @validator('fecha_fin')
    def validate_dates(cls, v, values):
        if 'fecha_inicio' in values and v <= values['fecha_inicio']:
            raise ValueError('La fecha de fin debe ser posterior a la fecha de inicio')
        return v
    
    @validator('cupos')
    def validate_cupos(cls, v):
        if v <= 0:
            raise ValueError('Los cupos deben ser mayor a 0')
        return v

# Esquema para crear evento
class EventCreate(EventBase):
    pass

# Esquema para actualizar evento
class EventUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    lugar: Optional[str] = None
    cupos: Optional[int] = None
    categoria_id: Optional[int] = None
    
    @validator('cupos')
    def validate_cupos(cls, v):
        if v is not None and v <= 0:
            raise ValueError('Los cupos deben ser mayor a 0')
        return v

# Esquema para respuesta de evento
class EventResponse(EventBase):
    id: int
    categoria_nombre: str
    cupos_disponibles: int
    total_inscripciones: int
    
    class Config:
        from_attributes = True

# Esquema básico de evento para listas
class EventListResponse(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    fecha_inicio: date
    fecha_fin: date
    lugar: str
    cupos: int
    categoria_id: int
    categoria_nombre: str
    cupos_disponibles: int
    total_inscripciones: int
    
    class Config:
        from_attributes = True

# Esquema para inscripción en respuesta de evento
class EventInscriptionResponse(BaseModel):
    id: int
    usuario_id: int
    usuario_nombre: str
    usuario_email: str
    fecha_inscripcion: date
    
    class Config:
        from_attributes = True

# Esquema completo de evento con inscripciones
class EventWithInscriptions(EventResponse):
    inscripciones: List[EventInscriptionResponse] = []