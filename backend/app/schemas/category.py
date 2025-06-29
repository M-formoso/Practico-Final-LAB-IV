from pydantic import BaseModel
from typing import Optional, List

# Esquema base para Categoría
class CategoryBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None

# Esquema para crear categoría
class CategoryCreate(CategoryBase):
    pass

# Esquema para actualizar categoría
class CategoryUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None

# Esquema para respuesta de categoría
class CategoryResponse(CategoryBase):
    id: int
    
    class Config:
        from_attributes = True

# Esquema para evento básico en respuesta de categoría
class CategoryEventResponse(BaseModel):
    id: int
    nombre: str
    fecha_inicio: str
    fecha_fin: str
    cupos: int
    
    class Config:
        from_attributes = True

# Esquema completo de categoría con eventos
class CategoryWithEvents(CategoryResponse):
    eventos: List[CategoryEventResponse] = []