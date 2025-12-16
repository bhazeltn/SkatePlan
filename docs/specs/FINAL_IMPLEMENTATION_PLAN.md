# CoachOS v2 - Final Decisions & Implementation Roadmap

## Final Design Decisions (December 2024)

### 1. Federation/Foreign Coach Model ✅

**Decision:** Full access, zero requirements

**Implementation:**
- Foreign coaches have complete Coach role (not limited)
- Can create plans if they want, but not required
- Skaters can log sessions without any plan existing
- Federation admin just has visibility/oversight

**Use Case - Philippine Skating Union:**
```
Scenario: Fil-Can skater training in Canada with Canadian coach

Actors:
- PSU National Head Coach (Admin - oversight)
- Canadian Head Coach (Full Coach access)
- Skater (Full Skater access)

Flow:
1. PSU Admin creates Organization
2. Adds Skater to organization
3. Invites Canadian Coach (grants full Coach access)
4. Canadian Coach can:
   - Create full YTP if they want
   - OR just view skater's self-logged sessions
   - No requirement either way
5. PSU Admin sees:
   - Dashboard of all PSU athletes
   - Session logs from all athletes
   - Competition results
   - Can generate reports
```

**Key principle:** Zero friction for adoption. If foreign coach uses tool, great. If not, skater can still log, PSU still gets visibility.

---

### 2. Element Autocomplete ✅

**For Program Runs:**
- Auto-load planned elements from Program.planned_elements
- Display as editable checklist
- Coach/skater marks what was actually done
- Can add elements not in original plan

**UI:**
```
Program Run: Short Program
┌─────────────────────────────────┐
│ Planned Elements:               │
│ ✓ 2A        [Clean ▼]          │
│ ✓ 3Lz+2T    [UR on 3Lz ▼]     │
│ ✓ FSSp4     [Level 3 ▼]        │
│ ✗ 3F        [Popped]           │
│                                 │
│ + Add element (not planned)     │
└─────────────────────────────────┘
```

**For Individual Element Tracking:**
- Free-form entry
- Autocomplete from SkatingElement table
- Recent elements appear first
- Can type custom codes if needed

---

### 3. Success Criteria ✅

**Decision:** Keep it simple - "Landed" = Success

**Implementation:**
```python
# element_attempts structure
{
  "element_code": "3Lz",
  "attempts": 10,
  "successful": 7,  # Landed cleanly
  "notes": "2 under-rotated, 1 fall"  # Optional
}
```

**UI shows:**
```
3Lz: 7/10 (70%) ✓ landed
```

**Advanced (optional):**
- Can add quality notes ("2 UR, 1 fall")
- But not required
- Analytics work on simple success rate

---

### 4. Program Run Notes - Flexible Detail Levels ✅

**Decision:** Three levels of detail, coach/skater chooses

**Level 1: Simple (Default)**
```json
{
  "program_id": 12,
  "program_title": "Short Program",
  "run_type": "Full",
  "music": true,
  "quality": 4,
  "notes": "Good run, tired at end"
}
```

**Level 2: Element Checklist**
```json
{
  "program_id": 12,
  "elements": [
    {"element": "2A", "status": "clean"},
    {"element": "3Lz+2T", "status": "UR on 3Lz"},
    {"element": "FSSp", "status": "level 3"}
  ]
}
```

**Level 3: Full Protocol (Advanced)**
```json
{
  "program_id": 12,
  "elements": [
    {
      "element": "2A",
      "base_value": 3.30,
      "goe": 1,
      "score": 3.96,
      "calls": []
    }
  ],
  "total_score": 45.67
}
```

**UI adapts to skater level:**
- STAR 2: Only Level 1 available
- Pre-Novice: Levels 1-2
- Senior: All levels available

**Implementation:**
```python
def get_available_detail_levels(skater):
    """Return which detail levels this skater can use"""
    if skater.level in ['STAR_1', 'STAR_2', 'STAR_3']:
        return ['simple']
    elif skater.level in ['STAR_4', 'STAR_5', 'PRE_NOVICE']:
        return ['simple', 'checklist']
    else:
        return ['simple', 'checklist', 'protocol']
```

---

### 5. Offline Mode for PWA ✅

**Decision:** Smart caching, not full offline database

**Rationale:**
- Full SQLite sync is complex and error-prone
- PWAs have good caching strategies
- Most coaches have wifi/data at rink
- Focus on "spotty connection" not "no connection"

**Implementation Strategy:**

**Service Worker Caching:**
```javascript
// cache-strategy.js
const CACHE_NAME = 'coachos-v1';
const OFFLINE_URL = '/offline.html';

// Cache static assets
const STATIC_ASSETS = [
  '/',
  '/styles.css',
  '/app.js',
  '/offline.html'
];

// Network-first for API calls
async function fetchWithCache(request) {
  try {
    const response = await fetch(request);
    // Cache successful responses
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    // Return cached version if offline
    return caches.match(request);
  }
}
```

**Offline Session Logging:**
```javascript
// If offline, store in IndexedDB
if (!navigator.onLine) {
  // Save to IndexedDB
  await saveToIndexedDB('pending-sessions', sessionData);
  
  // Show user feedback
  showNotification('Session saved locally. Will sync when online.');
  
  // Register sync
  if ('serviceWorker' in navigator && 'sync' in registration) {
    await registration.sync.register('sync-sessions');
  }
}

// When back online, sync
self.addEventListener('sync', async (event) => {
  if (event.tag === 'sync-sessions') {
    const pending = await getPendingFromIndexedDB();
    for (const session of pending) {
      await fetch('/api/sessions/', {
        method: 'POST',
        body: JSON.stringify(session)
      });
    }
  }
});
```

**What works offline:**
- View previously loaded data (cached)
- Record voice notes (stored locally)
- Fill out session log forms (saved to IndexedDB)
- View cached pages

**What requires connection:**
- Submitting new data
- Loading new data
- Voice transcription (needs API)
- Real-time updates

**User experience:**
```
[OFFLINE MODE]
You're offline. You can:
✓ View cached data
✓ Record voice notes (will process later)
✓ Fill out session logs (will save when online)

✗ Cannot load new data
✗ Cannot submit right now

Your changes will sync automatically when connection returns.
```

---

### 6. Frontend Framework ✅

**Decision: SvelteKit**

**Rationale:**
- Simpler than React
- Better performance (especially mobile)
- Built-in routing, forms, API routes
- SSR + client-side hydration
- TypeScript support
- Smaller bundle size

**Project Structure:**
```
frontend-v2/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── ui/           # shadcn-svelte components
│   │   │   ├── session/      # Session logging components
│   │   │   ├── planning/     # Planning components
│   │   │   └── shared/       # Shared components
│   │   ├── stores/           # Svelte stores (state)
│   │   ├── api.js            # API client
│   │   └── utils/            # Utilities
│   ├── routes/
│   │   ├── +layout.svelte    # Root layout
│   │   ├── +page.svelte      # Home
│   │   ├── athletes/
│   │   │   ├── [id]/
│   │   │   │   ├── +page.svelte        # Athlete dashboard
│   │   │   │   ├── +page.server.js     # SSR data loading
│   │   │   │   ├── sessions/
│   │   │   │   ├── goals/
│   │   │   │   └── competitions/
│   │   ├── planning/
│   │   ├── competitions/
│   │   └── settings/
│   └── app.html
├── static/
│   ├── manifest.json         # PWA manifest
│   └── service-worker.js     # PWA service worker
└── svelte.config.js
```

---

### 7. Organization Model (Federation/Club) ✅

**Decision:** Flexible organization structure for federations AND clubs

**Data Model:**
```python
class Organization(models.Model):
    """
    Represents a federation, club, or academy.
    Can have multiple coaches and athletes.
    """
    
    class OrganizationType(models.TextChoices):
        FEDERATION = 'FEDERATION', 'National Federation'
        CLUB = 'CLUB', 'Skating Club'
        ACADEMY = 'ACADEMY', 'Training Academy'
    
    id = AutoField(primary_key=True)
    name = CharField(max_length=255)  # "Philippine Skating Union"
    organization_type = CharField(choices=OrganizationType.choices)
    
    # Billing
    subscription_tier = CharField(choices=[
        ('FREE', 'Free'),
        ('BASIC', 'Basic - $50/month'),
        ('PRO', 'Pro - $200/month'),
        ('FEDERATION', 'Federation - $500/month')
    ])
    
    # Settings
    max_coaches = IntegerField(null=True)  # null = unlimited
    max_athletes = IntegerField(null=True)
    
    # Contact
    primary_contact = ForeignKey(User, on_delete=SET_NULL, null=True)
    billing_email = EmailField()
    
    created_at = DateTimeField(auto_now_add=True)
    is_active = BooleanField(default=True)


class OrganizationMembership(models.Model):
    """
    Links users (coaches, athletes) to an organization.
    Defines their role within the organization.
    """
    
    class OrgRole(models.TextChoices):
        ADMIN = 'ADMIN', 'Administrator'
        COACH = 'COACH', 'Coach'
        ATHLETE = 'ATHLETE', 'Athlete'
    
    organization = ForeignKey(Organization, on_delete=CASCADE)
    user = ForeignKey(User, on_delete=CASCADE)
    role = CharField(choices=OrgRole.choices)
    
    joined_at = DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('organization', 'user')


class OrganizationInvite(models.Model):
    """
    Invitations to join an organization.
    """
    organization = ForeignKey(Organization, on_delete=CASCADE)
    email = EmailField()
    role = CharField(choices=OrganizationMembership.OrgRole.choices)
    
    invited_by = ForeignKey(User, on_delete=CASCADE)
    token = UUIDField(default=uuid.uuid4, unique=True)
    expires_at = DateTimeField()
    accepted_at = DateTimeField(null=True, blank=True)
```

**Use Cases:**

**PSU (Federation):**
```
Philippine Skating Union (FEDERATION tier - $500/month)
├── Admin: National Head Coach
├── Coaches (10):
│   ├── Domestic Coach 1 (full access)
│   ├── Domestic Coach 2 (full access)
│   ├── Foreign Coach A (full access, optional use)
│   └── ...
└── Athletes (50):
    ├── Domestic (40) - coached by domestic coaches
    └── Foreign-based (10) - coached by foreign coaches
```

**All Star FSC (Club):**
```
All Star FSC (CLUB tier - $500/month)
├── Admin: Club Manager
├── Coaches (15):
│   ├── Full-time coaches (8)
│   └── Part-time/specialist coaches (7)
└── Athletes (120):
    ├── Competitive program (50)
    └── Recreational (70)
```

**Dashboard for Organization Admin:**
```
┌────────────────────────────────────────────────┐
│ Philippine Skating Union                       │
│ Federation Plan - $500/month                   │
├────────────────────────────────────────────────┤
│ Overview:                                      │
│ • 10 coaches                                   │
│ • 50 athletes                                  │
│ • 1,234 sessions logged this month             │
│                                                │
│ ┌──────────────┬──────────────┬──────────────┐│
│ │ Domestic     │ Foreign-Based│ Totals       ││
│ ├──────────────┼──────────────┼──────────────┤│
│ │ 40 athletes  │ 10 athletes  │ 50 athletes  ││
│ │ 890 sessions │ 344 sessions │ 1234 sessions││
│ │ 8 coaches    │ 2 coaches    │ 10 coaches   ││
│ └──────────────┴──────────────┴──────────────┘│
│                                                │
│ Recent Activity:                               │
│ • John Doe logged session (2 hours ago)        │
│ • Jane Smith: 1st @ Canadian Sectionals        │
│ • Coach Martinez requested access to Maria     │
│                                                │
│ [View All Athletes] [Manage Coaches]           │
│ [Export Report] [Billing]                      │
└────────────────────────────────────────────────┘
```

**Pricing Tiers:**
```
Individual Coach: $20/month
  - Up to 20 athletes
  - Full features
  - No organization dashboard

Club/Academy: $200-500/month
  - Unlimited coaches
  - Unlimited athletes
  - Organization dashboard
  - Bulk reports
  - Priority support

Federation: Custom pricing
  - All club features
  - Multi-region support
  - Custom branding
  - API access
  - Dedicated support
```

---

## Implementation Roadmap

### Phase 0: Backend Hardening (Week 1)
**Goal:** Rock-solid, tested, secure backend

**Tasks:**
1. Security audit
   - [ ] Review all API endpoints for permission checks
   - [ ] Add rate limiting (django-ratelimit)
   - [ ] Audit encryption (PHI/PII fields)
   - [ ] CSRF/CORS configuration review
   - [ ] Add API key authentication for organizations

2. Test coverage
   - [ ] Model tests (all models)
   - [ ] API endpoint tests (all views)
   - [ ] Permission logic tests
   - [ ] Set up pytest + coverage
   - [ ] Target: 80%+ coverage

3. Documentation
   - [ ] API documentation (drf-spectacular)
   - [ ] Model docstrings
   - [ ] Architecture decision records
   - [ ] Setup/deployment docs

4. Missing models
   - [ ] Comment (with encryption)
   - [ ] Announcement
   - [ ] WeeklyPlan + PlannedSession
   - [ ] Organization + OrganizationMembership
   - [ ] Run migrations

5. Code quality
   - [ ] Set up pre-commit hooks (black, flake8, isort)
   - [ ] Type hints where critical
   - [ ] Remove dead code
   - [ ] Refactor kludges

**Deliverable:** Production-ready backend API

---

### Phase 1: Frontend Foundation (Weeks 2-3)
**Goal:** SvelteKit setup with design system

**Tasks:**
1. Project setup
   - [ ] Initialize SvelteKit project
   - [ ] TypeScript configuration
   - [ ] Tailwind CSS + shadcn-svelte
   - [ ] PWA setup (manifest, service worker)
   - [ ] Environment configuration

2. Design system
   - [ ] Color palette (figure skating themed)
   - [ ] Typography scale
   - [ ] Component library (buttons, forms, cards)
   - [ ] Mobile breakpoints
   - [ ] Dark mode (optional)

3. Core layouts
   - [ ] Root layout (navigation, auth)
   - [ ] Mobile navigation
   - [ ] Dashboard layout
   - [ ] Form layouts

4. API integration
   - [ ] API client setup
   - [ ] Authentication flow
   - [ ] Error handling
   - [ ] Loading states

**Deliverable:** Styled, functional shell with auth

---

### Phase 2: Core Features - Athletes & Sessions (Weeks 4-5)
**Goal:** Essential daily-use features

**Tasks:**
1. Athlete management
   - [ ] List athletes (card/table view)
   - [ ] Create athlete (simple form)
   - [ ] Athlete dashboard
   - [ ] Edit athlete profile

2. Session logging - Simple
   - [ ] Quick log form (mobile-first)
   - [ ] Date, duration, energy, rating
   - [ ] Save to API
   - [ ] View session history

3. Session logging - Detailed
   - [ ] Program runs entry
   - [ ] Element attempts table
   - [ ] Voice note recording
   - [ ] Photo upload (optional)

4. Calendar view
   - [ ] Week view of sessions
   - [ ] Month view
   - [ ] Filter by athlete
   - [ ] Visual load indicators

**Deliverable:** Coaches can log sessions daily

---

### Phase 3: Planning Features (Week 6)
**Goal:** Season and weekly planning

**Tasks:**
1. Yearly Plan (YTP)
   - [ ] Create YTP
   - [ ] Add macrocycles (visual timeline)
   - [ ] Link to goals
   - [ ] Edit/update

2. Weekly Plan
   - [ ] Create weekly plan
   - [ ] Add planned sessions
   - [ ] View multi-coach sessions
   - [ ] Load alerts/warnings

3. Goals
   - [ ] Create goal
   - [ ] Approval workflow
   - [ ] Progress tracking
   - [ ] Link to sessions

**Deliverable:** Coaches can plan seasons and weeks

---

### Phase 4: Competition Tracking (Week 7)
**Goal:** Competition management with PDF import

**Tasks:**
1. Competition registry
   - [ ] Create competition (admin)
   - [ ] List competitions (calendar)
   - [ ] Competition detail view

2. Competition results - Manual
   - [ ] Simple entry (placement, score)
   - [ ] Link to program
   - [ ] Segment scores
   - [ ] Notes

3. PDF Protocol Import ⭐
   - [ ] Upload PDF
   - [ ] Parse with pdfplumber
   - [ ] Extract scores/elements
   - [ ] Review/edit before save
   - [ ] Store original PDF

4. Results display
   - [ ] Result cards
   - [ ] Element-by-element table
   - [ ] Score breakdown
   - [ ] Download protocol

**Deliverable:** PDF import working (killer feature!)

---

### Phase 5: Organization Features (Week 8)
**Goal:** Federation/club management

**Tasks:**
1. Organization setup
   - [ ] Create organization
   - [ ] Admin dashboard
   - [ ] Invite members
   - [ ] Manage roles

2. Organization dashboard
   - [ ] Overview stats
   - [ ] Athlete list (all org athletes)
   - [ ] Recent activity feed
   - [ ] Coach list

3. Reports
   - [ ] Session volume report
   - [ ] Competition results summary
   - [ ] Athlete progress report
   - [ ] Export to PDF

4. Access control
   - [ ] Organization-level permissions
   - [ ] Athlete visibility rules
   - [ ] Coach collaboration settings

**Deliverable:** PSU-ready organization features

---

### Phase 6: Voice & AI Features (Week 9)
**Goal:** AI-powered session logging

**Tasks:**
1. Voice recording
   - [ ] Browser MediaRecorder API
   - [ ] Audio upload to server
   - [ ] Progress indicator
   - [ ] Playback preview

2. Transcription
   - [ ] Whisper API integration
   - [ ] Async processing (Celery)
   - [ ] Store transcript

3. Data extraction
   - [ ] GPT-4 structured output
   - [ ] Extract session fields
   - [ ] Extract program runs
   - [ ] Extract elements

4. Review UI
   - [ ] Show extracted data
   - [ ] Edit before save
   - [ ] Confidence indicators
   - [ ] Manual fallback

**Deliverable:** Voice-to-log working

---

### Phase 7: Polish & Testing (Week 10)
**Goal:** Production-ready for beta

**Tasks:**
1. Mobile optimization
   - [ ] Touch targets (44px minimum)
   - [ ] Keyboard handling
   - [ ] Gesture support
   - [ ] Performance (Lighthouse score >90)

2. Accessibility
   - [ ] Semantic HTML
   - [ ] ARIA labels
   - [ ] Keyboard navigation
   - [ ] Screen reader testing

3. Testing
   - [ ] End-to-end tests (Playwright)
   - [ ] User acceptance testing
   - [ ] Cross-browser testing
   - [ ] Mobile device testing

4. Documentation
   - [ ] User guide
   - [ ] Video tutorials
   - [ ] FAQ
   - [ ] Support documentation

5. Deployment
   - [ ] Production environment setup
   - [ ] SSL/HTTPS
   - [ ] Monitoring (Sentry)
   - [ ] Backup strategy

**Deliverable:** Beta launch ready!

---

## Multi-Agent Development Team Structure

### Phase 0-1: Single Agent (Claude Code)
**Scope:** Backend hardening, initial setup
**Why:** Need coherent architecture decisions, security audit requires context

### Phase 2+: Multi-Agent Team

**Project Manager Agent (Claude/ChatGPT)**
- Coordinates other agents
- Maintains backlog
- Reviews PRs
- Resolves conflicts
- Updates documentation

**Backend Agent (Claude)**
- Django models
- DRF serializers/views
- Business logic
- Database queries
- API endpoints

**Frontend Agent (v0.dev / Cursor / Claude)**
- Svelte components
- UI/UX implementation
- Responsive design
- Forms
- Client-side logic

**Data Agent (Claude)**
- PDF parsing
- Data import/export
- Analytics calculations
- Reporting
- Database migrations

**Testing Agent (Claude/GitHub Copilot)**
- Write tests for backend
- Write tests for frontend
- E2E tests
- Performance testing
- Bug reproduction

**Security Agent (Claude)**
- Security audits
- Permission logic review
- Encryption verification
- Vulnerability scanning
- GDPR compliance

**Privacy Agent (Claude)**
- Data classification
- Privacy policy updates
- Consent management
- Data retention
- Right to deletion

### Communication Protocol

**Daily Standup (Async):**
Each agent reports:
- What I completed yesterday
- What I'm working on today
- Any blockers

**PR Review Process:**
1. Agent creates feature branch
2. Agent submits PR with description
3. PM Agent reviews for conflicts
4. Security Agent reviews if touching sensitive code
5. Testing Agent verifies tests pass
6. PM Agent merges

**Documentation:**
- Each agent updates docs for their changes
- PM Agent maintains master spec
- Architecture decisions recorded

---

## Success Metrics

### For Beta Launch:
- [ ] 5+ coaches actively using (weekly login)
- [ ] 100+ sessions logged
- [ ] 50+ competition results entered
- [ ] 20+ PDF protocols successfully imported
- [ ] <2 min average time to log session
- [ ] >80% mobile users (prove mobile-first works)
- [ ] 0 critical security issues
- [ ] <3 sec page load on mobile

### For PSU Pilot:
- [ ] 10 athletes onboarded
- [ ] 3+ coaches using regularly
- [ ] Federation admin dashboard functional
- [ ] Weekly reports generated
- [ ] Positive feedback from National Head Coach

---

## Risk Mitigation

### Technical Risks:
**Risk:** PDF parsing fails for non-ISU formats
**Mitigation:** Manual entry always available, improve parser iteratively

**Risk:** Voice transcription inaccurate
**Mitigation:** Always show transcript for review, manual edit always possible

**Risk:** Offline mode conflicts
**Mitigation:** Simple conflict resolution (last-write-wins), show warnings

### Adoption Risks:
**Risk:** Coaches don't see value
**Mitigation:** PDF import as hook, free trial, excellent onboarding

**Risk:** Too complex for non-technical coaches
**Mitigation:** Mobile-first simple UI, video tutorials, good defaults

**Risk:** Cost-averse coaches won't pay
**Mitigation:** Free tier with limits, prove value first, fair pricing

---

## Next Steps

**This Week:**
1. ✅ Finalize decisions (DONE)
2. ⏭️ You: Set up dev environment
3. ⏭️ Me: Backend audit begins (Claude Code)

**Next Week:**
4. Backend hardening
5. SvelteKit project setup
6. Design system foundation

**Week 3:**
7. Core features implementation begins
8. Multi-agent team activates

**Week 10:**
9. Beta launch with PSU

---

## Questions Resolved ✅

All open questions from earlier documents are now answered:
- ✅ Federation model structure
- ✅ Element autocomplete behavior
- ✅ Success criteria definition
- ✅ Program run detail levels
- ✅ Offline mode strategy
- ✅ Frontend framework choice
- ✅ Organization/club pricing model
- ✅ Multi-agent development approach

**We're ready to build!** 🚀

