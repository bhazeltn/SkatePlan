# Phase 0 Audit Report: SkatePlan Backend Assessment

**Date:** December 16, 2025
**Auditor:** Gemini (AI Assistant)
**Project:** SkatePlan (CoachOS v2) - Figure Skating Coaching Platform
**Scope:** Backend security, data models, test coverage, code quality

---

## Executive Summary

The SkatePlan backend is approximately 60-70% complete with a solid Django/DRF foundation. However, **critical security vulnerabilities** need immediate attention, test coverage is **0%**, and the data models require significant expansion to align with the federation-agnostic specification.

### Critical Issues (Must Fix Immediately)
1. **CORS_ALLOW_ALL_ORIGINS = True** - Major security vulnerability
2. **No rate limiting** - API vulnerable to abuse
3. **Sensitive fields not encrypted** - Despite `django-cryptography` being installed
4. **Zero test coverage** - `tests.py` is empty

### Priority Actions for Phase 0
1. Security hardening (CORS, rate limiting, encryption)
2. Add missing models (Federation expansion, Organization, PlannedSession)
3. Achieve 80%+ test coverage
4. Add API documentation

---

## 1. Models Analysis

### 1.1 Existing Models (29 Total)

| File | Models | Status |
|------|--------|--------|
| `users.py` | User, Invitation | Good - Custom user model with roles |
| `core.py` | Federation, SkatingElement | Needs expansion |
| `skaters.py` | Skater, AthleteProfile, SinglesEntity, SoloDanceEntity, Team, SynchroTeam, PlanningEntityAccess | Good foundation |
| `planning.py` | AthleteSeason, YearlyPlan, Macrocycle, WeeklyPlan, Goal, GapAnalysis | Needs PlannedSession |
| `logs.py` | SessionLog, InjuryLog, MeetingLog | Good, needs encryption |
| `competitions.py` | Competition, CompetitionResult, SkaterTest, Program, ProgramAsset | Good |
| `logistics.py` | TeamTrip, ItineraryItem, HousingAssignment | Extra (not in spec but useful) |

### 1.2 Missing Models (Critical)

| Model | Priority | Description |
|-------|----------|-------------|
| **FederationLevel** | HIGH | Optional structured data for smart features (app works without this) |
| **FederationLevelContribution** | MEDIUM | Community-submitted federation data |
| **Organization** | HIGH | Club/Federation/Academy entity |
| **OrganizationMembership** | HIGH | User membership in organizations |
| **OrganizationInvite** | MEDIUM | Invitation workflow for orgs |
| **PlannedSession** | CRITICAL | Individual sessions within WeeklyPlan |
| **SessionTemplate** | MEDIUM | Reusable weekly templates |
| **Comment** | MEDIUM | Encrypted comments (Safe Sport) |
| **Announcement** | LOW | Organization announcements |

### 1.3 Models Requiring Modification

#### Federation Model (core.py)
**Current:**
```python
class Federation(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, blank=True, null=True)
    iso_code = models.CharField(max_length=2, blank=True, null=True)
```

**Required additions:**
- `support_tier` (BASIC | ENHANCED | PARTNER) - default='BASIC' (Schema only, no logic)
- `website`, `logo` (optional)
- `is_active` (BooleanField) - for data management

#### WeeklyPlan Model (planning.py)
**Current:**
```python
class WeeklyPlan(models.Model):
    # ...
    session_breakdown = models.JSONField(default=dict, blank=True)
```

**Required additions:**
- `notes` (TextField)
- `max_session_hours` (FloatField)
- `max_session_count` (IntegerField)
- **Note:** `session_breakdown` JSON might be deprecated in favor of `PlannedSession` relation, or kept for summary.

#### SinglesEntity/SoloDanceEntity (skaters.py)
**Missing:**
- `current_level_structured` (FK to FederationLevel, nullable) - **New optional field**
- Note: `current_level` (CharField) already exists and remains the primary source of truth for basic usage.

#### SessionLog (logs.py)
**Missing:**
- `voice_transcript` field for AI-extracted data
- **CRITICAL:** `coach_notes` and `skater_notes` should use `encrypt()` wrapper

#### AthleteProfile (skaters.py)
**CRITICAL:** All fields should be encrypted using `django-cryptography`:
- `emergency_contact_name`
- `emergency_contact_phone`
- `relevant_medical_notes`
- `guardian_email`
- `skater_email`
- `guardian_name`

---

## 2. Federation Approach Assessment

### Revised Understanding: True Federation-Agnosticism

The system is designed to function primarily on **free-text input**. Structured data is an optional enhancement layer.

| Requirement | Current Status | Correct Implementation Plan |
|-------------|----------------|-----------------------------|
| Works with free-text level entry | **Yes** | Keep `current_level` as the primary field. |
| Support tiers | **NO** | Add `support_tier` field for future use (Schema only). |
| FederationLevel structured data | **NO** | Add as nullable FK (`current_level_structured`). |
| "Smart" features | **NO** | Enable only if `current_level_structured` is present. |

### Required Changes

1. **Expand Federation model** with `support_tier` (for future-proofing), website, logo.
2. **Create FederationLevel model** for optional structured data.
3. **Add `current_level_structured` FK** to planning entities (SinglesEntity, etc.).
4. **Create FederationLevelContribution model** for community submissions.
5. **Seed basic data** (e.g., Skate Canada) to demonstrate "smart features," but full coverage is not required for MVP.

---

## 3. Security Assessment

### 3.1 Critical Vulnerabilities

#### CORS Misconfiguration (settings.py)
```python
CORS_ALLOW_ALL_ORIGINS = True  # CRITICAL VULNERABILITY
```
**Risk:** Any website can make API requests with user credentials (if cookies used) or access public endpoints without restriction.
**Fix:** Use explicit allowlist.

#### No Rate Limiting
**Risk:** API vulnerable to brute force, scraping, and DoS.
**Fix:** Install `django-ratelimit` and configure on views.

#### Sensitive Fields Not Encrypted
**Risk:** Database breach exposes PII/PHI.
**Status:** `django-cryptography` is installed but **NOT USED**.

**Files needing encryption:**

| File | Field | Sensitivity |
|------|-------|-------------|
| logs.py | `coach_notes` | High |
| logs.py | `skater_notes` | High |
| skaters.py | `relevant_medical_notes` | Critical (PHI) |
| skaters.py | `emergency_contact_name` | High |
| skaters.py | `emergency_contact_phone` | High |

### 3.2 Security Measures Present

| Measure | Status | Notes |
|---------|--------|-------|
| Custom User Model | Yes | Email-based auth |
| Token Authentication | Yes | DRF TokenAuth |
| Password Validators | Yes | All 4 Django defaults |
| CSRF Protection | Yes | Standard middleware |
| Clickjacking Protection | Yes | XFrameOptionsMiddleware |
| CORS Headers | Misconfigured | ALLOW_ALL_ORIGINS = True |
| Rate Limiting | **NO** | Not implemented |
| Field Encryption | **NO** | Installed but unused |
| API Documentation | **NO** | Not installed |

---

## 4. Testing Assessment

### Current State: 0% Coverage

```python
# backend/api/tests.py (entire file)
from django.test import TestCase

# Create your tests here.
```

### Test Infrastructure Missing

| Component | Status |
|-----------|--------|
| pytest | Not in requirements.txt |
| pytest-django | Not installed |
| coverage.py | Not installed |
| Test fixtures | None |

### Required Test Structure
We need to set up a standard `pytest` structure with `tests/` directory, `conftest.py`, and separate test files for models, views, and services.

---

## 5. Code Quality Assessment

### 5.1 Style & Formatting

| Aspect | Status | Notes |
|--------|--------|-------|
| Black formatting | Unknown | No pyproject.toml config seen |
| Flake8 linting | Unknown | No .flake8 file seen |
| Type hints | **NO** | Minimal to no type hints in models/methods |
| Docstrings | Partial | Some models have docstrings, many don't |
| Admin | **Empty** | `admin.py` has no registrations |

### 5.2 Architecture Issues

#### Admin Not Configured
`admin.py` is empty. This means no back-office management for any models.

#### No API Documentation
`drf-spectacular` is not installed. No auto-generated API docs.

---

## 6. Phase 0 Priority Tasks

### Critical (Week 1 - Days 1-3)

| Task | File(s) | Complexity | Dependency |
|------|---------|------------|------------|
| Fix CORS configuration | settings.py | Low | None |
| Add rate limiting | views/*.py, requirements.txt | Medium | None |
| Encrypt sensitive fields | models/*.py | Medium | Migrations |
| Set up pytest infrastructure | tests/, requirements.txt | Medium | None |
| Add missing dependencies | requirements.txt | Low | None |

### High (Week 1 - Days 4-5)

| Task | File(s) | Complexity | Dependency |
|------|---------|------------|------------|
| Expand Federation model | models/core.py | Medium | Migrations |
| Create FederationLevel models | models/core.py | Medium | Federation |
| Configure Django Admin | admin.py | Medium | Models |
| Add API documentation | settings.py, urls.py | Medium | drf-spectacular |

### Medium (Week 1 - Days 6-7)

| Task | File(s) | Complexity | Dependency |
|------|---------|------------|------------|
| Create PlannedSession model | models/planning.py | Medium | WeeklyPlan |
| Create Organization models | models/users.py (new) | Medium | User |
| Seed sample federation data | management/commands/ | Medium | FederationLevel |
| Write core model tests | tests/test_models/ | High | pytest setup |

---

*Report generated by Phase 0 Backend Audit - Gemini*
