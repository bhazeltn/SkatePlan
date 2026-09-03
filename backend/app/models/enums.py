"""Enum types shared across models."""
import enum


class SystemRole(str, enum.Enum):
    coach = "coach"
    athlete = "athlete"
    parent = "parent"
    admin = "admin"


class AccessState(str, enum.Enum):
    active = "active"
    revoked_by_adult = "revoked_by_adult"


class DisciplineType(str, enum.Enum):
    singles = "singles"


class RoleInUnit(str, enum.Enum):
    primary = "primary"
    secondary = "secondary"
    choreographer = "choreographer"
