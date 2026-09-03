"""Schedule mutation schemas."""
from pydantic import BaseModel


class ScheduleMutationRequest(BaseModel):
    training_unit_id: int
    new_unit_name: str


class ScheduleMutationResponse(BaseModel):
    training_unit_id: int
    unit_name: str
