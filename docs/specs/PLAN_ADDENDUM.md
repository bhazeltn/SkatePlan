# Implementation Plan - Addendum & Refinements

## Critical Corrections & Additions

### 1. Pricing Model ✅ DEFERRED
**Decision:** Don't lock in pricing now, figure out post-beta

**Rationale:** 
- Need real user feedback on value
- Different markets (US vs Canada vs Philippines)
- Test different tiers with beta users

**Action:** Remove all pricing from specs, add placeholder "TBD based on beta feedback"

---

### 2. Skater Level & Federation Context ⚠️ MORE COMPLEX

**Problem Identified:**
> "Skate Canada Juvenile ≠ USFS Juvenile ≠ PHSU Juvenile"

**Current Approach (TOO SIMPLE):**
```python
# This doesn't work!
if skater.level == 'JUVENILE':
    # Which federation's Juvenile?
```

**Correct Approach:**

```python
class SkaterLevel(models.Model):
    """
    Federation-specific level definitions.
    Each federation has their own level progression.
    """
    federation = ForeignKey(Federation)
    level_code = CharField(max_length=50)  # "JUVENILE"
    display_name = CharField(max_length=100)  # "Juvenile"
    
    # Capability flags
    can_do_doubles = BooleanField(default=False)
    can_do_triples = BooleanField(default=False)
    max_program_length_seconds = IntegerField()  # e.g., 150
    
    # UI complexity
    detail_level = CharField(choices=[
        ('SIMPLE', 'Simple - basic tracking'),
        ('INTERMEDIATE', 'Intermediate - element checklist'),
        ('ADVANCED', 'Advanced - full protocol')
    ])
    
    # Ordering within federation
    sort_order = IntegerField()  # 1=lowest, 20=highest
    
    class Meta:
        unique_together = ('federation', 'level_code')
        ordering = ['federation', 'sort_order']


# Usage:
class SinglesEntity(models.Model):
    skater = ForeignKey(Skater)
    federation = ForeignKey(Federation)
    current_level = ForeignKey(SkaterLevel)  # Not just a string!
    
    def get_allowed_detail_level(self):
        """Return what detail level this skater can use"""
        return self.current_level.detail_level
```

**Seed Data Structure:**
```python
# Skate Canada levels
SkaterLevel.objects.create(
    federation=skate_canada,
    level_code='STAR_2',
    display_name='STAR 2',
    can_do_doubles=False,
    can_do_triples=False,
    max_program_length_seconds=90,
    detail_level='SIMPLE',
    sort_order=2
)

SkaterLevel.objects.create(
    federation=skate_canada,
    level_code='JUVENILE',
    display_name='Juvenile',
    can_do_doubles=True,
    can_do_triples=False,
    max_program_length_seconds=150,
    detail_level='INTERMEDIATE',
    sort_order=10
)

# USFS levels (different capabilities!)
SkaterLevel.objects.create(
    federation=usfs,
    level_code='JUVENILE',
    display_name='Juvenile',
    can_do_doubles=True,
    can_do_triples=True,  # USFS Juvenile can do triples!
    max_program_length_seconds=180,  # Different length!
    detail_level='INTERMEDIATE',
    sort_order=8
)
```

**ISU/ISI Dual Federation:**
```python
# Some federations use BOTH ISU and ISI systems
federation = Federation.objects.get(code='PHSU')
federation.level_systems = ['ISU', 'ISI']  # JSONField

# Skater can have level in each system
class SkaterLevelAssignment(models.Model):
    """Tracks skater's level in different systems"""
    planning_entity = GenericForeignKey()
    level = ForeignKey(SkaterLevel)
    level_system = CharField(choices=[('ISU', 'ISU'), ('ISI', 'ISI')])
    date_achieved = DateField()
    is_current = BooleanField(default=True)
```

**Action for MVP:**
- Start with basic Skate Canada levels (your target market)
- Add USFS levels
- Add PHSU levels
- Make it easy to add more federations via admin
- **Defer** dual ISU/ISI complexity to post-MVP

---

### 3. Organization Membership - No Duplication ✅

**Problem Identified:**
> "Coach already on tool with skater, PSU invites them - don't duplicate!"

**Correct Flow:**

```python
# When PSU invites existing coach/skater:

def invite_to_organization(org, email, role):
    """
    Invite user to organization.
    If they already exist, just add membership.
    """
    
    # Check if user exists
    existing_user = User.objects.filter(email=email).first()
    
    if existing_user:
        # User already in system
        # Just add organization membership
        OrganizationMembership.objects.get_or_create(
            organization=org,
            user=existing_user,
            defaults={'role': role}
        )
        
        # Give org admin appropriate access to existing skaters
        if role == 'ATHLETE':
            # Find their existing planning entities
            skater = existing_user.skaters.first()
            if skater:
                for entity in get_planning_entities(skater):
                    # Grant Observer access to org admin
                    PlanningEntityAccess.objects.get_or_create(
                        user=org.primary_contact,
                        planning_entity=entity,
                        defaults={'access_level': 'OBSERVER'}
                    )
        
        return existing_user
    else:
        # New user - send invitation
        invite = OrganizationInvite.objects.create(
            organization=org,
            email=email,
            role=role,
            invited_by=org.primary_contact
        )
        send_invitation_email(invite)
        return None
```

**UI Flow:**
```
PSU Admin: "Add Coach - coach@example.com"
  ↓
System: "This coach is already in CoachOS!"
  ↓
System shows:
┌─────────────────────────────────────────┐
│ Coach Martinez (coach@example.com)      │
│                                         │
│ Already coaching:                       │
│ • Maria Santos (Fil-Can)                │
│ • John Reyes (Fil-Am)                   │
│                                         │
│ Add to Philippine Skating Union?        │
│                                         │
│ [Cancel] [Add to Organization]          │
└─────────────────────────────────────────┘
  ↓
[Add to Organization] clicked
  ↓
Result:
✓ Coach Martinez added to PSU
✓ PSU admin now has Observer access to Maria & John
✓ No data duplicated
✓ Coach's existing access unchanged
```

**Key principle:** Organization membership is ADDITIVE, not duplicative.

---

### 4. Future Features to Design For (But Not Build Yet)

#### A. AI Suggestions ⭐ HIGH VALUE

**Concept:**
```
Coach opens weekly plan for next week
  ↓
AI analyzes:
- Current macrocycle phase (e.g., "Competition Phase")
- Recent session logs (e.g., "3Lz success rate improving")
- Upcoming competitions (e.g., "Sectionals in 2 weeks")
- Historical patterns (e.g., "Athlete typically peaks 2 weeks before comp")
  ↓
AI suggests:
┌─────────────────────────────────────────┐
│ 🤖 Suggested Weekly Plan               │
├─────────────────────────────────────────┤
│ Based on your Competition Phase and    │
│ upcoming Sectionals (Dec 28):          │
│                                         │
│ Monday:                                 │
│ • Light practice (60 min)               │
│ • Program runthrough x2                 │
│ • Focus: Performance quality            │
│                                         │
│ Wednesday:                              │
│ • Full practice (90 min)                │
│ • Complete short program x3             │
│ • Polish transitions                    │
│                                         │
│ Friday:                                 │
│ • Medium practice (75 min)              │
│ • Elements only                         │
│ • Focus: 3Lz consistency (71% → 80%?)   │
│                                         │
│ [Use This Plan] [Customize] [Ignore]    │
└─────────────────────────────────────────┘
```

**Technical approach:**
```python
# services/ai_suggestions.py
def generate_weekly_plan_suggestion(athlete_season, week_start):
    """
    Use GPT-4 to suggest weekly plan based on context.
    """
    
    # Gather context
    context = {
        'current_phase': get_current_macrocycle(athlete_season),
        'recent_sessions': get_recent_sessions(athlete_season, days=14),
        'upcoming_competitions': get_upcoming_competitions(athlete_season, weeks=4),
        'goals': get_active_goals(athlete_season),
        'element_success_rates': calculate_element_success_rates(athlete_season),
        'typical_weekly_load': calculate_typical_load(athlete_season),
    }
    
    # Build prompt
    prompt = f"""
    You are a figure skating coach creating a weekly training plan.
    
    Context:
    - Athlete: {athlete_season.skater.full_name}
    - Current Phase: {context['current_phase'].phase_title}
    - Phase Focus: {context['current_phase'].phase_focus}
    - Next Competition: {context['upcoming_competitions'][0]} in {days_until} days
    - Recent Training: {len(context['recent_sessions'])} sessions in past 2 weeks
    - Element Progress: 3Lz at 71% success (up from 65%)
    
    Suggest a weekly plan for week of {week_start}.
    Include:
    - Number of sessions
    - Duration of each
    - Focus areas
    - Specific elements to work on
    - Taper/load management advice
    
    Return as JSON with structure:
    {{"sessions": [{{"day": "monday", "duration": 90, "focus": "...", "elements": []}}]}}
    """
    
    response = openai.chat.completions.create(
        model="gpt-4-turbo-preview",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    
    return json.loads(response.choices[0].message.content)
```

**MVP Status:** ⏭️ DEFER to Phase 11+
- Requires stable data (sessions, elements, goals)
- Requires good prompts (need real data to tune)
- High value but not essential for launch

**Design for it now:**
- Make sure we track enough data
- Session logs have rich detail
- Element success rates calculable
- Macrocycle phases well-defined

#### B. Weekly Summary Emails 📧 MEDIUM VALUE

**Concept:**
```
Email sent Monday morning to coach:

Subject: Weekly Summary - Sarah Chen

Hi Coach Martinez,

Here's what happened last week with Sarah:

Training Volume:
• 5 sessions (12.5 hours)
• ↑ 20% from previous week

Highlights:
• 🎯 Landed 8/10 triple lutzes (up from 7/10)
• ⭐ Short program quality: 4.2/5 average
• ⚠️ Reported low energy 3 days (Mon, Wed, Fri)

Upcoming:
• Competition prep week (2 weeks until Sectionals)
• Weekly plan needs creation
• 2 goals approaching deadline

[View Full Dashboard]
```

**Technical:**
```python
# tasks/weekly_summary.py
@shared_task
def send_weekly_summaries():
    """
    Celery task - runs every Monday 8am
    """
    for coach in User.objects.filter(role='COACH', email_preferences__weekly_summary=True):
        for athlete in get_coach_athletes(coach):
            summary = generate_weekly_summary(athlete, last_week())
            send_email(
                to=coach.email,
                subject=f"Weekly Summary - {athlete.full_name}",
                template='weekly_summary',
                context=summary
            )
```

**MVP Status:** ⏭️ DEFER to Phase 12+
- Need stable email infrastructure
- Need enough users to make it valuable
- Easy to add later

#### C. Auto-Pull Competition Results 🏆 HIGH VALUE (Eventually)

**Problem:** Coaches manually enter results that exist online

**Solution:** Scrape results from competition websites

**Challenges:**
- Every competition uses different results system
- IceCalc, O2CM, USFS Results, ISU Results, etc.
- No standard API
- Websites change frequently

**Approach (Post-MVP):**

**Phase 1:** PDF import (Week 7 - MVP)
**Phase 2:** IceCalc scraper (most common)
**Phase 3:** O2CM scraper
**Phase 4:** ISU results scraper
**Phase 5:** Federation-specific scrapers

**Technical:**
```python
# services/result_scrapers/icecalc.py
def scrape_icecalc_results(competition_url):
    """
    Scrape results from IceCalc competition page.
    Returns list of results with scores.
    """
    response = requests.get(competition_url)
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Find results table
    results = []
    for row in soup.find_all('tr', class_='result-row'):
        result = {
            'skater_name': row.find('td', class_='name').text,
            'placement': int(row.find('td', class_='rank').text),
            'total_score': float(row.find('td', class_='score').text),
            # ...
        }
        results.append(result)
    
    return results
```

**MVP Status:** ⏭️ DEFER to Phase 14+
- PDF import solves 80% of use case
- Scraping is fragile and high maintenance
- Better to perfect PDF import first

#### D. Customizable Dashboard 🎨 NICE TO HAVE

**Concept:**
```
Coach can drag-and-drop dashboard widgets:

┌─────────────────────────────────────────┐
│ 🎯 My Athletes (12)                     │ ← Can reorder
├─────────────────────────────────────────┤
│ 📅 This Week's Sessions (23)            │ ← Can hide
├─────────────────────────────────────────┤
│ 🏆 Upcoming Competitions (3)            │ ← Can add/remove
├─────────────────────────────────────────┤
│ ⚠️ Red Flags (2 injuries, 1 overload)  │
└─────────────────────────────────────────┘

[Customize Dashboard]
  ↓
┌─────────────────────────────────────────┐
│ Available Widgets:                      │
│ ☐ My Athletes                           │
│ ☑ This Week                             │
│ ☑ Red Flags                             │
│ ☐ Recent Activity                       │
│ ☐ Goal Progress                         │
│ ☐ Competition Calendar                  │
│                                         │
│ [Save Layout]                           │
└─────────────────────────────────────────┘
```

**Technical:**
```python
# models.py
class DashboardLayout(models.Model):
    """Stores user's dashboard customization"""
    user = OneToOneField(User)
    layout = JSONField(default=dict)
    # Structure:
    # {
    #   "widgets": [
    #     {"type": "athletes", "order": 1, "visible": true},
    #     {"type": "red_flags", "order": 2, "visible": true},
    #     {"type": "activity", "order": 3, "visible": false}
    #   ]
    # }
```

**MVP Status:** ⏭️ DEFER to Phase 15+
- Nice polish feature
- Not essential for function
- Easy to add later
- Focus on making DEFAULT dashboard great first

---

### 5. Planning Beyond Training Sessions ✅ CRITICAL CATCH

**Problem Identified:**
> "We need to plan for new programs, clinics, shows, etc."

**You're absolutely right!** Current WeeklyPlan only handles training sessions.

**Enhanced PlannedSession Model:**

```python
class PlannedSession(models.Model):
    weekly_plan = ForeignKey(WeeklyPlan)
    
    SESSION_TYPE_CHOICES = [
        # Training
        ('ON_ICE', 'On-Ice Training'),
        ('OFF_ICE', 'Off-Ice Training'),
        ('CLASS', 'Class/Dance'),
        ('CONDITIONING', 'Conditioning'),
        
        # New!
        ('PROGRAM_DEVELOPMENT', 'New Program Development'),
        ('CHOREOGRAPHY', 'Choreography Session'),
        ('MUSIC_EDIT', 'Music Editing'),
        
        # Events
        ('CLINIC', 'Clinic/Seminar'),
        ('SHOW', 'Ice Show'),
        ('EXHIBITION', 'Exhibition'),
        ('TEST_SESSION', 'Test Session'),
        
        # Competition-related
        ('COMPETITION', 'Competition'),
        ('TRAVEL', 'Travel Day'),
        
        # Rest
        ('REST', 'Rest Day'),
        ('RECOVERY', 'Active Recovery'),
        
        # Other
        ('OTHER', 'Other'),
    ]
    
    session_type = CharField(choices=SESSION_TYPE_CHOICES)
    
    # For events (clinic, show, etc.)
    event_name = CharField(max_length=255, blank=True, null=True)
    event_location = CharField(max_length=255, blank=True, null=True)
    registration_deadline = DateField(blank=True, null=True)
    cost = DecimalField(max_digits=8, decimal_places=2, blank=True, null=True)
    
    # For program development
    program = ForeignKey(Program, blank=True, null=True)
    
    # Standard fields
    day_of_week = CharField(...)
    planned_time = TimeField(...)
    planned_duration = IntegerField(...)
    notes = TextField(...)
```

**UI Examples:**

**Planning New Program:**
```
Monday, June 15
┌─────────────────────────────────────────┐
│ 📝 New Program Development              │
│ Type: Choreography Session              │
│ Time: 2:00pm - 5:00pm                   │
│                                         │
│ Program: Short Program 2024-25          │
│ Choreographer: Jane Doe                 │
│ Location: Main Arena                    │
│ Cost: $500                              │
│                                         │
│ Notes:                                  │
│ • Discuss music options                 │
│ • Block out first 30 seconds            │
│ • Need to finalize by July 1            │
└─────────────────────────────────────────┘
```

**Planning Clinic:**
```
Saturday, July 20
┌─────────────────────────────────────────┐
│ 🎓 Clinic/Seminar                       │
│ Event: Jump Technique Clinic            │
│ Time: 9:00am - 4:00pm                   │
│                                         │
│ Instructor: Olympic Coach Smith         │
│ Location: National Training Center      │
│ Cost: $300                              │
│ Registration Deadline: July 1           │
│                                         │
│ Notes:                                  │
│ • Focus on triple lutz technique        │
│ • Bring video camera                    │
│ • Lunch provided                        │
└─────────────────────────────────────────┘
```

**Planning Show:**
```
Friday, December 15
┌─────────────────────────────────────────┐
│ 🎭 Ice Show                             │
│ Event: Holiday on Ice                   │
│ Time: 7:00pm - 9:00pm                   │
│                                         │
│ Performing: Short Program               │
│ Costume: Blue dress (in closet)         │
│ Location: City Arena                    │
│                                         │
│ Rehearsals:                             │
│ • Dec 12 - 6pm (tech rehearsal)         │
│ • Dec 14 - 7pm (dress rehearsal)        │
│                                         │
│ Notes:                                  │
│ • Need to arrive by 6:30pm              │
│ • Parents helping with costume setup    │
└─────────────────────────────────────────┘
```

**Load Calculation Impact:**
```python
def calculate_weekly_load(weekly_plan):
    """
    Calculate load, but weight different session types differently.
    """
    total_hours = 0
    training_hours = 0
    event_hours = 0
    
    for session in weekly_plan.planned_sessions.all():
        duration_hours = session.planned_duration / 60
        
        if session.session_type in ['ON_ICE', 'OFF_ICE', 'CLASS', 'CONDITIONING']:
            training_hours += duration_hours
            total_hours += duration_hours
        elif session.session_type in ['COMPETITION', 'TEST_SESSION']:
            # Competition counts as HIGH load
            total_hours += duration_hours * 1.5
        elif session.session_type in ['SHOW', 'EXHIBITION']:
            # Show is moderate load
            total_hours += duration_hours * 0.8
        elif session.session_type in ['CLINIC', 'CHOREOGRAPHY']:
            # Learning, not physical load
            total_hours += duration_hours * 0.5
        # Travel, rest don't count toward load
    
    return {
        'total_hours': total_hours,
        'training_hours': training_hours,
        'has_competition': weekly_plan.planned_sessions.filter(
            session_type='COMPETITION'
        ).exists()
    }
```

**MVP Status:** ✅ INCLUDE IN MVP
- Expand PlannedSession.session_type choices
- Add event-specific fields
- Update load calculation logic
- This is CORE planning functionality

**Phase:** Add in Week 6 (Planning Features)

---

## Updated Roadmap - Key Changes

### Phase 0: Backend Hardening (Week 1)
**ADDITIONS:**
- [ ] Add SkaterLevel model (federation-specific levels)
- [ ] Expand PlannedSession.session_type (programs, clinics, shows)
- [ ] Add event-specific fields to PlannedSession
- [ ] Organization membership logic (no duplication)

### Phase 6: Planning Features (Week 6)
**ADDITIONS:**
- [ ] Plan new programs (choreography, music)
- [ ] Plan clinics/seminars
- [ ] Plan shows/exhibitions
- [ ] Enhanced load calculation (weighted by type)

### Post-MVP (Phase 11+)
**NEW FEATURES TO DESIGN FOR:**
- AI weekly plan suggestions
- Weekly summary emails
- Competition result auto-import
- Customizable dashboards

---

## Data We Need to Track (For Future AI)

To enable AI suggestions later, make sure we're tracking:

**From Session Logs:**
- ✅ Element success rates (have: element_attempts)
- ✅ Program quality trends (have: program_runs)
- ✅ Energy levels (have: energy_stamina)
- ✅ Notes (have: coach_notes, skater_notes)

**From Weekly Plans:**
- ✅ Training volume over time
- ✅ Load patterns
- ✅ Phase adherence

**From Competitions:**
- ✅ Performance scores
- ✅ Element-by-element results
- ✅ Trends over season

**From Goals:**
- ✅ Goal achievement rate
- ✅ Time to completion
- ✅ Coach vs skater goal success

**NEW - Need to add:**
- Weather/ice conditions (affects training quality)
- Sleep quality (already mentioned)
- Menstrual cycle tracking (for female athletes, optional, private)
  - This is performance-relevant but VERY sensitive
  - Must be opt-in, encrypted, athlete-controlled
  - Coach sees "low energy period expected" not details

---

## Federation Level Seed Data Strategy

**MVP Federations:**
1. Skate Canada (primary market)
2. US Figure Skating (large market)
3. Philippine Skating Union (beta partner)

**Post-MVP:**
4. ISU generic levels
5. British Ice Skating
6. Australia
7. Others as requested

**Admin Interface for Levels:**
```python
# admin.py
@admin.register(SkaterLevel)
class SkaterLevelAdmin(admin.ModelAdmin):
    list_display = ['federation', 'level_code', 'display_name', 'sort_order']
    list_filter = ['federation', 'detail_level']
    search_fields = ['level_code', 'display_name']
    
    fieldsets = [
        ('Basic Info', {
            'fields': ['federation', 'level_code', 'display_name', 'sort_order']
        }),
        ('Capabilities', {
            'fields': ['can_do_doubles', 'can_do_triples', 'max_program_length_seconds']
        }),
        ('UI Settings', {
            'fields': ['detail_level']
        }),
    ]
```

**Import from CSV:**
```python
# management/commands/import_levels.py
class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        with open('levels.csv') as f:
            reader = csv.DictReader(f)
            for row in reader:
                SkaterLevel.objects.update_or_create(
                    federation_id=row['federation_id'],
                    level_code=row['level_code'],
                    defaults={
                        'display_name': row['display_name'],
                        'can_do_doubles': row['can_do_doubles'] == 'True',
                        'can_do_triples': row['can_do_triples'] == 'True',
                        'max_program_length_seconds': int(row['max_length']),
                        'detail_level': row['detail_level'],
                        'sort_order': int(row['sort_order'])
                    }
                )
```

---

## Summary of Changes to Plan

### Immediate (MVP):
1. ✅ Add SkaterLevel model (federation-aware)
2. ✅ Expand PlannedSession types (programs, clinics, shows)
3. ✅ Organization membership (no duplication)
4. ✅ Event planning features

### Design For (But Don't Build):
1. ⏭️ AI suggestions (need data first)
2. ⏭️ Weekly emails (need stable users first)
3. ⏭️ Auto-import results (fragile, PDF import enough for now)
4. ⏭️ Customizable dashboards (polish feature)

### Deferred Pricing:
- Remove all pricing from docs
- Test with beta users
- Determine based on value delivered

---

## Questions for You

1. **SkaterLevel complexity** - Should we tackle federation-specific levels in Week 1, or start simpler with just Skate Canada levels and add others later?

2. **Event planning** - Any other event types I'm missing? (Test sessions, choreography, music editing, clinics, shows... what else?)

3. **AI features** - Which would be most valuable to you as a coach?
   - AI weekly plan suggestions?
   - AI goal suggestions?
   - AI competition readiness prediction?
   - Something else?

4. **Sensitive tracking** - Thoughts on menstrual cycle tracking?
   - Very performance-relevant for female athletes
   - But EXTREMELY sensitive
   - Worth including or too risky?

---

## Ready to Start?

With these refinements, I think we have a complete, realistic plan that:
- ✅ Addresses real-world complexity (federation levels)
- ✅ Doesn't duplicate data (org membership)
- ✅ Plans beyond just training (events, programs)
- ✅ Designs for future (AI, automation)
- ✅ Stays focused on MVP (no pricing, no customization yet)

**Shall we begin Phase 0?** 🚀
