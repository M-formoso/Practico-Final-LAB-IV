# Dockerfile específico para el backend existente
FROM python:3.11-slim

# Establecer directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema necesarias
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements.txt
COPY requirements.txt .

# Instalar dependencias de Python
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copiar todo el código de la aplicación
COPY . .

# Crear directorio para logs si no existe
RUN mkdir -p /app/logs

# Dar permisos de ejecución a los scripts
RUN chmod +x run.py seed.py

# Exponer el puerto 8000
EXPOSE 8000

# Variables de entorno por defecto
ENV PYTHONPATH=/app
ENV DATABASE_URL=sqlite:///./eventos.db

# Comando de inicio
# Primero ejecuta seed.py para inicializar datos, luego inicia el servidor
CMD ["sh", "-c", "python seed.py && python run.py"]