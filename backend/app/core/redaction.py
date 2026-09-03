"""Deterministic redaction helpers for external portfolio sharing.

Pure Python string logic only — NO LLM calls anywhere.
"""

# Literal replacement used when masking any medical/injury free-text.
MASKED_MEDICAL_TEXT = "Active Load Restriction"


def redact_name(first_name: str | None, last_name: str | None) -> str:
    """Return "First Name, L." — first name in full, last name to initial only."""
    first = (first_name or "").strip()
    last = (last_name or "").strip()
    if last:
        return f"{first}, {last[0].upper()}."
    return first


def full_name(first_name: str | None, last_name: str | None) -> str:
    """Return the complete legal name "First Last"."""
    parts = [(first_name or "").strip(), (last_name or "").strip()]
    return " ".join(p for p in parts if p)


def mask_medical(_raw_text: str | None) -> str:
    """Mask any medical/injury free-text to the fixed literal restriction label."""
    return MASKED_MEDICAL_TEXT
