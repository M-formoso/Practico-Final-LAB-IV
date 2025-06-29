from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate
from typing import Optional, List

class CategoryService:
    """
    Service para gestionar categorías de eventos.
    Se conecta con:
    - Models: Category
    - Schemas: CategoryCreate, CategoryUpdate
    """
    
    @staticmethod
    def create_category(db: Session, category_data: CategoryCreate) -> Category:
        """
        Crea una nueva categoría.
        """
        db_category = Category(
            nombre=category_data.nombre,
            descripcion=category_data.descripcion
        )
        db.add(db_category)
        db.commit()
        db.refresh(db_category)
        return db_category
    
    @staticmethod
    def get_category_by_id(db: Session, category_id: int) -> Optional[Category]:
        """
        Obtiene una categoría por su ID.
        """
        return db.query(Category).filter(Category.id == category_id).first()
    
    @staticmethod
    def get_all_categories(db: Session, skip: int = 0, limit: int = 100) -> List[Category]:
        """
        Obtiene todas las categorías con paginación.
        """
        return db.query(Category).offset(skip).limit(limit).all()
    
    @staticmethod
    def search_categories(db: Session, search_term: str) -> List[Category]:
        """
        Busca categorías por nombre o descripción.
        """
        return db.query(Category).filter(
            or_(
                Category.nombre.ilike(f"%{search_term}%"),
                Category.descripcion.ilike(f"%{search_term}%")
            )
        ).all()
    
    @staticmethod
    def update_category(db: Session, category_id: int, category_data: CategoryUpdate) -> Optional[Category]:
        """
        Actualiza una categoría existente.
        """
        db_category = db.query(Category).filter(Category.id == category_id).first()
        if not db_category:
            return None
        
        update_data = category_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_category, field, value)
        
        db.commit()
        db.refresh(db_category)
        return db_category
    
    @staticmethod
    def delete_category(db: Session, category_id: int) -> bool:
        """
        Elimina una categoría.
        Nota: Verificar que no tenga eventos asociados antes de eliminar.
        """
        db_category = db.query(Category).filter(Category.id == category_id).first()
        if not db_category:
            return False
        
        db.delete(db_category)
        db.commit()
        return True