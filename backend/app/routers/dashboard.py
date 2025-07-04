from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.models.event import Event
from app.models.inscription import Inscription
from app.auth import require_admin
from app.services import EventService, InscriptionService

router = APIRouter()

@router.get("/test")
def test_dashboard():
    return {"mensaje": "Dashboard funcionando"}

@router.get("/stats")
async def get_dashboard_stats(db: Session = Depends(get_db)):
    total_events = db.query(Event).count()
    active_inscriptions = db.query(Inscription).count()

    eventos = db.query(Event).all()
    total_ins = sum(len(e.inscripciones) for e in eventos)
    avg = total_ins / total_events if total_events else 0

    most_popular = max(eventos, key=lambda e: len(e.inscripciones), default=None)

    return {
        "total_events": total_events,
        "active_inscriptions": active_inscriptions,
        "average_rating": round(avg, 2),
        "popular_event": {
            "id": most_popular.id if most_popular else None,
            "title": most_popular.nombre if most_popular else "Sin datos",
            "total_inscripciones": len(most_popular.inscripciones) if most_popular else 0
        }
    }
