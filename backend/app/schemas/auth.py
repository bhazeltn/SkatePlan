"""Auth-related pydantic schemas."""
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class CoachRegisterRequest(BaseModel):
    """Public self-service coach account creation."""

    first_name: str
    last_name: str
    email: EmailStr
    password: str
    club: str | None = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    role: str


class CurrentUser(BaseModel):
    user_id: int
    role: str
    email: str
