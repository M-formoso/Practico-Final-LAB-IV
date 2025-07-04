from datetime import date, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.utils.security import get_password_hash
from app.models import User, Category, Event, Inscription

# Crear sesión
db: Session = SessionLocal()

# Limpiar datos anteriores
db.query(Inscription).delete()
db.query(Event).delete()
db.query(Category).delete()
db.query(User).delete()

# Crear usuarios
user1 = User(
    nombre="Juan",
    email="juan@example.com",
    contraseña=get_password_hash("123")
)

user2 = User(
    nombre="Ana",
    email="ana@example.com",
    contraseña=get_password_hash("456")
)

# Crear categorías
category1 = Category(nombre="Tecnología")
category2 = Category(nombre="Salud")

# Crear eventos (ahora con cupos)
event1 = Event(
    nombre="Conferencia Python",
    fecha_inicio=date.today() + timedelta(days=5),
    fecha_fin=date.today() + timedelta(days=7),
    lugar="Aula Magna",
    categoria=category1,
    cupos=50
)

event2 = Event(
    nombre="Jornada de Salud",
    fecha_inicio=date.today() + timedelta(days=10),
    fecha_fin=date.today() + timedelta(days=12),
    lugar="Salón Comunitario",
    categoria=category2,
    cupos=100
)

# Crear inscripciones
insc1 = Inscription(usuario=user1, evento=event1)
insc2 = Inscription(usuario=user2, evento=event2)

# Guardar todo en la base
db.add_all([user1, user2, category1, category2, event1, event2, insc1, insc2])
db.commit()
db.close()

print("✨ ¡Base de datos poblada con éxito!")
