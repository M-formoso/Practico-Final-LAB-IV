from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.inscription import Inscription
from app.models.event import Event
from app.schemas.inscription import InscriptionCreate
from app.services.event_service import EventService
from datetime import date
from typing import Optional, List

class InscriptionService:
    """
    Service para gestionar inscripciones a eventos.
    Se conecta con:
    - Models: Inscription, Event
    - Schemas: InscriptionCreate
    - Services: EventService (para verificar cupos)
    """
    
    @staticmethod
    def create_inscription(db: Session, inscription_data: InscriptionCreate, user_id: int) -> Optional[Inscription]:
        """
        Crea una nueva inscripción verificando disponibilidad de cupos.
        Cumple con el requisito: "verificar previamente la disponibilidad del cupo"
        """
        # Verificar que el evento existe
        event = EventService.get_event_by_id(db, inscription_data.evento_id)
        if not event:
            return None
        
        # Verificar que el evento no haya terminado
        if event.fecha_fin < date.today():
            return None
        
        # Verificar que el usuario no esté ya inscrito
        existing_inscription = db.query(Inscription).filter(
            and_(
                Inscription.evento_id == inscription_data.evento_id,
                Inscription.usuario_id == user_id
            )
        ).first()
        
        if existing_inscription:
            return None
        
        # Verificar cupos disponibles
        available_spots = EventService.get_event_available_spots(db, inscription_data.evento_id)
        if available_spots <= 0:
            return None
        
        # Crear la inscripción
        db_inscription = Inscription(
            evento_id=inscription_data.evento_id,
            usuario_id=user_id,
            fecha_inscripcion=date.today()
        )
        db.add(db_inscription)
        db.commit()
        db.refresh(db_inscription)
        return db_inscription
    
    @staticmethod
    def get_inscription_by_id(db: Session, inscription_id: int) -> Optional[Inscription]:
        """
        Obtiene una inscripción por su ID.
        """
        return db.query(Inscription).filter(Inscription.id == inscription_id).first()
    
    @staticmethod
    def get_user_active_inscriptions(db: Session, user_id: int) -> List[Inscription]:
        """
        Obtiene las inscripciones activas de un usuario.
        Cumple con el requisito: "Obtener las inscripciones activas de un usuario"
        """
        today = date.today()
        return db.query(Inscription).join(Event).filter(
            and_(
                Inscription.usuario_id == user_id,
                Event.fecha_fin >= today
            )
        ).all()
    
    @staticmethod
    def get_user_inscription_history(db: Session, user_id: int) -> List[Inscription]:
        """
        Obtiene el historial de inscripciones de un usuario.
        Cumple con el requisito: "Obtener el historial de inscripciones de un usuario"
        """
        return db.query(Inscription).filter(
            Inscription.usuario_id == user_id
        ).order_by(Inscription.fecha_inscripcion.desc()).all()
    
    @staticmethod
    def get_event_inscriptions(db: Session, event_id: int) -> List[Inscription]:
        """
        Obtiene todas las inscripciones de un evento específico.
        """
        return db.query(Inscription).filter(Inscription.evento_id == event_id).all()
    
    @staticmethod
    def cancel_inscription(db: Session, inscription_id: int, user_id: int) -> bool:
        """
        Cancela una inscripción (elimina).
        Verifica que la inscripción pertenezca al usuario.
        """
        db_inscription = db.query(Inscription).filter(
            and_(
                Inscription.id == inscription_id,
                Inscription.usuario_id == user_id
            )
        ).first()
        
        if not db_inscription:
            return False
        
        db.delete(db_inscription)
        db.commit()
        return True
    
    @staticmethod
    def delete_inscription(db: Session, inscription_id: int) -> bool:
        """
        Elimina una inscripción (para administradores).
        """
        db_inscription = db.query(Inscription).filter(Inscription.id == inscription_id).first()
        if not db_inscription:
            return False
        
        db.delete(db_inscription)
        db.commit()
        return True
    
    # Métodos para Dashboard
    @staticmethod
    def get_total_active_inscriptions_count(db: Session) -> int:
        """
        Número total de inscripciones activas.
        Para Dashboard: "Número total de inscripciones activas"
        """
        today = date.today()
        return db.query(Inscription).join(Event).filter(
            Event.fecha_fin >= today
        ).count()