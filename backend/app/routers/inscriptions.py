from fastapi import APIRouter

router = APIRouter()

@router.get("/inscriptions/test")
def test_inscriptions():
    return {"mensaje": "Inscripciones funcionando"}
