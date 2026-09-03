"""Skater onboarding / orchestration schemas."""
from datetime import date
from typing import Optional

from pydantic import BaseModel, EmailStr

from app.models.enums import RoleInUnit


class OrchestrateSkaterRequest(BaseModel):
    # Skater user info. Provide either an existing skater_user_id OR new-user fields.
    skater_user_id: Optional[int] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None

    # Skater profile
    date_of_birth: date
    home_club: Optional[str] = None
    federation_registration_id: Optional[str] = None
    federation_id: Optional[int] = None
    current_level_id: Optional[int] = None

    # Training unit
    unit_name: str

    # Coach assignment
    coach_user_id: int
    role_in_unit: RoleInUnit = RoleInUnit.primary


class OrchestrateSkaterResponse(BaseModel):
    skater_id: int
    training_unit_id: int
    roster_entry_id: int
    assignment_id: int
