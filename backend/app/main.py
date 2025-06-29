from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.database import create_tables, engine
from app.models import Base
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Crear las tablas en la base de datos
Base.metadata.create_all(bind=engine)

# Crear la aplicación FastAPI
app = FastAPI(
    title=os.getenv("APP_NAME", "Sistema de Gestión de Eventos"),
    version=os.getenv("VERSION", "1.0.0"),
    description="API REST para gestión de eventos con autenticación JWT"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especifica los dominios permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Importar y registrar los routers
from app.routers import auth, users, events, categories, inscriptions, dashboard

app.include_router(
    auth.router,
    prefix="/auth",
    tags=["Autenticación"]
)

app.include_router(
    users.router,
    prefix="/users",
    tags=["Usuarios"]
)

app.include_router(
    events.router,
    prefix="/events",
    tags=["Eventos"]
)

app.include_router(
    categories.router,
    prefix="/categories",
    tags=["Categorías"]
)

app.include_router(
    inscriptions.router,
    prefix="/inscriptions",
    tags=["Inscripciones"]
)

app.include_router(
    dashboard.router,
    prefix="/dashboard",
    tags=["Dashboard"]
)

@app.get("/")
async def root():
    """Endpoint de bienvenida"""
    return {
        "message": "Bienvenido al Sistema de Gestión de Eventos",
        "version": os.getenv("VERSION", "1.0.0"),
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/health")
async def health_check():
    """Endpoint para verificar el estado de la API"""
    return {"status": "healthy", "message": "API funcionando correctamente"}

# Manejo de errores globales
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return HTTPException(
        status_code=404,
        detail="El recurso solicitado no fue encontrado"
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return HTTPException(
        status_code=500,
        detail="Error interno del servidor"
    )