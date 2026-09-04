"""Scale of Values (SOV) reference read schema for the program builder."""
from decimal import Decimal

from pydantic import BaseModel


class SovElementOut(BaseModel):
    """A single Singles SOV element served to the program builder."""

    element_code: str
    element_name: str
    base_value: Decimal
