# app/routers/users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import User
from app.schemas import (
    UserResponse, UserUpdate, 
    ActiveInscriptionResponse, InscriptionHistoryResponse
)
from app.auth import require_auth, require_admin
from app.services.user_service import UserService

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(require_auth)):
    """Obtener el perfil del usuario actual"""
    return current_user

@router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Actualizar el perfil del usuario actual"""
    return UserService.update_user_profile(db, current_user, user_update)

@router.get("/me/inscriptions", response_model=List[ActiveInscriptionResponse])
async def get_user_inscriptions(
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Obtener las inscripciones activas del usuario actual"""
    return UserService.get_user_active_inscriptions(db, current_user.id)

@router.get("/me/inscriptions/history", response_model=List[InscriptionHistoryResponse])
async def get_user_inscriptions_history(
    current_user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Obtener el historial completo de inscripciones del usuario"""
    return UserService.get_user_inscriptions_history(db, current_user.id)

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Obtener usuario por ID (solo administradores)"""
    return UserService.get_user_by_id(db, user_id)

@router.get("/{user_id}/inscriptions", response_model=List[ActiveInscriptionResponse])
async def get_user_inscriptions_by_id(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Obtener inscripciones de un usuario específico (solo administradores)"""
    # Verificar que el usuario existe
    UserService.get_user_by_id(db, user_id)  # Esto lanza excepción si no existe
    
    return UserService.get_user_active_inscriptions(db, user_id)

@router.get("/", response_model=List[UserResponse])
async def get_all_users(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """Obtener lista de todos los usuarios (solo administradores)"""
    return UserService.get_all_users(db, skip, limit)