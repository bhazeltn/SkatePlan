"""Development-standard, benchmark, assessment & gap-analysis schemas (Sprint 5).

Canonical pillars: 'technical','skating_skills','physical','mental'.
Numeric fields are declared as ``float`` so JSON responses emit numbers (not
strings), matching the deterministic gap-analysis test contract.
"""
import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict


class BenchmarkIn(BaseModel):
    title: str
    pillar: str
    evaluation_mode: str
    target_metric_code: Optional[str] = None
    target_value: Optional[float] = None
    rubric_criteria: Optional[str] = None


class BenchmarkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    pillar: str
    evaluation_mode: str
    target_metric_code: Optional[str] = None
    target_value: Optional[float] = None
    rubric_criteria: Optional[str] = None


class StandardCreate(BaseModel):
    name: str
    framework_type: Optional[str] = None
    description: Optional[str] = None
    benchmarks: list[BenchmarkIn] = []


class StandardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    framework_type: Optional[str] = None
    description: Optional[str] = None
    benchmarks: list[BenchmarkOut] = []


class TargetStandardIn(BaseModel):
    target_standard_id: uuid.UUID


class AssessmentIn(BaseModel):
    benchmark_id: uuid.UUID
    status: str = "not_started"
    score: Optional[float] = None
    notes: Optional[str] = None


class AssessmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    skater_id: int
    benchmark_id: uuid.UUID
    status: str
    score: Optional[float] = None
    assessment_notes: Optional[str] = None


class GapEntryOut(BaseModel):
    benchmark_id: str
    title: str
    evaluation_mode: str
    status: str
    measured: Optional[float] = None
    target: Optional[float] = None
    delta: Optional[float] = None


class GapReportOut(BaseModel):
    skater_id: int
    target_standard_id: str
    pillars: dict[str, list[GapEntryOut]]
