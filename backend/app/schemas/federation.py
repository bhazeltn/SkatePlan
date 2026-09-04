"""Federation levels response schemas."""
from typing import Optional

from pydantic import BaseModel


class FederationOut(BaseModel):
    id: int
    name: str
    code: str
    country: str


class LevelOut(BaseModel):
    level_name: str
    sort_order: Optional[int] = None
    is_adult: bool = False
    isu_anchor: Optional[str] = None


class StreamOut(BaseModel):
    stream_name: str
    stream_display: Optional[str] = None
    discipline: Optional[str] = None
    levels: list[LevelOut]


class FederationLevelsOut(BaseModel):
    federation_code: str
    federation_name: str
    streams: list[StreamOut]
