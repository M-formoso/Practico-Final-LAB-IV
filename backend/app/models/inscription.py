from sqlalchemy import Column, Integer, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import date

class Inscription(Base):
    __tablename__ = "inscripciones"
    
    id = Column(Integer, primary_key=True, index=True)
    evento_id = Column(Integer, ForeignKey("eventos.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    fecha_inscripcion = Column(Date, default=date.today, nullable=False)
    
    # Relaciones
    evento = relationship("Event", back_populates="inscripciones")
    usuario = relationship("User", back_populates="inscripciones")