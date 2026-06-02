from fastapi import APIRouter

router = APIRouter()

@router.get("/demo-user")
async def get_demo_user():
    return {
        "user_id": "demo_user_2026",
        "name": "Lưu Thanh Lâm",
        "role": "Admin"
    }