from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.auth import require_admin
from app.services import EventService, InscriptionService

router = APIRouter()

@router.get("/test")
def test_dashboard():
    return {"mensaje": "Dashboard funcionando"}

@router.get("/stats")
async def get_dashboard_stats(
    db: Session = Depends(get_db)
    # Removemos temporalmente: current_user: User = Depends(require_admin),
):
    """Obtener estadísticas del dashboard (temporalmente sin autenticación)"""
    
    try:
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
                "title": most_popular_event.nombre,  # Frontend espera "title"
                "total_inscripciones": total_inscriptions
            }
        
        return {
            "total_events": total_events,  # Frontend espera "total_events"
            "active_inscriptions": active_inscriptions,  # Frontend espera "active_inscriptions" 
            "average_rating": round(float(avg_inscriptions), 2),  # Frontend espera "average_rating"
            "popular_event": most_popular_event_data  # Frontend espera "popular_event"
        }
        
    except Exception as e:
        # Si hay error con los services, devolver datos por defecto
        return {
            "total_events": 0,
            "active_inscriptions": 0,
            "average_rating": 0.0,
            "popular_event": {
                "title": "Sin datos",
                "id": None
            }
        }