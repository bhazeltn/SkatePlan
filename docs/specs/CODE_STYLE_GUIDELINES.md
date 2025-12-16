# CoachOS v2 - Code Style & Development Guidelines

## Overview

This document defines coding standards, best practices, and development workflows for CoachOS v2.

---

## Table of Contents

1. [Python/Django Backend](#pythondjango-backend)
2. [JavaScript/TypeScript Frontend](#javascripttypescript-frontend)
3. [Git Workflow](#git-workflow)
4. [Testing Standards](#testing-standards)
5. [Documentation](#documentation)
6. [Security Guidelines](#security-guidelines)
7. [Code Review Checklist](#code-review-checklist)

---

## Python/Django Backend

### Code Formatter: Black

**Configuration (pyproject.toml):**
```toml
[tool.black]
line-length = 100
target-version = ['py311']
include = '\.pyi?$'
extend-exclude = '''
/(
  # directories
  \.eggs
  | \.git
  | \.hg
  | \.mypy_cache
  | \.tox
  | \.venv
  | build
  | dist
  | migrations
)/
'''
```

**Usage:**
```bash
# Format all Python files
black .

# Check without modifying
black --check .

# Format specific file
black backend/api/models.py
```

### Linter: Flake8

**Configuration (.flake8):**
```ini
[flake8]
max-line-length = 100
extend-ignore = E203, W503
exclude =
    .git,
    __pycache__,
    .venv,
    venv,
    */migrations/*,
    */settings/*,
    build,
    dist
per-file-ignores =
    __init__.py:F401
```

**Usage:**
```bash
# Lint all Python files
flake8 .

# Lint specific file
flake8 backend/api/models.py
```

### Import Sorting: isort

**Configuration (pyproject.toml):**
```toml
[tool.isort]
profile = "black"
line_length = 100
skip_gitignore = true
known_django = "django"
known_drf = "rest_framework"
sections = ["FUTURE", "STDLIB", "DJANGO", "DRF", "THIRDPARTY", "FIRSTPARTY", "LOCALFOLDER"]
```

**Import Order:**
```python
# Future imports
from __future__ import annotations

# Standard library
import json
import os
from datetime import datetime
from typing import Optional

# Django
from django.conf import settings
from django.db import models
from django.contrib.auth.models import AbstractUser

# Django REST Framework
from rest_framework import serializers
from rest_framework.decorators import api_view

# Third-party
import requests
from celery import shared_task

# Local imports
from api.models import Skater, Federation
from api.utils import calculate_score
```

### Type Hints

**Use type hints for all function signatures:**

```python
from typing import Optional, List, Dict, Any
from django.db.models import QuerySet

# Good
def get_active_skaters(federation_code: str) -> QuerySet[Skater]:
    """Return all active skaters for a given federation."""
    return Skater.objects.filter(
        federation__code=federation_code,
        is_active=True
    )

def calculate_weekly_load(
    sessions: List[Dict[str, Any]], 
    athlete_id: int
) -> Dict[str, float]:
    """Calculate training load metrics for a week of sessions."""
    total_hours = sum(s.get('duration', 0) for s in sessions) / 60
    return {
        'total_hours': total_hours,
        'session_count': len(sessions),
        'avg_intensity': calculate_avg_intensity(sessions)
    }

# Bad - no type hints
def get_active_skaters(federation_code):
    return Skater.objects.filter(
        federation__code=federation_code,
        is_active=True
    )
```

### Docstrings

**Use Google-style docstrings:**

```python
def create_weekly_plan(
    athlete_season: AthleteSeason,
    week_start: date,
    theme: Optional[str] = None
) -> WeeklyPlan:
    """
    Create a new weekly training plan for an athlete.
    
    Args:
        athlete_season: The athlete season to create the plan for
        week_start: Monday date for the start of the week
        theme: Optional theme/focus for the week
        
    Returns:
        WeeklyPlan: The created weekly plan instance
        
    Raises:
        ValidationError: If week_start is not a Monday
        PermissionError: If user doesn't have permission to create plan
        
    Example:
        >>> from datetime import date
        >>> season = AthleteSeason.objects.get(id=1)
        >>> plan = create_weekly_plan(
        ...     athlete_season=season,
        ...     week_start=date(2024, 12, 16),  # Monday
        ...     theme="Competition preparation"
        ... )
        >>> print(plan.week_start)
        2024-12-16
    """
    if week_start.weekday() != 0:
        raise ValidationError("week_start must be a Monday")
    
    return WeeklyPlan.objects.create(
        athlete_season=athlete_season,
        week_start=week_start,
        theme=theme or ""
    )
```

### Django Models

**Model guidelines:**

```python
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django_cryptography.fields import encrypt

class Federation(models.Model):
    """
    Represents a skating federation (national or regional).
    
    Federations can be at different support tiers:
    - BASIC: Just name and code
    - ENHANCED: Full level data available
    - PARTNER: Custom integration
    """
    
    class SupportTier(models.TextChoices):
        BASIC = 'BASIC', 'Basic - Name only'
        ENHANCED = 'ENHANCED', 'Enhanced - Full level data'
        PARTNER = 'PARTNER', 'Partner - Custom integration'
    
    # Primary fields
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255, help_text="Official federation name")
    code = models.CharField(
        max_length=10, 
        unique=True,
        help_text="ISO 3-letter code or custom abbreviation"
    )
    
    # Optional metadata
    country_code = models.CharField(max_length=2, blank=True)
    website = models.URLField(blank=True, null=True)
    logo = models.ImageField(upload_to='federation_logos/', blank=True, null=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    support_tier = models.CharField(
        max_length=20,
        choices=SupportTier.choices,
        default=SupportTier.BASIC
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        verbose_name = 'Federation'
        verbose_name_plural = 'Federations'
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['is_active', 'support_tier']),
        ]
    
    def __str__(self) -> str:
        return f"{self.name} ({self.code})"
    
    def has_level_data(self) -> bool:
        """Check if this federation has structured level data."""
        return self.levels.exists()


class SessionLog(models.Model):
    """Training session log with encrypted private notes."""
    
    # Public fields
    session_date = models.DateField()
    session_type = models.CharField(max_length=50)
    duration = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(300)],
        help_text="Duration in minutes"
    )
    
    # Encrypted private fields
    coach_notes = encrypt(models.TextField(blank=True))
    skater_notes = encrypt(models.TextField(blank=True))
    
    # JSON fields for flexible data
    program_runs = models.JSONField(default=list, blank=True)
    element_attempts = models.JSONField(default=list, blank=True)
```

**Key principles:**
- ✅ Use `TextChoices` for choice fields
- ✅ Add `help_text` to fields
- ✅ Always include docstrings
- ✅ Use appropriate validators
- ✅ Add database indexes for frequently queried fields
- ✅ Encrypt sensitive fields
- ✅ Use JSONField for flexible/evolving data structures

### Django Views/Viewsets

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator

from api.models import Federation, FederationLevel
from api.serializers import FederationSerializer, FederationLevelSerializer
from api.permissions import IsCoachOrReadOnly


@method_decorator(ratelimit(key='user', rate='100/h'), name='dispatch')
class FederationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for federation data.
    
    Provides read-only access to federation information and levels.
    Rate limited to 100 requests per hour per user.
    """
    
    queryset = Federation.objects.filter(is_active=True)
    serializer_class = FederationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Filter queryset based on query parameters.
        
        Query params:
            tier: Filter by support tier (BASIC, ENHANCED, PARTNER)
            has_levels: Filter federations with/without level data (true/false)
        """
        queryset = super().get_queryset()
        
        # Filter by tier
        tier = self.request.query_params.get('tier')
        if tier:
            queryset = queryset.filter(support_tier=tier)
        
        # Filter by has_levels
        has_levels = self.request.query_params.get('has_levels')
        if has_levels == 'true':
            queryset = queryset.filter(levels__isnull=False).distinct()
        elif has_levels == 'false':
            queryset = queryset.filter(levels__isnull=True)
        
        return queryset
    
    @action(detail=True, methods=['get'])
    def levels(self, request, pk=None):
        """
        Get all levels for a specific federation.
        
        Returns levels ordered by sort_order.
        """
        federation = self.get_object()
        levels = federation.levels.all().order_by('sort_order')
        serializer = FederationLevelSerializer(levels, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Search federations by name (case-insensitive).
        
        Query params:
            q: Search query string
        """
        query = request.query_params.get('q', '')
        if not query:
            return Response(
                {'error': 'Query parameter "q" is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        federations = self.queryset.filter(name__icontains=query)
        serializer = self.get_serializer(federations, many=True)
        return Response(serializer.data)
```

### Error Handling

```python
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.core.exceptions import ObjectDoesNotExist
import logging

logger = logging.getLogger(__name__)


def create_planning_entity(skater_id: int, federation_code: str, user) -> SinglesEntity:
    """
    Create a singles planning entity for a skater.
    
    Raises appropriate exceptions for different error conditions.
    """
    # Validate user has permission
    if not user.has_perm('api.add_singlesentity'):
        logger.warning(
            f"User {user.id} attempted to create planning entity without permission"
        )
        raise PermissionDenied("You don't have permission to create planning entities")
    
    # Get related objects with proper error handling
    try:
        skater = Skater.objects.get(id=skater_id)
    except ObjectDoesNotExist:
        logger.error(f"Skater {skater_id} not found")
        raise ValidationError(f"Skater with id {skater_id} does not exist")
    
    try:
        federation = Federation.objects.get(code=federation_code, is_active=True)
    except ObjectDoesNotExist:
        logger.error(f"Federation {federation_code} not found or inactive")
        raise ValidationError(f"Federation '{federation_code}' not found")
    
    # Create the entity
    try:
        entity = SinglesEntity.objects.create(
            skater=skater,
            federation=federation,
            current_level=""  # Will be set by user
        )
        logger.info(f"Created SinglesEntity {entity.id} for skater {skater_id}")
        return entity
        
    except Exception as e:
        logger.exception(f"Unexpected error creating planning entity: {e}")
        raise ValidationError("An error occurred creating the planning entity")
```

---

## JavaScript/TypeScript Frontend

### Code Formatter: Prettier

**Configuration (.prettierrc):**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### Linter: ESLint

**Configuration (.eslintrc.json):**
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:svelte/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "extraFileExtensions": [".svelte"]
  },
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

### TypeScript Guidelines

```typescript
// Use explicit types for function parameters and returns
export function calculateWeeklyLoad(
  sessions: SessionLog[],
  athleteId: number
): WeeklyLoadMetrics {
  const totalMinutes = sessions.reduce((sum, session) => sum + session.duration, 0);
  
  return {
    totalHours: totalMinutes / 60,
    sessionCount: sessions.length,
    averageIntensity: calculateAverageIntensity(sessions),
  };
}

// Use interfaces for object shapes
interface SessionLog {
  id: number;
  sessionDate: string;
  duration: number;
  energyStamina: number;
  sessionRating: number;
}

interface WeeklyLoadMetrics {
  totalHours: number;
  sessionCount: number;
  averageIntensity: number;
}

// Use enums or const objects for constants
export const SessionType = {
  ON_ICE: 'on_ice',
  OFF_ICE: 'off_ice',
  CONDITIONING: 'conditioning',
  REST: 'rest',
} as const;

export type SessionTypeValue = typeof SessionType[keyof typeof SessionType];
```

### Svelte Component Guidelines

```svelte
<script lang="ts">
  // Imports first
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import type { Federation, FederationLevel } from '$lib/types';
  import { api } from '$lib/api';
  
  // Props
  export let skaterId: number;
  export let onSave: (entityId: number) => void;
  
  // State
  let federations: Federation[] = [];
  let selectedFederation: Federation | null = null;
  let availableLevels: FederationLevel[] = [];
  let levelInput = '';
  let isLoading = false;
  let errorMessage = '';
  
  // Reactive statements
  $: hasLevelData = availableLevels.length > 0;
  $: canSubmit = selectedFederation && levelInput.trim() !== '';
  
  // Functions
  async function loadFederations() {
    isLoading = true;
    try {
      federations = await api.federations.list();
    } catch (error) {
      errorMessage = 'Failed to load federations';
      console.error(error);
    } finally {
      isLoading = false;
    }
  }
  
  async function handleFederationChange() {
    if (!selectedFederation) return;
    
    try {
      availableLevels = await api.federations.getLevels(selectedFederation.code);
    } catch (error) {
      console.error('Failed to load levels:', error);
      availableLevels = [];
    }
  }
  
  async function handleSubmit() {
    if (!canSubmit) return;
    
    try {
      const entity = await api.planningEntities.create({
        skaterId,
        federationCode: selectedFederation!.code,
        currentLevel: levelInput,
      });
      onSave(entity.id);
    } catch (error) {
      errorMessage = 'Failed to save';
      console.error(error);
    }
  }
  
  // Lifecycle
  onMount(() => {
    loadFederations();
  });
</script>

<!-- Template -->
<div class="form-container">
  <h2>Add Planning Entity</h2>
  
  {#if errorMessage}
    <div class="alert alert-error">
      {errorMessage}
    </div>
  {/if}
  
  <form on:submit|preventDefault={handleSubmit}>
    <div class="form-group">
      <label for="federation">Federation</label>
      <select
        id="federation"
        bind:value={selectedFederation}
        on:change={handleFederationChange}
        disabled={isLoading}
      >
        <option value={null}>Select federation...</option>
        {#each federations as federation}
          <option value={federation}>
            {federation.name}
            {#if federation.hasLevelData}✓{/if}
          </option>
        {/each}
      </select>
    </div>
    
    <div class="form-group">
      <label for="level">Current Level</label>
      
      {#if hasLevelData}
        <select id="level" bind:value={levelInput}>
          <option value="">Select level...</option>
          {#each availableLevels as level}
            <option value={level.levelCode}>
              {level.displayName}
            </option>
          {/each}
        </select>
        <p class="help-text">Enhanced features available</p>
      {:else}
        <input
          id="level"
          type="text"
          bind:value={levelInput}
          placeholder="Enter level (e.g., Intermediate)"
        />
        <p class="help-text">
          No structured data for this federation yet.
          <a href="/contribute">Contribute data</a>
        </p>
      {/if}
    </div>
    
    <button type="submit" disabled={!canSubmit || isLoading}>
      {isLoading ? 'Saving...' : 'Create'}
    </button>
  </form>
</div>

<!-- Styles (scoped to component) -->
<style>
  .form-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }
  
  select,
  input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  
  .help-text {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: #666;
  }
  
  .alert {
    padding: 1rem;
    margin-bottom: 1rem;
    border-radius: 4px;
  }
  
  .alert-error {
    background-color: #fee;
    color: #c00;
  }
  
  button {
    padding: 0.75rem 1.5rem;
    background-color: #0066cc;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
```

---

## Git Workflow

### Branch Naming

```bash
# Feature branches
feature/add-federation-models
feature/pdf-import
feature/voice-logging

# Bug fixes
bugfix/session-log-validation
bugfix/federation-query-performance

# Hotfixes (production issues)
hotfix/security-patch
hotfix/login-error

# Phase-specific
feature/phase0-security-audit
feature/phase0-tests
feature/phase1-frontend-setup
```

### Commit Messages

**Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Maintenance (dependencies, config)

**Examples:**

```bash
# Good
feat(federation): add Federation and FederationLevel models

Added models to support federation-agnostic approach:
- Federation model with support tiers
- FederationLevel model for structured data
- FederationLevelContribution for community submissions

Closes #42

# Good
fix(session-log): validate session duration range

Added validators to ensure duration is between 1 and 300 minutes.
Prevents invalid data entry.

# Good
test(api): add tests for Federation API endpoints

Added comprehensive test coverage for:
- Federation list/retrieve
- Level lookup
- Search functionality

Coverage increased to 85%

# Bad
git commit -m "changes"
git commit -m "fix stuff"
git commit -m "wip"
```

### Pull Request Template

**Create `.github/pull_request_template.md`:**

```markdown
## Description
<!-- What does this PR do? -->

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Refactoring
- [ ] Documentation
- [ ] Tests

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-reviewed the code
- [ ] Commented complex logic
- [ ] Updated documentation
- [ ] Added/updated tests
- [ ] All tests pass locally
- [ ] No new warnings
- [ ] Ran linters (black, flake8, isort)

## Testing
<!-- How was this tested? -->

## Screenshots (if applicable)
<!-- Add screenshots for UI changes -->

## Related Issues
<!-- Closes #123 -->
```

---

## Testing Standards

### Backend Testing (pytest)

**Test structure:**
```
backend/
└── api/
    └── tests/
        ├── __init__.py
        ├── conftest.py              # Shared fixtures
        ├── test_models.py           # Model tests
        ├── test_api_endpoints.py    # API tests
        ├── test_permissions.py      # Permission tests
        ├── test_services.py         # Business logic tests
        └── fixtures/
            └── sample_data.json
```

**Example test:**

```python
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from api.models import Federation, FederationLevel

User = get_user_model()


@pytest.fixture
def api_client():
    """Authenticated API client."""
    return APIClient()


@pytest.fixture
def coach_user(db):
    """Create a coach user."""
    return User.objects.create_user(
        email='coach@test.com',
        password='testpass123',
        role=User.Role.COACH
    )


@pytest.fixture
def federation(db):
    """Create a test federation."""
    return Federation.objects.create(
        name='Test Skating Federation',
        code='TSF',
        support_tier='ENHANCED'
    )


@pytest.fixture
def federation_level(db, federation):
    """Create a test federation level."""
    return FederationLevel.objects.create(
        federation=federation,
        level_code='INTERMEDIATE',
        display_name='Intermediate',
        sort_order=5,
        capabilities={
            'can_do_doubles': True,
            'can_do_triples': False,
            'ui_detail_level': 'intermediate'
        }
    )


class TestFederationAPI:
    """Tests for Federation API endpoints."""
    
    def test_list_federations(self, api_client, coach_user, federation):
        """Coach can list active federations."""
        api_client.force_authenticate(user=coach_user)
        response = api_client.get('/api/federations/')
        
        assert response.status_code == 200
        assert len(response.data) == 1
        assert response.data[0]['code'] == 'TSF'
    
    def test_get_federation_levels(
        self, 
        api_client, 
        coach_user, 
        federation, 
        federation_level
    ):
        """Can retrieve levels for a federation."""
        api_client.force_authenticate(user=coach_user)
        response = api_client.get(f'/api/federations/{federation.id}/levels/')
        
        assert response.status_code == 200
        assert len(response.data) == 1
        assert response.data[0]['level_code'] == 'INTERMEDIATE'
    
    def test_unauthenticated_access_denied(self, api_client, federation):
        """Unauthenticated users cannot access API."""
        response = api_client.get('/api/federations/')
        assert response.status_code == 401


class TestFederationModel:
    """Tests for Federation model."""
    
    def test_has_level_data_true(self, federation, federation_level):
        """has_level_data returns True when levels exist."""
        assert federation.has_level_data() is True
    
    def test_has_level_data_false(self, federation):
        """has_level_data returns False when no levels."""
        assert federation.has_level_data() is False
    
    def test_str_representation(self, federation):
        """String representation includes name and code."""
        assert str(federation) == "Test Skating Federation (TSF)"
```

**Run tests:**
```bash
# All tests
pytest

# Specific file
pytest backend/api/tests/test_models.py

# With coverage
pytest --cov=api --cov-report=html

# Verbose
pytest -v

# Stop on first failure
pytest -x
```

### Frontend Testing (Vitest + Playwright)

**Unit tests (Vitest):**
```typescript
// src/lib/utils.test.ts
import { describe, it, expect } from 'vitest';
import { calculateWeeklyLoad } from './utils';

describe('calculateWeeklyLoad', () => {
  it('calculates total hours correctly', () => {
    const sessions = [
      { duration: 60, energyStamina: 4 },
      { duration: 90, energyStamina: 3 },
      { duration: 60, energyStamina: 5 },
    ];
    
    const result = calculateWeeklyLoad(sessions, 1);
    
    expect(result.totalHours).toBe(3.5);
    expect(result.sessionCount).toBe(3);
  });
  
  it('returns zero for empty sessions', () => {
    const result = calculateWeeklyLoad([], 1);
    expect(result.totalHours).toBe(0);
  });
});
```

**E2E tests (Playwright):**
```typescript
// tests/e2e/federation-selection.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Federation Selection', () => {
  test('should allow coach to select federation with levels', async ({ page }) => {
    // Login as coach
    await page.goto('/login');
    await page.fill('input[name="email"]', 'coach@test.com');
    await page.fill('input[name="password"]', 'testpass123');
    await page.click('button[type="submit"]');
    
    // Navigate to create skater
    await page.goto('/skaters/new');
    
    // Select federation
    await page.selectOption('select#federation', 'CAN');
    
    // Should show level dropdown
    await expect(page.locator('select#level')).toBeVisible();
    
    // Select level
    await page.selectOption('select#level', 'STAR_5');
    
    // Submit form
    await page.fill('input[name="name"]', 'Test Skater');
    await page.click('button[type="submit"]');
    
    // Should redirect to skater page
    await expect(page).toHaveURL(/\/skaters\/\d+/);
  });
});
```

### Coverage Requirements

**Minimum coverage:**
- Backend: 80%
- Frontend: 70% (unit tests)
- Critical paths: 100% (auth, payments, data integrity)

---

## Documentation

### Code Comments

**When to comment:**
```python
# ✅ Good - explains WHY
# Using Generic FK here because planning entities can be Singles, Dance, Pairs, or Synchro
content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)

# ✅ Good - explains complex logic
# Calculate weighted load: competitions count 1.5x, shows 0.8x, clinics 0.5x
if session_type == 'COMPETITION':
    weighted_duration = duration * 1.5
elif session_type == 'SHOW':
    weighted_duration = duration * 0.8

# ❌ Bad - states the obvious
# Increment counter
counter += 1

# ❌ Bad - commented out code (use git instead)
# old_calculation = duration * intensity
# return old_calculation
return duration * intensity * load_factor
```

### API Documentation

**Use drf-spectacular for auto-generated docs:**

```python
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample

@extend_schema(
    summary="List all federations",
    description="Returns a list of all active skating federations",
    parameters=[
        OpenApiParameter(
            name='tier',
            description='Filter by support tier',
            enum=['BASIC', 'ENHANCED', 'PARTNER'],
            required=False
        ),
        OpenApiParameter(
            name='has_levels',
            description='Filter by presence of level data',
            type=bool,
            required=False
        ),
    ],
    responses={200: FederationSerializer(many=True)},
    examples=[
        OpenApiExample(
            'Example Response',
            value=[
                {
                    'id': 1,
                    'name': 'Skate Canada',
                    'code': 'CAN',
                    'support_tier': 'ENHANCED',
                    'has_level_data': True
                }
            ]
        )
    ]
)
def list(self, request):
    """List federations with optional filters."""
    # Implementation
```

### README Files

**Project README structure:**
```markdown
# CoachOS v2

Brief description of the project

## Features

- Feature 1
- Feature 2

## Tech Stack

- Backend: Django 5.x, DRF, PostgreSQL
- Frontend: SvelteKit, TypeScript, Tailwind

## Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose

## Quick Start

```bash
# Clone repo
git clone <repo-url>

# Start services
docker-compose up -d

# Run migrations
docker exec backend python manage.py migrate

# Create superuser
docker exec -it backend python manage.py createsuperuser

# Access at http://localhost:8000
```

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines

## Testing

```bash
# Backend tests
pytest

# Frontend tests
npm test
```

## License

[License type]
```

---

## Security Guidelines

### Sensitive Data

**Never commit:**
```bash
# .gitignore should include:
.env
.env.local
*.key
*.pem
secrets.json
local_settings.py
```

**Use environment variables:**
```python
# settings.py
import os

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
DATABASE_URL = os.environ.get('DATABASE_URL')
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY')
```

### SQL Injection Prevention

```python
# ✅ Good - parameterized queries
Federation.objects.filter(code=user_input)

# ❌ Bad - string interpolation
Federation.objects.raw(f"SELECT * FROM federation WHERE code = '{user_input}'")
```

### XSS Prevention

```svelte
<!-- ✅ Good - Svelte auto-escapes -->
<p>{userInput}</p>

<!-- ⚠️ Dangerous - only if you trust the HTML -->
<div>{@html trustedHtml}</div>
```

### Authentication

```python
# Always use Django's built-in auth
from django.contrib.auth.decorators import login_required
from rest_framework.permissions import IsAuthenticated

@login_required
def my_view(request):
    pass

class MyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
```

---

## Code Review Checklist

**Before submitting PR:**
- [ ] Code follows style guidelines (ran black, flake8, isort)
- [ ] All tests pass
- [ ] Added tests for new functionality
- [ ] Updated documentation
- [ ] No commented-out code
- [ ] No console.log statements (use proper logging)
- [ ] No hardcoded values (use constants/env vars)
- [ ] Error handling in place
- [ ] Security considerations addressed
- [ ] Performance implications considered

**Reviewer checklist:**
- [ ] Code is readable and maintainable
- [ ] Tests are comprehensive
- [ ] No obvious bugs or security issues
- [ ] Follows project architecture
- [ ] Documentation is adequate
- [ ] Performance is acceptable
- [ ] Error messages are helpful

---

## Pre-commit Hooks

**Install pre-commit:**
```bash
pip install pre-commit
```

**Configuration (.pre-commit-config.yaml):**
```yaml
repos:
  - repo: https://github.com/psf/black
    rev: 23.12.0
    hooks:
      - id: black
        language_version: python3.11

  - repo: https://github.com/pycqa/flake8
    rev: 6.1.0
    hooks:
      - id: flake8

  - repo: https://github.com/pycqa/isort
    rev: 5.13.0
    hooks:
      - id: isort

  - repo: https://github.com/pre-commit/mirrors-prettier
    rev: v3.1.0
    hooks:
      - id: prettier
        types_or: [javascript, jsx, ts, tsx, json, css, scss]

  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
      - id: check-merge-conflict
```

**Install hooks:**
```bash
pre-commit install
```

Now hooks run automatically on `git commit`!

---

## Summary

**Key Principles:**
1. ✅ Consistency over personal preference
2. ✅ Readability over cleverness
3. ✅ Tests are not optional
4. ✅ Documentation is part of the code
5. ✅ Security is everyone's responsibility
6. ✅ Performance matters, but readability first

**Tools:**
- Black, Flake8, isort (Python)
- Prettier, ESLint (JavaScript/TypeScript)
- pytest (backend testing)
- Vitest, Playwright (frontend testing)
- Pre-commit hooks (automation)

**When in doubt:**
- Follow Django conventions
- Follow Svelte/SvelteKit conventions
- Ask for code review
- Prioritize clarity

---

*Last updated: December 2024*
