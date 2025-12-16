# Design Decisions & Open Questions - Resolved

## Decisions Made (December 2024)

### 1. Template Scope
**Decision:** Flexible creation - coach and athlete-specific as needed

**Rationale:** Different coaches have different planning styles. Some may want to reuse templates across multiple athletes ("Standard Novice Week"), others may want athlete-specific templates ("Sarah's Competition Week"). The system should support both without forcing a structure.

**Implementation:**
- SessionTemplate has `created_by` (coach)
- Can be marked as "Personal" (one athlete) or "General" (reusable)
- Templates belong to YearlyPlan (discipline-specific)
- Coach can share templates with other coaches (future feature)

---

### 2. Planning Horizon
**Decision:** No hard limits - let coaches plan as far ahead as they want

**Rationale:** Some coaches like to plan the entire season upfront (especially for international travel, competition calendars). Others prefer week-by-week flexibility. Who are we to dictate methodology?

**Implementation:**
- WeeklyPlans can be created for any date
- UI encourages 2-4 weeks ahead ("You're planning 12 weeks ahead - that's ambitious!")
- Show visual indicators for how far ahead planning goes
- Easy "copy from previous week" for repetitive schedules
- **Suggestion in UI:** "Most coaches plan 2-4 weeks ahead for flexibility"

**UI Affordances:**
- Calendar view shows which weeks are planned (green) vs. empty (gray)
- "Quick fill" option to apply template to next 4 weeks
- Warning if planning >12 weeks ahead: "Plans this far out often need adjustment"

---

### 3. Collaborative Sessions
**Decision:** Head coach owns the schedule, can mark sessions as "collaborative"

**Rationale:** In most cases, there's a primary coach who coordinates the athlete's schedule. Harness coaches, jump specialists, choreographers work within that framework. The head coach schedules the session and can note collaborators.

**Implementation:**

#### For Same-Discipline Collaboration:
```python
class PlannedSession(models.Model):
    # ... existing fields ...
    
    primary_coach = ForeignKey(User, related_name='primary_sessions')
    collaborating_coaches = ManyToManyField(User, 
                                           related_name='collaborative_sessions',
                                           blank=True)
    
    session_notes = TextField(blank=True)  # e.g., "w/ harness coach"
```

**UI:**
```
Monday 3:00pm - Singles Freeskate (90 min)
Primary: Coach Smith
With: Coach Johnson (Harness), Coach Lee (Jump Specialist)
Focus: Triple axel progression
```

#### For Different-Discipline Same-Timeslot:
If Singles coach and Dance coach both schedule Monday 3pm:

**Weekly View Shows:**
```
Monday 3:00pm
┌────────────────────────────────┐
│ Singles (90min) - Coach Smith  │
│ Dance (60min) - Coach Lee      │ ← Different colored cards, stacked
└────────────────────────────────┘
⚠️ Scheduling conflict - same athlete, same time
```

**System behavior:**
- Alerts both coaches of conflict
- Suggests resolution (one coach adjusts time)
- If intentional (rare), can mark as "Acknowledged"
- Load calculation counts as single 90min session (not double)

**Edge case:** If it's a JOINT session (both disciplines):
- Primary coach creates session
- Marks as "Multi-discipline" 
- Links to both YearlyPlans
- Both coaches can edit/view

---

### 4. Rest Days
**Decision:** YES - Rest days should be explicitly planned

**Rationale:** Rest is a training tool, not just absence of training. Planned rest days communicate intent and prevent coaches from accidentally over-scheduling. Also critical for load management and tapering.

**Implementation:**

```python
class PlannedSession(models.Model):
    session_type = CharField(choices=[
        ('on_ice', 'On Ice'),
        ('off_ice', 'Off Ice'),
        ('class', 'Class/Dance'),
        ('conditioning', 'Conditioning'),
        ('rest', 'Rest Day'),           # ← NEW
        ('travel', 'Travel Day'),       # ← NEW
        ('competition', 'Competition'), # ← NEW
        ('other', 'Other'),
    ])
```

**UI Features:**
- "Add Rest Day" button
- Different visual styling (gray background, zzz icon)
- Can add notes: "Active recovery - light walk only"
- Load calculation shows rest days don't count toward hours but do count toward "days planned"

**Visual:**
```
Wednesday
┌────────────────────────────────┐
│ 💤 Planned Rest Day            │
│ Note: Recovery after comp      │
└────────────────────────────────┘
```

**Smart Features:**
- System suggests rest day if athlete has 5+ consecutive days
- Alert if athlete logged a session on a planned rest day
- "Override rest day" option with coach approval

---

### 5. Nutrition Tracking
**Decision:** DEFER to post-MVP with careful, sensitive approach

**Rationale:** This is critical but dangerous territory. Benefits (performance optimization) vs. Risks (eating disorders, body image issues) require careful design. Also, coaches aren't dietitians in most cases.

**Phase 1 (MVP): NO nutrition tracking**
- Focus on training load, energy levels, recovery
- General wellness check-ins (fatigue, sleep quality)

**Phase 2 (Post-MVP, if added):**

**What we CAN do safely:**
- ✅ Hydration tracking (did you drink enough water?)
- ✅ Meal timing (did you eat before practice?)
- ✅ Energy levels (scale 1-5, already in session log)
- ✅ General wellness questions
- ✅ Link to external dietitian resources

**What we CANNOT do:**
- ❌ Calorie tracking
- ❌ Weight tracking (prohibited in Canada anyway)
- ❌ Body measurements (prohibited)
- ❌ Macronutrient ratios
- ❌ "Good food" / "Bad food" language

**If implemented, must include:**
- Professional oversight requirement (link to registered dietitian)
- Athlete privacy (nutrition data NOT visible to all coaches by default)
- Age-appropriate content (different for 10yo vs. 20yo)
- Eating disorder screening resources
- Clear disclaimers about coach qualifications
- Opt-in, not default

**Better alternative for MVP:**
Add to SessionLog:
- "Did you eat within 2 hours before practice?" Yes/No
- "Hydration level" (Well hydrated / OK / Dehydrated)
- "Sleep quality last night" (Great / OK / Poor)

This gives coaches wellness data without triggering dangerous behaviors.

**Final decision:** Revisit after MVP beta testing. Get coach feedback on whether nutrition is even needed.

---

## Additional Design Decisions

### 6. Multi-Coach Access Request Flow

**When Coach B wants access to existing athlete (already working with Coach A):**

```
Step 1: Coach B creates "new" athlete
  ↓
Step 2: System detects duplicate (name + DOB match)
  ↓
Step 3: System shows:
  "This athlete may already exist in the system.
   
   Sarah Chen - Born: Jan 15, 2010
   Currently working with: Coach Smith (Singles)
   
   Options:
   [Request Access] [This is a different person]"
  ↓
Step 4: If "Request Access":
  - Coach B specifies discipline (Dance, Pairs, etc.)
  - Sends notification to Coach A AND athlete
  - Creates pending PlanningEntityAccess record
  ↓
Step 5: Coach A or athlete approves:
  - Coach B gains access to their discipline
  - Can see holistic view but can't edit others' data
  - Both coaches now see each other in "Collaborating Coaches"
```

**Privacy protection:**
- Doesn't reveal Coach A's identity until approved
- Athlete/parent must approve (not just coach)
- Can deny with reason (wrong person, unauthorized request)

---

### 7. Load Management Alert Thresholds

**Who configures:** Coach sets thresholds per athlete

**Default values (suggested):**
- Max hours/week: 15-20 (depends on level)
- Max session count/week: 10-12
- Max consecutive days: 5
- Fatigue threshold: 3+ days of low energy (≤2/5)

**Alerts triggered:**

🟢 **Normal** - All metrics within range
```
Weekly Load: 12 hours / 15 max
Sessions: 8 / 10 max
Status: Healthy training load
```

🟡 **Caution** - Approaching limits
```
Weekly Load: 14.5 hours / 15 max
⚠️ You're at 97% of target volume
Recommendation: Monitor fatigue levels
```

🔴 **Warning** - Over limits OR multiple red flags
```
Weekly Load: 17 hours / 15 max
🚨 OVERLOAD: 2 hours over target
Fatigue: Reported low energy 4 consecutive days
Recommendation: Consider adding rest day
```

**Coach can:**
- Adjust thresholds per athlete
- Acknowledge warnings ("We're peaking for Nationals")
- Set temporary overrides ("Competition week exception")
- View historical load trends

---

### 8. Voice Note AI Extraction - Failure Handling

**What happens if AI fails or gets it wrong?**

**Approach: Trust but Verify**

```
User speaks → Transcript generated → AI extracts data → User reviews before save
```

**UI Flow:**
```
1. Record voice note
   ↓
2. "Processing..." (5-10 seconds)
   ↓
3. Show extracted data with confidence indicators:
   
   ✓ Duration: 90 min (High confidence)
   ✓ Energy: 3/5 (High confidence)
   ⚠️ Element: "3 loops" - Did you mean 3Lo? (Low confidence)
   ❓ Program runs: Couldn't detect (Manual entry needed)
   
4. User corrects/confirms → Save
```

**Fallback options:**
- Manual entry always available
- "AI didn't work? Try typing it" button
- Voice recording saved regardless (transcript available later)
- Coach can add missing details later

**Learning:**
- Track AI accuracy rate
- Improve prompts based on common failures
- Eventually: Fine-tune model on figure skating terminology

---

### 9. Offline Mode Strategy

**Decision: Progressive enhancement, not full offline**

**Rationale:** Full offline mode is complex and can cause sync conflicts. Better to optimize for "spotty connection" than full offline.

**Implementation:**

**Online (preferred):**
- All features work normally
- Real-time save
- Instant feedback

**Poor connection:**
- Form autosaves to localStorage
- "Saving..." indicator stays until confirmed
- Retry failed requests
- "Your session will save when connection improves"

**Truly offline:**
- Cannot create new sessions (needs API)
- Can VIEW previously loaded data (cached)
- Message: "You're offline. Session logging requires connection."
- Option: "Take a voice note and save for later"

**Voice notes offline:**
- Record locally
- Store in IndexedDB
- Upload when connection returns
- Show pending uploads in UI

**Why not full offline:**
- Conflict resolution is complex (what if coach edits while athlete logs?)
- Multi-coach scenarios require server coordination
- Version 1: Assume coaches have wifi/data at rink
- Version 2: Add full offline if users demand it

---

## Summary of Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| **Template Scope** | Flexible - coach & athlete specific | Different coaches, different styles |
| **Planning Horizon** | No limits, encourage 2-4 weeks | Don't restrict, but guide best practice |
| **Collaborative Sessions** | Head coach owns, marks collaborators | Clear ownership, note specialists |
| **Rest Days** | YES - explicitly plan them | Rest is training tool |
| **Nutrition** | DEFER - too sensitive for MVP | High risk, need professional oversight |
| **Program/Element Logging** | KEEP - core feature | Data-driven is the whole point |
| **Offline Mode** | Progressive enhancement only | Full offline too complex for V1 |
| **AI Extraction** | Trust but verify | Show, let user edit, then save |

---

## Next Steps

1. ✅ Decisions documented
2. ⏭️ Update WeeklyPlan spec with rest day/travel options
3. ⏭️ Create session logging UI mockups
4. ⏭️ Begin Phase 1 implementation (WeeklyPlan models)
5. ⏭️ Set up AI extraction service
6. ⏭️ Build mobile session logging UI

**Ready to start building?** 🚀

