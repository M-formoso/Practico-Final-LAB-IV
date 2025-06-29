from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import User, Category
from app.schemas import (
    EventCreate, EventUpdate, EventResponse, EventListResponse,
    EventWithInscriptions, EventInscriptionResponse
)
from app.auth import require_admin, get_current_user_optional
from app.services import EventService, CategoryService, InscriptionService
from datetime import date

router = APIRouter()

def build_event_list_response(event, category_name: str, available_spots: int, total_inscriptions: int) -> EventListResponse:
    """Helper para construir la respuesta de lista de eventos"""
    return EventListResponse(
        id=event.id,
        nombre=event.nombre,
        descripcion=event.descripcion,
        fecha_inicio=event.fecha_inicio,
        fecha_fin=event.fecha_fin,
        lugar=event.lugar,
        cupos=event.cupos,
        categoria_id=event.categoria_id,
        categoria_nombre=category_name,
        cupos_disponibles=available_spots,
        total_inscripciones=total_inscriptions
    )

@router.get("/", response_model=List[EventListResponse])
async def get_events(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    categoria_id: Optional[int] = Query(None, description="Filtrar por categoría"),
    current_user: User = Depends(get_current_user_optional)
):
    """Obtener lista de eventos disponibles (público)"""
    
    if categoria_id:
        # Verificar que la categoría existe
        category = CategoryService.get_category_by_id(db, categoria_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Categoría no encontrada"
            )
        events = EventService.get_events_by_category(db, categoria_id)
    else:
        # Usar paginación del service
        events = EventService.get_all_events(db, skip, limit)
    
    result = []
    for event in events:
        # Obtener datos adicionales usando services
        available_spots = EventService.get_event_available_spots(db, event.id)
        total_inscriptions = len(InscriptionService.get_event_inscriptions(db, event.id))
        category = CategoryService.get_category_by_id(db, event.categoria_id)
        
        result.append(build_event_list_response(
            event, category.nombre, available_spots, total_inscriptions
        ))
    
    return result

@router.get("/search", response_model=List[EventListResponse])
async def search_events(
    q: str = Query(..., description="Término de búsqueda"),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """Buscar eventos por nombre o descripción"""
    
    # Usar el service para búsqueda
    events = EventService.search_events(db, q)
    
    # Aplicar paginación manual ya que el service no la incluye en search
    paginated_events = events[skip:skip + limit]
    
    result = []
    for event in paginated_events:
        available_spots = EventService.get_event_available_spots(db, event.id)
        total_inscriptions = len(InscriptionService.get_event_inscriptions(db, event.id))
        category = CategoryService.get_category_by_id(db, event.categoria_id)
        
        result.append(build_event_list_response(
            event, category.nombre, available_spots, total_inscriptions
        ))
    
    return result

@router.get("/category/{category_id}", response_model=List[EventListResponse])
async def get_events_by_category(
    category_id: int,
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """Obtener eventos de una categoría específica"""
    
    # Verificar que la categoría existe usando service
    category = CategoryService.get_category_by_id(db, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría no encontrada"
        )
    
    # Usar service para obtener eventos
    events = EventService.get_events_by_category(db, category_id)
    
    # Aplicar paginación manual
    paginated_events = events[skip:skip + limit]
    
    result = []
    for event in paginated_events:
        available_spots = EventService.get_event_available_spots(db, event.id)
        total_inscriptions = len(InscriptionService.get_event_inscriptions(db, event.id))
        
        result.append(build_event_list_response(
            event, category.nombre, available_spots, total_inscriptions
        ))
    
    return result

@router.get("/active", response_model=List[EventListResponse])
async def get_active_events(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """Obtener eventos activos (fecha de fin mayor o igual a hoy)"""
    
    # Usar service para eventos disponibles
    events = EventService.get_available_events(db)
    
    # Aplicar paginación manual
    paginated_events = events[skip:skip + limit]
    
    result = []
    for event in paginated_events:
        available_spots = EventService.get_event_available_spots(db, event.id)
        total_inscriptions = len(InscriptionService.get_event_inscriptions(db, event.id))
        category = CategoryService.get_category_by_id(db, event.categoria_id)
        
        result.append(build_event_list_response(
            event, category.nombre, available_spots, total_inscriptions
        ))
    
    return result

@router.get("/stats", response_model=dict)
async def get_events_stats(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Obtener estadísticas de eventos (solo administradores)"""
    
    # Usar services para obtener estadísticas
    total_events = EventService.get_total_events_count(db)
    active_inscriptions = InscriptionService.get_total_active_inscriptions_count(db)
    avg_inscriptions = EventService.get_average_inscriptions_per_event(db)
    most_popular_event = EventService.get_event_with_most_inscriptions(db)
    
    most_popular_event_data = None
    if most_popular_event:
        total_inscriptions = len(InscriptionService.get_event_inscriptions(db, most_popular_event.id))
        most_popular_event_data = {
            "id": most_popular_event.id,
            "nombre": most_popular_event.nombre,
            "total_inscripciones": total_inscriptions
        }
    
    return {
        "total_eventos": total_events,
        "total_inscripciones_activas": active_inscriptions,
        "promedio_inscripciones_por_evento": round(float(avg_inscriptions), 2),
        "evento_mas_popular": most_popular_event_data
    }

@router.get("/{event_id}", response_model=EventWithInscriptions)
async def get_event_by_id(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_optional)
):
    """Obtener evento por ID con detalles completos"""
    
    # Usar service para obtener evento
    event = EventService.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento no encontrado"
        )
    
    # Obtener datos adicionales usando services
    available_spots = EventService.get_event_available_spots(db, event_id)
    total_inscriptions = len(InscriptionService.get_event_inscriptions(db, event_id))
    category = CategoryService.get_category_by_id(db, event.categoria_id)
    
    # Obtener inscripciones si es admin
    inscripciones = []
    if current_user and current_user.rol.value == "Administrador":
        db_inscripciones = InscriptionService.get_event_inscriptions(db, event_id)
        
        for inscripcion in db_inscripciones:
            # Aquí necesitarías obtener los datos del usuario, podrías agregar esto al service
            # o hacer la consulta directamente
            from app.services import UserService
            user = UserService.get_user_by_id(db, inscripcion.usuario_id)
            
            inscripciones.append(EventInscriptionResponse(
                id=inscripcion.id,
                usuario_id=inscripcion.usuario_id,
                usuario_nombre=user.nombre,
                usuario_email=user.email,
                fecha_inscripcion=inscripcion.fecha_inscripcion
            ))
    
    return EventWithInscriptions(
        id=event.id,
        nombre=event.nombre,
        descripcion=event.descripcion,
        fecha_inicio=event.fecha_inicio,
        fecha_fin=event.fecha_fin,
        lugar=event.lugar,
        cupos=event.cupos,
        categoria_id=event.categoria_id,
        categoria_nombre=category.nombre,
        cupos_disponibles=available_spots,
        total_inscripciones=total_inscriptions,
        inscripciones=inscripciones
    )

@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    event: EventCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Crear nuevo evento (solo administradores)"""
    
    # Verificar que la categoría existe usando service
    category = CategoryService.get_category_by_id(db, event.categoria_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La categoría especificada no existe"
        )
    
    # Validaciones de negocio
    if event.fecha_inicio < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha de inicio no puede ser en el pasado"
        )
    
    if event.fecha_fin < event.fecha_inicio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha de fin no puede ser anterior a la fecha de inicio"
        )
    
    if event.cupos <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Los cupos deben ser mayor a 0"
        )
    
    # Crear evento usando service
    db_event = EventService.create_event(db, event)
    
    # Obtener datos adicionales para la respuesta
    available_spots = EventService.get_event_available_spots(db, db_event.id)
    total_inscriptions = 0  # Nuevo evento, sin inscripciones
    
    return EventResponse(
        id=db_event.id,
        nombre=db_event.nombre,
        descripcion=db_event.descripcion,
        fecha_inicio=db_event.fecha_inicio,
        fecha_fin=db_event.fecha_fin,
        lugar=db_event.lugar,
        cupos=db_event.cupos,
        categoria_id=db_event.categoria_id,
        categoria_nombre=category.nombre,
        cupos_disponibles=available_spots,
        total_inscripciones=total_inscriptions
    )

@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: int,
    event_update: EventUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Actualizar evento (solo administradores)"""
    
    # Verificar que el evento existe
    db_event = EventService.get_event_by_id(db, event_id)
    if not db_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento no encontrado"
        )
    
    # Verificar categoría si se está cambiando
    if event_update.categoria_id:
        category = CategoryService.get_category_by_id(db, event_update.categoria_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La categoría especificada no existe"
            )
    
    # Validaciones de fechas
    fecha_inicio = event_update.fecha_inicio or db_event.fecha_inicio
    fecha_fin = event_update.fecha_fin or db_event.fecha_fin
    
    if event_update.fecha_fin and event_update.fecha_fin < fecha_inicio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha de fin no puede ser anterior a la fecha de inicio"
        )
    
    if event_update.fecha_inicio and event_update.fecha_inicio > fecha_fin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha de inicio no puede ser posterior a la fecha de fin"
        )
    
    # Validar cupos si se están actualizando
    if event_update.cupos:
        current_inscriptions = len(InscriptionService.get_event_inscriptions(db, event_id))
        if event_update.cupos < current_inscriptions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No se pueden reducir los cupos por debajo de las {current_inscriptions} inscripciones existentes"
            )
        if event_update.cupos <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Los cupos deben ser mayor a 0"
            )
    
    # Actualizar usando service
    updated_event = EventService.update_event(db, event_id, event_update)
    if not updated_event:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al actualizar el evento"
        )
    
    # Obtener datos actualizados para la respuesta
    category = CategoryService.get_category_by_id(db, updated_event.categoria_id)
    available_spots = EventService.get_event_available_spots(db, updated_event.id)
    total_inscriptions = len(InscriptionService.get_event_inscriptions(db, updated_event.id))
    
    return EventResponse(
        id=updated_event.id,
        nombre=updated_event.nombre,
        descripcion=updated_event.descripcion,
        fecha_inicio=updated_event.fecha_inicio,
        fecha_fin=updated_event.fecha_fin,
        lugar=updated_event.lugar,
        cupos=updated_event.cupos,
        categoria_id=updated_event.categoria_id,
        categoria_nombre=category.nombre,
        cupos_disponibles=available_spots,
        total_inscripciones=total_inscriptions
    )

@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Eliminar evento (solo administradores)"""
    
    # Verificar que el evento existe
    db_event = EventService.get_event_by_id(db, event_id)
    if not db_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento no encontrado"
        )
    
    # Verificar si hay inscripciones asociadas usando service
    inscripciones = InscriptionService.get_event_inscriptions(db, event_id)
    if len(inscripciones) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede eliminar el evento porque tiene {len(inscripciones)} inscripciones asociadas"
        )
    
    # Eliminar usando service
    success = EventService.delete_event(db, event_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al eliminar el evento"
        )
    
    return None