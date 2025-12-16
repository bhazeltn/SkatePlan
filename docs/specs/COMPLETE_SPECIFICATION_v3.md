# CoachOS v2 - Complete System Specification v3.0
**Figure Skating Coaching Platform - Production Ready**

*Last Updated: December 2024*
*Status: Ready for Implementation*

---

## Executive Summary

CoachOS v2 is a **federation-agnostic** figure skating coaching platform that enables coaches worldwide to plan, track, and analyze athlete development while promoting holistic athlete management across multiple disciplines.

**Core Innovation:** Treats the athlete as the central unit, aggregating training load across all disciplines to prevent overtraining and optimize development - regardless of which federation or level system they use.

**Universal Principle:** Works for ANY federation, anywhere. Enhanced features for supported federations.

---

## Table of Contents

1. [Core Principles](#1-core-principles)
2. [User Roles & Access](#2-user-roles--access)
3. [Data Architecture](#3-data-architecture)
4. [Federation Management](#4-federation-management)
5. [Key Features](#5-key-features)
6. [Technical Stack](#6-technical-stack)
7. [Implementation Roadmap](#7-implementation-roadmap)
8. [Security & Privacy](#8-security--privacy)
9. [Future Enhancements](#9-future-enhancements)

---

## 1. Core Principles

### 1.1 Design Philosophy

**Federation-Agnostic First:**
- Works for ANY federation without structured data
- Enhanced features when federation data available
- Never blocks usage due to missing federation info
- Graceful degradation always

**Mobile-First Always:**
- Coaches and athletes are at the rink
- Quick entry must work on phone (< 2 minutes)
- Progressive Web App (PWA), not native
- Offline-capable for spotty connections

**Holistic Over Siloed:**
- The athlete is the atomic unit, not the discipline
- All coaches see the complete picture
- Prevent overtraining through shared visibility
- Load management across all activities

**Data-Driven Development:**
- Plans connect to actual training data
- Analytics inform future planning
- Track progression, not just intentions
- Voice-powered entry for adoption

---

## 2. User Roles & Access

### Coach (Full Access)
- Create and manage athletes
- Build yearly/weekly plans for their discipline
- View all plans (all disciplines) for their athletes
- Log sessions, enter results
- Export reports
- Invite athletes/parents

### Skater (Collaborative Access)
- View all their plans across disciplines
- Log own sessions (especially when coach not present)
- Set and track goals (with approval)
- View analytics
- Receive notifications

### Guardian (Protected Access - Safe Sport)
- Read-only view of all training data
- Auto-notified for ALL communications
- Can comment/communicate
- Cannot edit plans or data
- Dashboard shows training load, activity

### Observer (Limited Access)
- Read-only for assessors, mentors
- Can be time-limited (NCCP portfolio review)
- No notifications
- No editing capability

### Collaborator (Peer Access)
- Another coach working with same athlete
- Can view all plans
- Can only edit their discipline's plans
- Full visibility of holistic weekly view

### Organization Admin (Federation/Club)
- Manage organization members
- View all organization athletes
- Generate reports
- Invite coaches/athletes
- Billing management

---

## 3. Data Architecture

### 3.1 Core Models

**User** - Authentication and roles
- email, password, full_name, phone_number
- role: Coach, Skater, Guardian, Observer
- organization memberships

**Skater** - The actual human being
- full_name, date_of_birth, gender, home_club
- is_active (for archiving)
- Links to User account (optional - for login)

**AthleteProfile** - Private/sensitive data (encrypted)
- emergency contacts, medical notes
- One-to-one with Skater

---

### 3.2 Federation Management (FLEXIBLE!)

**Federation** - Minimal record
- name, code, country_code
- support_tier (BASIC | ENHANCED | PARTNER)
- website, logo (optional)
- is_active

**FederationLevel** - Optional structured data
- federation, level_code, display_name
- sort_order (progression)
- capabilities (JSON - flexible for any federation)
  - can_do_singles/doubles/triples/quads
  - max_program_length_seconds
  - ui_detail_level (simple/intermediate/advanced)
  - age_restrictions
  - typical_elements
  - competition_categories
- data_source (URL for verification)
- verified, verified_by, verified_at

**FederationLevelContribution** - Community submissions
- submitted_by, submitted_at
- federation, level details
- data_source (REQUIRED)
- status (PENDING | APPROVED | REJECTED)
- reviewed_by, admin_notes

**KEY FEATURE:** Coaches can contribute federation data!

---

### 3.3 Planning Entities

**Concept:** An athlete can participate in multiple disciplines.
Each discipline is a separate "Planning Entity" with its own coach, plan, and progress.

**SinglesEntity**
- skater, federation
- current_level (CharField - FREE TEXT!)
- current_level_structured (FK to FederationLevel - OPTIONAL!)
- Helper: `get_level_capabilities()` - returns data or defaults

**SoloDanceEntity** - Solo dance career

**Team** - Pairs or Ice Dance team
- team_name, discipline (Pairs/Dance)
- partner_a, partner_b

**SynchroTeam** - Synchronized skating team
- team_name, roster (M2M with Skater)

**PlanningEntityAccess** - Permission model
- Links users to planning entities with access levels

---

### 3.4 Organization Model (Federations & Clubs)

**Organization**
- name, organization_type (FEDERATION | CLUB | ACADEMY)
- subscription_tier (pricing TBD)
- max_coaches, max_athletes
- primary_contact, billing_email

**OrganizationMembership** - NO DUPLICATION!
- organization, user, role (ADMIN | COACH | ATHLETE)
- When inviting existing user, just add membership
- Existing data and permissions unchanged
- Organization admin gets appropriate access

**OrganizationInvite**
- Invitation workflow with tokens
- Expires after set period

---

### 3.5 Planning Models

**AthleteSeason** - Container for a skater's season
- skater (or planning_entity)
- season, start_date, end_date
- primary_coach, is_active

**YearlyPlan (YTP)** - High-level plan for one discipline
- planning_entity (Generic FK)
- coach_owner
- athlete_seasons
- peak_type, primary_season_goal

**Macrocycle** - Training phase within YTP
- yearly_plan
- phase_title, phase_start, phase_end
- phase_focus, technical/component/physical/mental focus

**WeeklyPlan** - HOLISTIC weekly container
- athlete_season (links to PERSON, not discipline!)
- week_start (always Monday)
- theme, notes
- max_session_hours, max_session_count (coach-configured)

**PlannedSession** - Individual session within week
- weekly_plan, yearly_plan (which discipline)
- day_of_week, planned_time, planned_duration
- session_type (EXPANDED!)
  - Training: on_ice, off_ice, class, conditioning
  - Development: program_development, choreography, music_edit
  - Events: clinic, show, exhibition, test_session
  - Competition: competition, travel
  - Rest: rest, recovery
- event_name, event_location (for non-training)
- program (FK for program development)
- focus, planned_elements (flexible detail)
- created_by (coach), status

**SessionTemplate** - Reusable week templates
- yearly_plan, name
- template_sessions (JSON)

**Goal** - Trackable objectives
- planning_entity (Generic FK)
- title, goal_type, timeframe
- smart_description, progress_notes
- current_status (Draft, Pending, Approved, In Progress, etc.)
- approval workflow

---

### 3.6 Logging Models

**SessionLog** - Training session record
- session_date, session_time, location
- session_type
- author (who logged it)
- athlete_season (for holistic aggregation)
- planning_entity (which discipline)

**Wellbeing:**
- energy_stamina (1-5)
- session_rating (1-5 stars)
- sentiment_emoji
- wellbeing_focus_check_in (JSON array)

**Technical Tracking:**
- program_runs (JSON array)
  - Level 1 (Simple): program, type, music, quality
  - Level 2 (Checklist): + element statuses
  - Level 3 (Protocol): + GOE, scores
- element_attempts (JSON array)
  - element_code, attempts, successful
- jump_focus, spin_focus (JSON)

**Notes:**
- coach_notes, skater_notes
- voice_transcript (from voice notes)

**InjuryLog** - Health tracking
- skater (person level)
- injury_type, body_area (JSON array)
- date_of_onset, return_to_sport_date
- severity, recovery_status

**MeetingLog** - Non-practice meetings
- meeting_date, meeting_type (JSON array)
- skaters (M2M), participants
- summary_notes

---

### 3.7 Competition Models

**Competition** - Global event registry
- title, location_name, city, country
- start_date, end_date
- created_by

**CompetitionResult** - Performance record
- competition, planning_entity (Generic FK)
- status (Planned, Registered, Completed)
- level, placement, total_score
- segment_scores (JSON)
- detailed_protocol (JSON - element-by-element)
- detail_sheet (PDF upload - AUTO-PARSE!)
- video_url, notes

**SkaterTest** - Test tracking
- skater (person level)
- test_type, test_name, test_date
- status, result
- evaluator_notes, test_sheet, video_url

**Program** - Competitive program definition
- planning_entity (Generic FK)
- title, season, program_category
- music_title, choreographer, music_file
- est_base_value
- planned_elements (JSON array)
- is_active

**ProgramAsset** - Supporting files
- program (FK), file, asset_type

---

### 3.8 Communication Models

**Comment** - NOT YET IMPLEMENTED (Week 6)
- author, content (encrypted)
- parent_object (Generic FK - Goal, SessionLog, etc.)
- parent_comment (for threading)
- Safe Sport: Auto-notify guardians for minors

**Announcement** - NOT YET IMPLEMENTED
- title, content, timestamp
- author, planning_entities (M2M)

---

## 4. Federation Management

### 4.1 Three-Tier Support Model

**Tier 1: Universal (ALL Federations)**
- Works with free-text level entry
- All core features available
- Sensible defaults for UI
- No federation data required

**Tier 2: Enhanced (Supported Federations)**
- Structured level data available
- Level-specific UI complexity
- Element suggestions
- Program validation
- Progress pathways

**Tier 3: Partner (Custom Integration)**
- Custom branding
- Federation-specific reports
- Competition auto-import
- Bulk licensing
- Direct support

### 4.2 Initial Seed Data (Launch Day)

**Full Support (10 federations):**
1. Skate Canada - Primary market
2. US Figure Skating - Largest market
3. Philippine Skating Union - Beta partner
4. ISU - Generic international
5. British Ice Skating
6. Skate Australia
7. Ice Skating Institute (ISI)
8. Japan Skating Federation
9. Korean Skating Union
10. Skate Ontario (provincial test)

**Partial Support (20-30 federations):**
- Name and code only
- Major federations from all continents
- Enhanced as users request

### 4.3 Community Contribution Workflow

1. Coach selects unsupported federation
2. Sees: "We don't have data yet. Want to help?"
3. Fills contribution form with level details
4. **MUST provide data source** (URL to rulebook)
5. Admin reviews contribution (within 48 hours)
6. If approved, creates FederationLevel record
7. Coach notified, level now available

### 4.4 Data Management

**Management Commands:**
- `python manage.py seed_federations` - Seed from JSON
- `python manage.py import_levels_csv` - Bulk import from CSV
- `python manage.py verify_federation_data` - Check for updates

**Admin Interface:**
- View all federations (with level count indicator)
- Manage levels (add, edit, verify)
- Review contributions (approve/reject)
- Export to JSON (backup)

**Maintenance:**
- Quarterly review of federation websites
- Update data when rules change
- Community contributions fill gaps
- Federation partnerships for large markets

---

## 5. Key Features

### 5.1 Holistic Weekly Planning ⭐ FLAGSHIP

**Purpose:** Prevent overtraining by showing complete athlete load across ALL disciplines.

**Features:**
- Weekly grid view showing all planned sessions
- Color-coded by coach/discipline
- Real-time load calculations (hours, sessions, intensity)
- Alerts when approaching limits
- Planned vs. Actual comparison
- Multi-coach collaboration (view others' plans)
- Plan for ALL activities (training, choreography, shows, clinics, competitions)

**Session Types Supported:**
- Training: on-ice, off-ice, class, conditioning
- Development: new programs, choreography, music editing
- Events: clinics, seminars, ice shows, exhibitions, test sessions
- Competition: competitions, travel days
- Recovery: rest days, active recovery

**Load Calculation:**
- Different session types weighted differently
- Competition = HIGH load (1.5x)
- Show = moderate load (0.8x)
- Clinic = learning load (0.5x)
- Travel/rest = doesn't count toward load

---

### 5.2 Voice-Powered Session Logging ⭐ KEY DIFFERENTIATOR

**Purpose:** Make logging so fast and easy that skaters do it consistently.

**Workflow:**
1. Skater finishes practice
2. Opens app on phone
3. Taps mic button
4. Speaks 30-60 seconds describing session
5. AI extracts structured data (Whisper + GPT)
6. Reviews/edits before save
7. Full transcript preserved

**AI Extracts:**
- Duration, energy level, session rating
- Program runs (count, type, quality)
- Element attempts (with success counts)
- General notes

**Fallback:** Always allows manual entry if AI fails

---

### 5.3 PDF Protocol Auto-Import ⭐ ADOPTION HOOK

**Purpose:** Eliminate tedious data entry for competition results.

**Workflow:**
1. Upload PDF protocol (ISU format)
2. pdfplumber extracts:
   - Skater name, nation
   - Placement, total score
   - Segment scores (SP/FS)
   - Element-by-element (code, BV, GOE, score)
3. Review extracted data
4. Edit if needed
5. Save to system

**Supports:**
- ISU protocols
- IceCalc results
- Other standardized formats (add over time)

**Why it matters:** Coaches hate data entry. This feature alone drives adoption.

---

### 5.4 Multi-Coach Collaboration

**Scenario:** Skater trains Singles (Coach A) and Dance (Coach B)

**How it works:**
1. Coach A invites Coach B to athlete
2. Coach B gets "Collaborator" access
3. Both coaches see:
   - Holistic weekly view (all sessions)
   - Each other's plans (read-only)
   - Total training load
   - Potential conflicts
4. Each coach can only edit their discipline
5. Both can comment/communicate

**Organization scenario (PSU):**
- National coach invites foreign-based athletes
- Foreign coaches get full access (no requirements!)
- National coach sees dashboard of all athletes
- No data duplication when inviting existing users

---

### 5.5 Goal Management

**Workflow:**
- Skater or coach creates goal
- SMART format encouraged
- Link to planning entity (discipline)
- Set timeframe, target date
- Approval workflow (if skater-created)
- Regular progress updates
- Completed when achieved

**Integration:**
- Goals appear in weekly plan context
- Session logs can reference goals
- Analytics show goal completion rate
- Overdue goals in dashboard alerts

---

### 5.6 Safe Sport Compliance

**For Minors (< 18 years old):**
- System automatically identifies guardians
- ALL communication copied to guardians
- UI shows: "This will also be sent to [Guardian Name]"
- Comments, goals, notes - all copied
- Email notifications for all activity

**Comment System:**
- Thread on any object (Goal, SessionLog, WeeklyPlan)
- Content encrypted (django-cryptography)
- Email notifications
- Auto-copy to guardians for minors
- Transparent communication

---

### 5.7 Competition Tracking

**Simple Mode (MVP):**
- Select competition from calendar
- Enter placement, total score
- Segment scores (SP/FS)
- Link to program performed
- Upload protocol PDF (auto-parse!)
- Notes

**Advanced Mode (Future):**
- Element-by-element entry
- GOE for each element
- Calls (q, <<, e, !)
- Auto-calculate scores
- Compare to planned program
- Performance analysis

---

### 5.8 Analytics & Insights

**Personal Bests:**
- Highest scores (all-time, season)
- By segment (SP, FS)
- By level/category

**Progression Tracking:**
- Score over time (line chart)
- Element success rates
- Training volume trends
- Goal completion rate

**Load Analysis:**
- Weekly hours over time
- Sessions per week
- Recovery patterns
- Injury correlation

**Element Tracking:**
- Success rate per element (from element_attempts)
- Progression over weeks
- Comparison to goals

---

## 6. Technical Stack

### 6.1 Backend

**Framework:**
- Django 5.x + Django Rest Framework
- PostgreSQL (with JSONB for flexible fields)
- Redis (cache + Celery broker)
- Celery (async tasks)

**Infrastructure:**
- Docker + Docker Compose
- Nginx (reverse proxy)
- MinIO (S3-compatible object storage)

**AI/ML:**
- OpenAI Whisper (speech-to-text)
- OpenAI GPT-4 (data extraction from transcripts)
- Structured output mode for reliable parsing

**Email:**
- Brevo (formerly SendInBlue) via django-anymail
- Transactional emails for notifications
- Guardian auto-copy for Safe Sport

**File Processing:**
- pdfplumber (PDF protocol parsing)
- openpyxl (Excel export - NCCP YTP)
- python-docx (Word export)

**Security:**
- django-cryptography (field encryption)
- django-ratelimit (API rate limiting)
- django-cors-headers (CORS configuration)

### 6.2 Frontend

**Framework:**
- SvelteKit (simpler than React, better performance)
- TypeScript (type safety)
- Tailwind CSS (styling)
- shadcn-svelte (component library)

**PWA:**
- Service worker for offline capability
- Progressive Web App manifest
- IndexedDB for local storage
- Background sync for queued actions

**State Management:**
- Svelte stores (built-in)
- API client with caching

**Charts:**
- Chart.js or Recharts (analytics visualizations)

### 6.3 Development Tools

**Testing:**
- pytest (backend tests)
- Playwright (E2E tests)
- Coverage.py (code coverage)

**Code Quality:**
- black (Python formatting)
- flake8 (linting)
- isort (import sorting)
- ESLint + Prettier (JavaScript/TypeScript)

**CI/CD:**
- GitHub Actions
- Automated testing on PR
- Deployment to staging/production

**Monitoring:**
- Sentry (error tracking)
- Basic analytics (page views, usage)

---

## 7. Implementation Roadmap

### Phase 0: Backend Hardening (Week 1)

**Security & Testing:**
- [ ] Security audit (all endpoints)
- [ ] Rate limiting (django-ratelimit)
- [ ] Field encryption (PHI/PII)
- [ ] Comprehensive test suite (80%+ coverage)
- [ ] API documentation (drf-spectacular)

**Federation Support:**
- [ ] Federation + FederationLevel models
- [ ] FederationLevelContribution model
- [ ] Management commands (seed, import)
- [ ] Seed 10 full federations
- [ ] Seed 25 basic federations
- [ ] Admin interface for federation management

**Missing Models:**
- [ ] Organization + OrganizationMembership
- [ ] WeeklyPlan + PlannedSession
- [ ] SessionTemplate
- [ ] Comment model (encrypted)
- [ ] Announcement model

**Code Quality:**
- [ ] Pre-commit hooks
- [ ] Documentation (docstrings)
- [ ] Architecture decision records

---

### Phase 1: Frontend Foundation (Weeks 2-3)

**SvelteKit Setup:**
- [ ] Initialize project
- [ ] TypeScript configuration
- [ ] Tailwind CSS + shadcn-svelte
- [ ] PWA setup (manifest, service worker)

**Design System:**
- [ ] Color palette
- [ ] Typography scale
- [ ] Component library
- [ ] Mobile breakpoints

**Core Layouts:**
- [ ] Root layout (navigation, auth)
- [ ] Mobile navigation
- [ ] Dashboard layout
- [ ] Form layouts

**API Integration:**
- [ ] API client setup
- [ ] Authentication flow
- [ ] Error handling
- [ ] Loading states

---

### Phase 2: Core Features - Athletes & Sessions (Weeks 4-5)

**Athlete Management:**
- [ ] List athletes (card/table view)
- [ ] Create athlete (simple form)
- [ ] Federation selection (dropdown or free text)
- [ ] Level selection (dropdown if data available, else free text)
- [ ] Athlete dashboard
- [ ] Edit athlete profile

**Session Logging - Simple:**
- [ ] Quick log form (mobile-first)
- [ ] Date, duration, energy, rating
- [ ] Save to API
- [ ] View session history

**Session Logging - Detailed:**
- [ ] Program runs entry (3 levels of detail)
- [ ] Element attempts table
- [ ] Voice note recording
- [ ] Photo upload (optional)

**Calendar View:**
- [ ] Week view of sessions
- [ ] Month view
- [ ] Filter by athlete
- [ ] Visual load indicators

---

### Phase 3: Planning Features (Week 6)

**Yearly Plan (YTP):**
- [ ] Create YTP
- [ ] Add macrocycles (visual timeline)
- [ ] Link to goals
- [ ] Edit/update

**Weekly Plan:**
- [ ] Create weekly plan
- [ ] Add planned sessions (all types!)
- [ ] View multi-coach sessions
- [ ] Load alerts/warnings
- [ ] Template support

**Goals:**
- [ ] Create goal
- [ ] Approval workflow
- [ ] Progress tracking
- [ ] Link to sessions

**Comments (Safe Sport):**
- [ ] Comment threads
- [ ] Guardian auto-notification
- [ ] Email integration
- [ ] Encrypted content

---

### Phase 4: Competition Tracking (Week 7)

**Competition Registry:**
- [ ] Create competition (admin)
- [ ] List competitions (calendar)
- [ ] Competition detail view

**Results - Manual:**
- [ ] Simple entry (placement, score)
- [ ] Link to program
- [ ] Segment scores
- [ ] Notes

**PDF Protocol Import:** ⭐
- [ ] Upload PDF
- [ ] Parse with pdfplumber
- [ ] Extract scores/elements
- [ ] Review/edit before save
- [ ] Store original PDF

**Results Display:**
- [ ] Result cards
- [ ] Element-by-element table
- [ ] Score breakdown
- [ ] Download protocol

---

### Phase 5: Organization Features (Week 8)

**Organization Setup:**
- [ ] Create organization
- [ ] Admin dashboard
- [ ] Invite members (no duplication!)
- [ ] Manage roles

**Organization Dashboard:**
- [ ] Overview stats
- [ ] Athlete list (all org athletes)
- [ ] Recent activity feed
- [ ] Coach list

**Reports:**
- [ ] Session volume report
- [ ] Competition results summary
- [ ] Athlete progress report
- [ ] Export to PDF

**Access Control:**
- [ ] Organization-level permissions
- [ ] Athlete visibility rules
- [ ] Coach collaboration settings

---

### Phase 6: Voice & AI Features (Week 9)

**Voice Recording:**
- [ ] Browser MediaRecorder API
- [ ] Audio upload to server
- [ ] Progress indicator
- [ ] Playback preview

**Transcription:**
- [ ] Whisper API integration
- [ ] Async processing (Celery)
- [ ] Store transcript

**Data Extraction:**
- [ ] GPT-4 structured output
- [ ] Extract session fields
- [ ] Extract program runs
- [ ] Extract elements

**Review UI:**
- [ ] Show extracted data
- [ ] Edit before save
- [ ] Confidence indicators
- [ ] Manual fallback

---

### Phase 7: Polish & Testing (Week 10)

**Mobile Optimization:**
- [ ] Touch targets (44px minimum)
- [ ] Keyboard handling
- [ ] Gesture support
- [ ] Performance (Lighthouse >90)

**Accessibility:**
- [ ] Semantic HTML
- [ ] ARIA labels
- [ ] Keyboard navigation
- [ ] Screen reader testing

**Testing:**
- [ ] End-to-end tests (Playwright)
- [ ] User acceptance testing
- [ ] Cross-browser testing
- [ ] Mobile device testing

**Documentation:**
- [ ] User guide
- [ ] Video tutorials
- [ ] FAQ
- [ ] Support documentation

**Deployment:**
- [ ] Production environment
- [ ] SSL/HTTPS
- [ ] Monitoring (Sentry)
- [ ] Backup strategy

---

## 8. Security & Privacy

### 8.1 Data Classification

**Public Data:**
- Competition results (public record)
- Programs (public performances)
- Federation info

**Private Data (Encrypted):**
- Session logs
- Coach notes
- Goals
- Comments
- Injury logs

**Sensitive Data (Extra Protected):**
- AthleteProfile (emergency contacts, medical)
- Date of birth (for minors)
- Contact information

### 8.2 Encryption

```python
from django_cryptography.fields import encrypt

class SessionLog(models.Model):
    # Public
    session_date = DateField()
    session_type = CharField()
    
    # Encrypted
    coach_notes = encrypt(TextField())
    skater_notes = encrypt(TextField())
    
class Comment(models.Model):
    content = encrypt(TextField())
```

### 8.3 GDPR/Privacy Compliance

**User Rights:**
- Right to access data
- Right to export data
- Right to delete data
- Right to be forgotten

**Implementation:**
- API endpoint for data export (JSON)
- Admin action for data deletion
- Anonymization for referenced data
- Clear privacy policy

**Privacy Policy Required Sections:**
- What data we collect
- Why we collect it
- Who can see it
- How long we keep it
- How to delete it

### 8.4 Rate Limiting

```python
from django_ratelimit.decorators import ratelimit

@ratelimit(key='user', rate='100/h', method='POST')
def create_session_log(request):
    # Prevent abuse
    pass
```

---

## 9. Future Enhancements (Post-MVP)

### Phase 11: AI Suggestions
- Weekly plan suggestions based on phase, goals, recent training
- Goal suggestions based on progression
- Competition readiness predictions
- Training adjustment recommendations

### Phase 12: Automated Communications
- Weekly summary emails to coaches/athletes/parents
- Upcoming competition reminders
- Goal deadline notifications
- Training milestone celebrations

### Phase 13: Advanced Competition Features
- Auto-import results from IceCalc, O2CM, ISU
- Performance prediction models
- Competitor analysis
- Historical comparison

### Phase 14: Customization
- Customizable dashboards (drag-drop widgets)
- Custom reports
- Branded export templates
- White-label options (for federations)

### Phase 15: Mobile Polish
- Offline mode (full sync)
- Push notifications
- Camera integration (for protocols)
- Native app considerations

### Phase 16: Federation Partnerships
- Federation-specific branding
- Direct data management
- Competition auto-import from federation systems
- Bulk licensing for national teams
- Priority support channel

---

## Success Metrics

### Adoption Metrics
- Active coaches (weekly login)
- Athletes logging sessions (weekly)
- Sessions logged per athlete per week
- % of planned sessions actually logged

### Engagement Metrics
- Time to log a session (target: <2 min)
- Voice note usage rate
- Multi-coach adoptions
- Comments/collaboration activity

### Value Metrics
- Load alerts triggered
- Injuries prevented (self-reported)
- Coach satisfaction (NPS score)
- Time saved vs. Excel/paper

### Federation Coverage
- % of users with federation support (target: 80%)
- # of federations with full data (target: 15 by launch)
- # of community contributions per month
- Federation partnership count

---

## Conclusion

CoachOS v2 is positioned to become the standard platform for figure skating coaching worldwide by:

✅ Working for ANY federation (with enhancement for supported ones)
✅ Preventing overtraining through holistic load management
✅ Making daily logging effortless (voice notes, PDF import)
✅ Enabling multi-coach collaboration
✅ Supporting organization-level oversight
✅ Ensuring Safe Sport compliance
✅ Growing through community contributions

**The path forward is clear. Implementation begins Week 1.**

---

*End of Specification v3.0*

