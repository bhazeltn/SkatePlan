Hi! I'm starting a major refactor of this Django/React figure skating coaching platform called SkatePlan.
PROJECT CONTEXT:
This is an existing Django backend + React frontend project that's about 60-70% complete. We're keeping the Django backend architecture but:
1. Auditing and hardening security
2. Refactoring data models to align with new federation-agnostic approach
3. Adding missing models per updated specification
4. Achieving 80%+ test coverage
5. Eventually rebuilding the frontend in SvelteKit (Phase 1+)

COMPREHENSIVE DOCUMENTATION:
I've placed extensive specifications in docs/:

PRIMARY SPECIFICATIONS:
- docs/COMPLETE_SPECIFICATION_v3.md - Master specification for entire system
- docs/comprehensive_federation_plan.md - Federation-agnostic architecture strategy (critical!)
- docs/CODE_STYLE_GUIDELINES.md - Code standards you must follow

DETAILED FEATURE SPECS:
- docs/weekly_plan_spec.md - Holistic weekly planning (flagship feature)
- docs/session_logging_ui_spec.md - Session logging with voice AI and program tracking
- docs/design_decisions.md - All architectural decisions with rationale

IMPLEMENTATION PLANS:
- docs/FINAL_IMPLEMENTATION_PLAN.md - Complete 10-week roadmap
- docs/PLAN_ADDENDUM.md - Additional design clarifications and refinements

PROCESS DOCUMENTATION:
- docs/HANDOFF_CHECKLIST.md - What we're doing and why
- docs/CLAUDE_CODE_SETUP_GUIDE.md - Setup reference

CRITICAL ARCHITECTURAL PRINCIPLES:
1. Federation-agnostic: Must work for ANY skating federation globally without structured data
2. Free-text level entry with OPTIONAL enhancement when federation data available
3. The athlete is the atomic unit (holistic load management across disciplines)
4. No data duplication when inviting existing users to organizations
5. Plan for ALL activities (training, choreography, shows, clinics, competitions, rest)
6. Mobile-first PWA (not native apps)

YOUR TASK - PHASE 0: BACKEND HARDENING (Week 1 of 10):

Step 1: THOROUGHLY read these files (in order):
1. docs/COMPLETE_SPECIFICATION_v3.md - Understand the full vision
2. docs/comprehensive_federation_plan.md - Critical federation strategy
3. docs/CODE_STYLE_GUIDELINES.md - Standards to follow

Step 2: EXPLORE the current codebase:
1. Show me project directory structure (tree view, 3 levels)
2. List ALL Django models in backend/api/models.py (with brief description of each)
3. Show me what's in backend/requirements.txt or pyproject.toml
4. Show me docker-compose.yml structure
5. Check if tests exist and what coverage is
6. Check for any existing security measures (rate limiting, encryption, etc.)

Step 3: CREATE COMPREHENSIVE AUDIT (save as docs/PHASE_0_AUDIT_REPORT.md):

MODELS ANALYSIS:
- What models exist vs. specified
- What's missing (Federation, Organization, WeeklyPlan, PlannedSession, etc.)
- What needs modification to align with spec
- Data model gaps or inconsistencies

FEDERATION APPROACH:
- Current level handling (is it flexible or rigid?)
- Does it support free-text entry with optional enhancement?
- Changes needed for federation-agnostic approach

SECURITY ASSESSMENT:
- Current security measures
- What's missing (rate limiting, field encryption, CORS, etc.)
- Permission/access control gaps
- Vulnerabilities to address

TESTING:
- Current test coverage percentage
- What's tested vs. not tested
- Testing framework setup
- Gaps in test infrastructure

CODE QUALITY:
- Adherence to Python/Django best practices
- Type hints usage
- Documentation/docstrings
- Code organization
- Technical debt

PHASE 0 PRIORITY TASKS:
Based on your analysis, create a prioritized task list for Phase 0 with:
- Task name
- Why it's critical
- Estimated complexity
- Dependencies
- Suggested order

Step 4: SUMMARY
Give me a 5-minute verbal summary of:
- Current state (what's good, what needs work)
- Top 5 critical priorities
- Any major concerns or red flags
- Recommended approach for Phase 0

Take your time with this. Quality and thoroughness are more important than speed. This audit will guide all of Phase 0.

Ready to begin?