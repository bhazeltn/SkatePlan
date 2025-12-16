# WeeklyPlan Feature Specification

## Purpose
The WeeklyPlan is the **holistic view** of an athlete's training week, aggregating planned sessions across all disciplines and coaches, compared against actual logged sessions. It serves as the shared coordination point for multi-coach scenarios and load management.

---

## Data Model

### WeeklyPlan (Container)
```python
class WeeklyPlan(models.Model):
    """
    The holistic weekly plan for ONE athlete across ALL disciplines.
    Each week has one WeeklyPlan that aggregates all coaching inputs.
    """
    id = AutoField(primary_key=True)
    athlete_season = ForeignKey(AthleteSeason, on_delete=CASCADE)
    week_start = DateField()  # Always Monday
    
    # Optional coach-defined parameters
    theme = CharField(max_length=255, blank=True, null=True)
    notes = TextField(blank=True, null=True)
    
    # Load management (coach-configured)
    max_session_hours = FloatField(null=True, blank=True)  # e.g., 18.0
    max_session_count = IntegerField(null=True, blank=True)  # e.g., 12
    
    # Meta
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('athlete_season', 'week_start')
        ordering = ['week_start']
```

### PlannedSession (The building blocks)
```python
class PlannedSession(models.Model):
    """
    A single planned training session for a specific day/time.
    Created by a coach for their discipline.
    Multiple PlannedSessions make up a WeeklyPlan.
    """
    id = AutoField(primary_key=True)
    weekly_plan = ForeignKey(WeeklyPlan, on_delete=CASCADE, related_name='planned_sessions')
    yearly_plan = ForeignKey(YearlyPlan, on_delete=CASCADE)  # Links to discipline
    
    # Scheduling
    day_of_week = CharField(max_length=10, choices=[
        ('monday', 'Monday'),
        ('tuesday', 'Tuesday'),
        ('wednesday', 'Wednesday'),
        ('thursday', 'Thursday'),
        ('friday', 'Friday'),
        ('saturday', 'Saturday'),
        ('sunday', 'Sunday'),
    ])
    
    planned_time = TimeField(null=True, blank=True)  # e.g., 14:00
    planned_duration = IntegerField()  # minutes
    
    # Session details
    session_type = CharField(max_length=20, choices=[
        ('on_ice', 'On Ice'),
        ('off_ice', 'Off Ice'),
        ('class', 'Class/Dance'),
        ('conditioning', 'Conditioning'),
        ('other', 'Other'),
    ])
    
    location = CharField(max_length=100, blank=True, null=True)
    
    # Planning details (flexible - coach chooses level of detail)
    focus = TextField(blank=True, null=True)  # e.g., "Work on combo jumps"
    planned_elements = JSONField(default=list, blank=True)  # e.g., ["3Lz", "2A-3T"]
    
    # Ownership & permissions
    created_by = ForeignKey(User, on_delete=SET_NULL, null=True)
    
    # For collaborative planning (future feature)
    status = CharField(max_length=20, choices=[
        ('confirmed', 'Confirmed'),
        ('proposed', 'Proposed'),  # From collaborating coach
        ('cancelled', 'Cancelled'),
    ], default='confirmed')
    
    class Meta:
        ordering = ['day_of_week', 'planned_time']
```

### SessionTemplate (Optional - for recurring schedules)
```python
class SessionTemplate(models.Model):
    """
    Reusable template for coaches to quickly populate weekly plans.
    E.g., "Monday/Wednesday/Friday on-ice sessions"
    """
    id = AutoField(primary_key=True)
    yearly_plan = ForeignKey(YearlyPlan, on_delete=CASCADE)
    name = CharField(max_length=100)  # e.g., "Regular Training Week"
    
    # Template sessions (JSON)
    template_sessions = JSONField(default=list)
    # Structure: [
    #   {"day": "monday", "time": "14:00", "duration": 90, "type": "on_ice", ...},
    #   {"day": "wednesday", "time": "14:00", "duration": 90, "type": "on_ice", ...}
    # ]
    
    created_by = ForeignKey(User, on_delete=CASCADE)
```

---

## Key Workflows

### 1. Coach Creates Weekly Plan

**Scenario:** Coach A (Singles) plans the week for their discipline

**Steps:**
1. Coach navigates to athlete's WeeklyPlan for next week
2. System shows empty plan or previous week's plan
3. Coach can:
   - Apply a template (if one exists)
   - Copy from previous week
   - Add sessions manually

**Adding a session:**
- Select day
- Set time (optional)
- Set duration
- Choose session type
- Add focus/notes (optional)
- Add specific elements (optional)

**System shows:**
- Other disciplines' planned sessions (read-only)
- Total planned load for week
- Alerts if approaching limits

### 2. Multi-Coach View

**Scenario:** Skater has Singles (Coach A) and Dance (Coach B)

**Week view shows:**
```
Monday
  09:00 - Dance - 60min [Coach B]
  14:00 - Singles - 90min [Coach A - YOU]
  
Tuesday
  14:00 - Singles - 90min [Coach A - YOU]
  16:00 - Off-ice Conditioning - 45min [Manual entry by skater]
  
Total: 6.5 hours planned
```

**Coach A sees:**
- Their own sessions (can edit)
- Coach B's sessions (read-only, different color)
- Manual entries (gray, read-only)
- Total load metrics

**Coach B sees:**
- Their own sessions (can edit)
- Coach A's sessions (read-only, different color)
- Same total load metrics

### 3. Skater/Parent View

**Skater sees:**
- All planned sessions from all coaches
- Can add manual entries (off-ice, other coaches not on platform)
- Logging interface to log actual sessions

**Parent sees:**
- Read-only view of full week
- Alerts if load is high
- Can see actual vs. planned

### 4. Session Logging Against Plan

**When skater logs a session:**

**Option A: Log from plan**
- Tap "Log" button next to planned session
- Pre-filled with planned details
- Add: Actual duration, energy, rating, notes
- Voice note option

**Option B: Log without plan**
- Create new session log
- Select discipline (if multi-discipline)
- System tries to match to planned session
- Or creates standalone log

**Result:**
- SessionLog is created (existing model)
- Links to PlannedSession if matched
- Appears in "Actual" column of weekly view

### 5. Load Management & Alerts

**Automatic calculations:**
- Total planned hours
- Total actual hours  
- Session count
- Days of training
- Average intensity (from session ratings)

**Alert triggers (coach-configurable per athlete):**
- Total hours > threshold (e.g., > 15 hours/week)
- Days > threshold (e.g., > 5 days)
- Consecutive days > X (e.g., > 3)
- Fatigue reported 3+ days in a row
- Large increase from previous week (e.g., > 20% jump)

**Alert display:**
- 🟢 Green: Within normal range
- 🟡 Yellow: Approaching limits
- 🔴 Red: Over limits or multiple fatigue reports

---

## UI/UX Design

### Mobile View (Primary for skaters)

**Quick Log Interface:**
```
┌─────────────────────────────┐
│ Log Session                 │
├─────────────────────────────┤
│ Today's Planned:            │
│ ✓ Singles - 14:00 (90min)   │ ← Tap to log
│   Dance - 16:00 (60min)     │ ← Tap to log
│                             │
│ + Add Other Session         │
│                             │
│ ─────────────────────────── │
│                             │
│ 🎤 Voice Note              │ ← Big button
│                             │
└─────────────────────────────┘
```

**Voice Note Interface:**
```
┌─────────────────────────────┐
│ Quick Log - Voice Note      │
├─────────────────────────────┤
│                             │
│    [Tap to Record] 🎤       │
│                             │
│    "Singles today, 90       │
│     minutes. Triple lutz    │
│     was good, landed 7/10.  │
│     Feeling tired, 3/5."    │
│                             │
│ ✓ Auto-filled:              │
│ Duration: 90 min            │
│ Energy: 3/5                 │
│ Elements: 3Lz (7/10)        │
│                             │
│ [Edit] [Submit]             │
└─────────────────────────────┘
```

### Desktop View (Primary for coaches)

**Week Grid View:**
```
┌────────────────────────────────────────────────────────────────┐
│ Week of Jan 15-21, 2025 - Sarah Chen                          │
│ Load: 🟡 14.5 hours planned (approaching limit 15h)            │
├────────────────────────────────────────────────────────────────┤
│        │ PLANNED                    │ ACTUAL                  │
├────────┼───────────────────────────┼────────────────────────┤
│ Mon    │ 09:00 Dance 60m [Coach B] │ ✓ 09:00 Dance 60m ⭐⭐⭐⭐  │
│        │ 14:00 Singles 90m [YOU]   │ ✓ 14:00 Singles 85m ⭐⭐⭐  │
│        │                           │   "Tired from dance"    │
├────────┼───────────────────────────┼────────────────────────┤
│ Tue    │ 14:00 Singles 90m [YOU]   │ (not logged)           │
│        │ 16:00 Off-ice 45m         │                        │
├────────┼───────────────────────────┼────────────────────────┤
│ Wed    │ 09:00 Dance 90m [Coach B] │                        │
│        │ REST Singles              │                        │
│        │                           │                        │
├────────┼───────────────────────────┼────────────────────────┤
│ Thu    │ 14:00 Singles 90m [YOU]   │                        │
│        │   Focus: Program runs     │                        │
├────────┼───────────────────────────┼────────────────────────┤
│        │ + Add Session             │                        │
└────────┴───────────────────────────┴────────────────────────┘

⚠️ ALERTS:
  • Sarah reported "tired" Monday (after 2 sessions)
  • 5 skating days this week (above typical 4)
  • Suggestion: Consider rest day Thursday?
```

---

## Implementation Phases

### Phase 1: Basic Weekly Planning (Week 1-2)
- WeeklyPlan model
- PlannedSession model
- Basic CRUD API endpoints
- Simple desktop UI for creating plan
- Read-only view for other coaches

**Deliverable:** Coach can plan their discipline's sessions for a week

### Phase 2: Holistic View & Load Tracking (Week 2-3)
- Aggregate view across disciplines
- Load calculation logic
- Alert system (basic thresholds)
- Multi-coach display (color-coding)

**Deliverable:** Coaches see complete picture, get load warnings

### Phase 3: Mobile Quick Logging (Week 3-4)
- Mobile-optimized session log form
- "Log from plan" quick action
- Basic session log integration

**Deliverable:** Skaters can log sessions on phone quickly

### Phase 4: Voice Notes + AI (Week 4-5)
- Voice recording interface
- Whisper API integration for transcription
- GPT integration for data extraction
- Review/edit extracted data before save

**Deliverable:** Voice-to-structured-data logging works

### Phase 5: Templates & Efficiency (Week 5-6)
- SessionTemplate model
- Apply template to week
- Copy previous week
- Bulk operations

**Deliverable:** Coaches can plan weeks in < 5 minutes

### Phase 6: Advanced Alerts (Week 6+)
- Fatigue tracking
- Week-over-week comparison
- Custom alert rules per athlete
- Notification system

**Deliverable:** Proactive load management

---

## Open Questions

### 1. Template Scope
Should templates be:
- A) Per YearlyPlan (each coach has their own templates)
- B) Per athlete (shared across disciplines)
- C) Both?

**Recommendation:** Per YearlyPlan - each coach manages their own templates

### 2. Planning Horizon
- How many weeks in advance can/should coaches plan?
- Should we limit to current macrocycle only?
- Or allow planning full season ahead?

**Recommendation:** Allow planning 4-8 weeks ahead, but encourage 1-2 weeks

### 3. Collaborative Sessions
What if both coaches want to teach same session together?
- E.g., "Off-ice jump technique - Singles coach + Jump specialist"
- Single PlannedSession with multiple coaches?
- Or two separate sessions same time?

**Recommendation:** Defer this complexity, use notes for now

### 4. Rest Days
Should rest be explicitly planned?
- PlannedSession with type="rest"?
- Or just absence of sessions = rest?

**Recommendation:** No explicit rest sessions, just gaps in schedule

### 5. Nutrition Tracking
You mentioned this "can of worms" - should we:
- Add nutrition fields to SessionLog?
- Separate NutritionLog model?
- Partner with MyFitnessPal or similar?
- Ignore for MVP?

**Recommendation:** Defer to post-MVP, keep notes field for now

---

## Data Flow Diagram

```
YearlyPlan (Singles, Coach A)
    ↓
PlannedSession (Mon 14:00, 90min, Singles)
    ↓
WeeklyPlan (Week of Jan 15) ← Aggregates all PlannedSessions
    ↓
SessionLog (Mon 14:00, 85min, Singles) ← Skater logs actual
    ↓
Load Calculations ← System calculates metrics
    ↓
Alerts ← System checks thresholds
    ↓
Dashboard ← Coaches see warnings
```

---

## Success Metrics (for Beta)

**Adoption:**
- % of planned sessions actually logged
- Average time to log a session
- % of skaters using voice notes

**Value:**
- # of load alerts triggered
- # of weeks with complete plans
- Coach satisfaction (survey)

**Collaboration:**
- % of multi-coach athletes
- % of coaches viewing other coaches' plans

---

## Next Steps

1. **Review & Approve** this spec
2. **Implement Phase 1** (basic planning)
3. **Test with single coach** → single discipline
4. **Add Phase 2** (multi-coach view)
5. **Test with multi-coach** scenario
6. **Add Phase 3** (mobile logging)
7. **Test voice notes** (Phase 4) with beta users

**Timeline to working beta: 6-7 weeks**

---

## Notes

- Keep it simple at first - coaches can always add more detail later
- Mobile experience is critical for adoption
- Voice notes are differentiating feature
- Load management is the killer value-add for multi-discipline

