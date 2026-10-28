from pydantic import BaseModel, Field
from typing import Optional

class UserRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=150)
    password: str = Field(..., min_length=6, max_length=100)
    company_name: Optional[str] = "My Venture Portfolio"

class UserLoginRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=150)
    password: str = Field(..., min_length=4, max_length=100)

class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=150)

class AuthResponse(BaseModel):
    success: bool
    user_id: str
    email: str
    name: str
    company_id: str
    token: str
    message: Optional[str] = None

