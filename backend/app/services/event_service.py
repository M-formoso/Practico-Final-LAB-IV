from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from app.models.event import Event
from app.models.inscription import Inscription
from app.schemas.event import EventCreate, EventUpdate
from datetime import date
from typing import Optional, List

class EventService:
    """
    Service para gestionar eventos.
    Se conecta con:
    - Models: Event, Inscription (para verificar cupos)
    - Schemas: EventCreate, EventUpdate
    """
    
    @staticmethod
    def create_event(db: Session, event_data: EventCreate) -> Event:
        """
        Crea un nuevo evento.
        """
        db_event = Event(
            nombre=event_data.nombre,
            descripcion=event_data.descripcion,
            fecha_inicio=event_data.fecha_inicio,
            fecha_fin=event_data.fecha_fin,
            lugar=event_data.lugar,
            cupos=event_data.cupos,
            categoria_id=event_data.categoria_id
        )
        db.add(db_event)
        db.commit()
        db.refresh(db_event)
        return db_event
    
    @staticmethod
    def get_event_by_id(db: Session, event_id: int) -> Optional[Event]:
        """
        Obtiene un evento por su ID.
        """
        return db.query(Event).filter(Event.id == event_id).first()
    
    @staticmethod
    def get_all_events(db: Session, skip: int = 0, limit: int = 100) -> List[Event]:
        """
        Obtiene todos los eventos con paginación.
        """
        return db.query(Event).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_available_events(db: Session) -> List[Event]:
        """
        Obtiene eventos disponibles (fecha_fin >= hoy y con cupos disponibles).
        """
        today = date.today()
        return db.query(Event).filter(Event.fecha_fin >= today).all()
    
    @staticmethod
    def search_events(db: Session, search_term: str) -> List[Event]:
        """
        Busca eventos por nombre o descripción.
        Cumple con el requisito: "Buscar eventos por nombre o descripción"
        """
        return db.query(Event).filter(
            or_(
                Event.nombre.ilike(f"%{search_term}%"),
                Event.descripcion.ilike(f"%{search_term}%")
            )
        ).all()
    
    @staticmethod
    def get_events_by_category(db: Session, category_id: int) -> List[Event]:
        """
        Lista todos los eventos de una categoría específica.
        Cumple con el requisito: "Listar todos los eventos de una categoría específica"
        """
        return db.query(Event).filter(Event.categoria_id == category_id).all()
    
    @staticmethod
    def get_event_available_spots(db: Session, event_id: int) -> int:
        """
        Calcula los cupos disponibles de un evento.
        cupos_disponibles = cupos_totales - inscripciones_activas
        """
        event = db.query(Event).filter(Event.id == event_id).first()
        if not event:
            return 0
        
        # Contar inscripciones activas (eventos que aún no terminaron)
        inscriptions_count = db.query(Inscription).filter(
            and_(
                Inscription.evento_id == event_id,
                Event.fecha_fin >= date.today()
            )
        ).join(Event).count()
        
        return event.cupos - inscriptions_count
    
    @staticmethod
    def update_event(db: Session, event_id: int, event_data: EventUpdate) -> Optional[Event]:
        """
        Actualiza un evento existente.
        """
        db_event = db.query(Event).filter(Event.id == event_id).first()
        if not db_event:
            return None
        
        update_data = event_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_event, field, value)
        
        db.commit()
        db.refresh(db_event)
        return db_event
    
    @staticmethod
    def delete_event(db: Session, event_id: int) -> bool:
        """
        Elimina un evento.
        Nota: Verificar inscripciones antes de eliminar.
        """
        db_event = db.query(Event).filter(Event.id == event_id).first()
        if not db_event:
            return False
        
        db.delete(db_event)
        db.commit()
        return True
    
    # Métodos para Dashboard
    @staticmethod
    def get_total_events_count(db: Session) -> int:
        """
        Número total de eventos.
        Para Dashboard: "Número total de eventos"
        """
        return db.query(Event).count()
    
    @staticmethod
    def get_event_with_most_inscriptions(db: Session) -> Optional[Event]:
        """
        Evento con más inscripciones.
        Para Dashboard: "Evento con más inscripciones"
        """
        result = db.query(
            Event.id,
            func.count(Inscription.id).label('inscription_count')
        ).join(Inscription).group_by(Event.id).order_by(
            func.count(Inscription.id).desc()
        ).first()
        
        if result:
            return db.query(Event).filter(Event.id == result.id).first()
        return None
    
    @staticmethod
    def get_average_inscriptions_per_event(db: Session) -> float:
        """
        Promedio de usuarios inscritos en cada evento.
        Para Dashboard: "Promedio de usuarios inscritos en cada evento"
        """
        result = db.query(
            func.avg(func.count(Inscription.id))
        ).join(Event).group_by(Event.id).scalar()
        
        return result or 0.0