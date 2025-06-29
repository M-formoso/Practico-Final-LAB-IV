# app/services/user_service.py
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List
from datetime import date
from app.models import User, Inscription, Event, Category
from app.schemas import (
    UserUpdate, 
    ActiveInscriptionResponse, 
    InscriptionHistoryResponse
)
from app.utils.security import get_password_hash

class UserService:
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> User:
        """Obtener usuario por ID"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        return user
    
    @staticmethod
    def get_all_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
        """Obtener lista de todos los usuarios con paginación"""
        return db.query(User).offset(skip).limit(limit).all()
    
    @staticmethod
    def update_user_profile(db: Session, current_user: User, user_update: UserUpdate) -> User:
        """Actualizar el perfil del usuario"""
        
        # Verificar si el email ya existe (si se está cambiando)
        if user_update.email and user_update.email != current_user.email:
            existing_user = db.query(User).filter(User.email == user_update.email).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ya existe un usuario con este email"
                )
        
        # Actualizar campos
        if user_update.nombre:
            current_user.nombre = user_update.nombre
        if user_update.email:
            current_user.email = user_update.email
        if user_update.contraseña:
            current_user.contraseña = get_password_hash(user_update.contraseña)
        
        db.commit()
        db.refresh(current_user)
        
        return current_user
    
    @staticmethod
    def get_user_active_inscriptions(db: Session, user_id: int) -> List[ActiveInscriptionResponse]:
        """Obtener inscripciones activas de un usuario"""
        
        inscriptions = db.query(Inscription).join(Event).join(Category).filter(
            Inscription.usuario_id == user_id,
            Event.fecha_fin >= date.today()  # Solo eventos futuros o en curso
        ).all()
        
        result = []
        for inscription in inscriptions:
            result.append(ActiveInscriptionResponse(
                id=inscription.id,
                evento_id=inscription.evento_id,
                fecha_inscripcion=inscription.fecha_inscripcion,
                evento_nombre=inscription.evento.nombre,
                evento_fecha_inicio=inscription.evento.fecha_inicio,
                evento_fecha_fin=inscription.evento.fecha_fin,
                evento_lugar=inscription.evento.lugar,
                categoria_nombre=inscription.evento.categoria.nombre
            ))
        
        return result
    
    @staticmethod
    def get_user_inscriptions_history(db: Session, user_id: int) -> List[InscriptionHistoryResponse]:
        """Obtener el historial completo de inscripciones del usuario"""
        
        inscriptions = db.query(Inscription).join(Event).join(Category).filter(
            Inscription.usuario_id == user_id
        ).order_by(Inscription.fecha_inscripcion.desc()).all()
        
        result = []
        for inscription in inscriptions:
            # Determinar estado del evento
            estado = UserService._determine_event_status(inscription.evento)
            
            result.append(InscriptionHistoryResponse(
                id=inscription.id,
                evento_id=inscription.evento_id,
                fecha_inscripcion=inscription.fecha_inscripcion,
                evento_nombre=inscription.evento.nombre,
                evento_fecha_inicio=inscription.evento.fecha_inicio,
                evento_fecha_fin=inscription.evento.fecha_fin,
                evento_lugar=inscription.evento.lugar,
                categoria_nombre=inscription.evento.categoria.nombre,
                estado=estado
            ))
        
        return result
    
    @staticmethod
    def _determine_event_status(event: Event) -> str:
        """Determinar el estado de un evento basado en las fechas"""
        today = date.today()
        if event.fecha_fin < today:
            return "finalizado"
        elif event.fecha_inicio <= today <= event.fecha_fin:
            return "en_curso"
        else:
            return "activo"
    
    @staticmethod
    def user_exists(db: Session, user_id: int) -> bool:
        """Verificar si un usuario existe"""
        return db.query(User).filter(User.id == user_id).first() is not None
    
    @staticmethod
    def get_user_inscription_count(db: Session, user_id: int) -> int:
        """Obtener el número total de inscripciones de un usuario"""
        return db.query(Inscription).filter(Inscription.usuario_id == user_id).count()
    
    @staticmethod
    def get_user_active_inscription_count(db: Session, user_id: int) -> int:
        """Obtener el número de inscripciones activas de un usuario"""
        return db.query(Inscription).join(Event).filter(
            Inscription.usuario_id == user_id,
            Event.fecha_fin >= date.today()
        ).count()
