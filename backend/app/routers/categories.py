from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Category, Event, User
from app.schemas import (
    CategoryCreate, CategoryUpdate, CategoryResponse, 
    CategoryWithEvents, CategoryEventResponse
)
from app.auth import require_admin, get_current_user_optional

router = APIRouter()

@router.get("/", response_model=List[CategoryResponse])
async def get_categories(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """Obtener lista de categorías (público)"""
    
    categories = db.query(Category).offset(skip).limit(limit).all()
    return categories

@router.get("/{category_id}", response_model=CategoryWithEvents)
async def get_category_by_id(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_optional)
):
    """Obtener categoría por ID con sus eventos"""
    
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría no encontrada"
        )
    
    # Obtener eventos de la categoría
    events = db.query(Event).filter(Event.categoria_id == category_id).all()
    
    # Convertir eventos a respuesta
    events_response = []
    for event in events:
        events_response.append(CategoryEventResponse(
            id=event.id,
            nombre=event.nombre,
            fecha_inicio=event.fecha_inicio.isoformat(),
            fecha_fin=event.fecha_fin.isoformat(),
            cupos=event.cupos
        ))
    
    return CategoryWithEvents(
        id=category.id,
        nombre=category.nombre,
        descripcion=category.descripcion,
        eventos=events_response
    )

@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category: CategoryCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Crear nueva categoría (solo administradores)"""
    
    # Verificar si ya existe una categoría con el mismo nombre
    existing_category = db.query(Category).filter(Category.nombre == category.nombre).first()
    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una categoría con este nombre"
        )
    
    db_category = Category(
        nombre=category.nombre,
        descripcion=category.descripcion
    )
    
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    
    return db_category

@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    category_update: CategoryUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Actualizar categoría (solo administradores)"""
    
    # Buscar la categoría
    db_category = db.query(Category).filter(Category.id == category_id).first()
    if not db_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría no encontrada"
        )
    
    # Verificar nombre único si se está cambiando
    if category_update.nombre and category_update.nombre != db_category.nombre:
        existing_category = db.query(Category).filter(Category.nombre == category_update.nombre).first()
        if existing_category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe una categoría con este nombre"
            )
    
    # Actualizar campos
    if category_update.nombre:
        db_category.nombre = category_update.nombre
    if category_update.descripcion is not None:
        db_category.descripcion = category_update.descripcion
    
    db.commit()
    db.refresh(db_category)
    
    return db_category

@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Eliminar categoría (solo administradores)"""
    
    # Buscar la categoría
    db_category = db.query(Category).filter(Category.id == category_id).first()
    if not db_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría no encontrada"
        )
    
    # Verificar si hay eventos asociados
    events_count = db.query(Event).filter(Event.categoria_id == category_id).count()
    if events_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede eliminar la categoría. Hay {events_count} evento(s) asociado(s)"
        )
    
    db.delete(db_category)
    db.commit()
    
    return None