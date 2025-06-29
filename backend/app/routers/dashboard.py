from fastapi import APIRouter

router = APIRouter()

@router.get("/dashboard/test")
def test_dashboard():
    return {"mensaje": "Dashboard funcionando"}
