# Federation Management - Comprehensive Strategy

## Philosophy: Federation-Agnostic with Optional Enhancement

**Core Principle:** The tool MUST work for any federation, anywhere, even ones we've never heard of. Federation-specific features are enhancements, not requirements.

---

## Three-Tier Federation Support Model

### Tier 1: Universal (ALL Federations)
**Features that work without federation data:**
- Session logging
- Weekly planning
- Goal tracking
- Competition results entry
- Basic analytics
- Coach-athlete collaboration

**How:** Free-text level entry, sensible defaults for all UI

### Tier 2: Enhanced (Supported Federations)
**Additional features when we have federation data:**
- Level-specific UI (appropriate complexity)
- Element suggestions based on level
- Test tracking (if federation has tests)
- Validation (program length limits, element restrictions)
- Progress pathways (what's next after this level)

**How:** Structured FederationLevel data in database

### Tier 3: Full Integration (Partner Federations)
**Premium features for federations that partner with us:**
- Custom branding
- Federation-specific reports
- Competition import from federation systems
- Bulk licensing for national teams
- Direct support channel
- Federation-managed coach accounts

**How:** Custom development, partnership agreement

---

## Data Architecture

### Core Models

```python
class Federation(models.Model):
    """
    Minimal federation record. 
    We can add ANY federation without knowing details.
    """
    id = AutoField(primary_key=True)
    name = CharField(max_length=255)
    code = CharField(max_length=10, unique=True)  # ISO 3-letter or custom
    country_code = CharField(max_length=2, blank=True)  # ISO country
    
    # Optional metadata
    website = URLField(blank=True, null=True)
    logo = ImageField(blank=True, null=True)
    
    # Status
    is_active = BooleanField(default=True)
    support_tier = CharField(max_length=20, choices=[
        ('BASIC', 'Basic - Name only'),
        ('ENHANCED', 'Enhanced - Full level data'),
        ('PARTNER', 'Partner - Custom integration')
    ], default='BASIC')
    
    # Metadata
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
    
    def has_level_data(self):
        """Check if we have structured level data for this federation"""
        return self.levels.exists()


class FederationLevel(models.Model):
    """
    Optional structured data about a specific level within a federation.
    Only created when we have reliable information.
    """
    id = AutoField(primary_key=True)
    federation = ForeignKey(Federation, on_delete=CASCADE, related_name='levels')
    
    # Level identification
    level_code = CharField(max_length=100)  # e.g., "STAR_5", "JUVENILE", "NOVICE"
    display_name = CharField(max_length=200)  # e.g., "STAR 5", "Juvenile", "Novice"
    
    # Ordering within federation
    sort_order = IntegerField()  # 1 = lowest, 99 = highest
    
    # Capabilities (flexible JSON for different federation needs)
    capabilities = JSONField(default=dict)
    # Common fields:
    # {
    #   "can_do_singles": true,
    #   "can_do_doubles": true,
    #   "can_do_triples": false,
    #   "can_do_quads": false,
    #   "max_program_length_seconds": 150,
    #   "typical_elements": ["2A", "2Lz", "FSSp4"],
    #   "ui_detail_level": "intermediate",  // simple, intermediate, advanced
    #   "age_restrictions": {"min": 10, "max": 13},
    #   "competition_categories": ["Juvenile Ladies", "Juvenile Men"]
    # }
    
    # Data quality
    data_source = CharField(max_length=255, blank=True)  # URL or document reference
    verified = BooleanField(default=False)
    verified_by = ForeignKey(User, null=True, blank=True, on_delete=SET_NULL)
    verified_at = DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
    notes = TextField(blank=True)
    
    class Meta:
        unique_together = ('federation', 'level_code')
        ordering = ['federation', 'sort_order']
    
    def __str__(self):
        return f"{self.federation.name} - {self.display_name}"


class FederationLevelContribution(models.Model):
    """
    Community-submitted federation level data.
    Admin reviews and approves before creating FederationLevel.
    """
    id = AutoField(primary_key=True)
    
    # Submission info
    submitted_by = ForeignKey(User, on_delete=CASCADE)
    submitted_at = DateTimeField(auto_now_add=True)
    
    # Level details
    federation = ForeignKey(Federation, on_delete=CASCADE)
    level_code = CharField(max_length=100)
    display_name = CharField(max_length=200)
    sort_order = IntegerField()
    capabilities = JSONField(default=dict)
    
    # Source verification
    data_source = TextField()  # URL, document, or explanation
    notes = TextField(blank=True)
    
    # Review workflow
    status = CharField(max_length=20, choices=[
        ('PENDING', 'Pending Review'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('NEEDS_INFO', 'Needs More Information')
    ], default='PENDING')
    
    reviewed_by = ForeignKey(User, null=True, blank=True, 
                           on_delete=SET_NULL, related_name='reviewed_contributions')
    reviewed_at = DateTimeField(null=True, blank=True)
    admin_notes = TextField(blank=True)
    
    # If approved, links to created level
    approved_level = ForeignKey(FederationLevel, null=True, blank=True, 
                               on_delete=SET_NULL)


class FederationTest(models.Model):
    """
    Optional: Test system for federations that have them.
    Only created if federation has structured test system.
    """
    id = AutoField(primary_key=True)
    federation = ForeignKey(Federation, on_delete=CASCADE, related_name='tests')
    
    # Test identification
    test_code = CharField(max_length=100)
    test_name = CharField(max_length=255)
    test_category = CharField(max_length=50)  # e.g., "Skills", "Freeskate", "Dance"
    
    # Test details
    level = ForeignKey(FederationLevel, null=True, blank=True, on_delete=SET_NULL)
    required_elements = JSONField(default=list)
    pass_criteria = TextField(blank=True)
    
    # Ordering
    sort_order = IntegerField()
    
    class Meta:
        unique_together = ('federation', 'test_code')
        ordering = ['federation', 'test_category', 'sort_order']
```

### Usage in Planning Entities

```python
class SinglesEntity(models.Model):
    skater = ForeignKey(Skater, on_delete=CASCADE)
    federation = ForeignKey(Federation, on_delete=PROTECT)
    
    # FLEXIBLE: Can be free text OR linked to FederationLevel
    current_level = CharField(max_length=100)
    current_level_structured = ForeignKey(FederationLevel, null=True, blank=True,
                                         on_delete=SET_NULL)
    
    # Helper method
    def get_level_capabilities(self):
        """
        Get level capabilities if we have structured data,
        otherwise return sensible defaults.
        """
        if self.current_level_structured:
            return self.current_level_structured.capabilities
        else:
            # Defaults for unknown levels
            return {
                "ui_detail_level": "intermediate",
                "can_do_singles": True,
                "can_do_doubles": True,
                "can_do_triples": True,
                "can_do_quads": False
            }
```

---

## Initial Seed Data Strategy

### Phase 0: Launch Day Federations

**Tier 1 - Full Support (10-15 federations):**
1. **Skate Canada** - Primary market, complete data
2. **US Figure Skating** - Largest market, complete data
3. **Philippine Skating Union** - Beta partner, complete data
4. **ISU** - Generic international levels
5. **British Ice Skating** - Major English-speaking market
6. **Skate Australia** - English-speaking, growing
7. **Ice Skating Institute (ISI)** - Large recreational program
8. **Japan Skating Federation** - Major market
9. **Korean Skating Union** - Major market
10. **Skate Ontario** - Provincial federation (test case)

**Rationale:** Mix of major English markets + beta partner + proof of international

**Tier 2 - Partial Support (20-30 federations):**
- Name and code only
- Major federations from all continents
- Known to have active skating programs
- Can be enhanced as users request

**Examples:**
- European: Germany, France, Italy, Netherlands, Sweden, Russia
- Asian: China, Taiwan, Thailand, Malaysia, Singapore
- Americas: Mexico, Brazil, Argentina
- Oceania: New Zealand
- Africa: South Africa

### Data Collection Process

**For Full Support Federations:**

1. **Primary Sources (in order of preference):**
   - Official federation handbook/rulebook (PDF)
   - Federation website - rules section
   - Contact federation directly (email)
   - Experienced coaches from that federation (verify)

2. **Data Points to Collect:**
   ```
   For each level:
   - Official name
   - Code/abbreviation
   - Sort order (progression)
   - Age restrictions (if any)
   - Jump requirements (singles, doubles, triples, quads)
   - Program length (seconds)
   - Competition categories available
   - Next level in progression
   - Test requirements (if applicable)
   ```

3. **Documentation:**
   - Store source URL/document in `data_source` field
   - Add to `docs/federation_sources.md`
   - Include date of last verification

4. **Quality Assurance:**
   - Mark as `verified=False` initially
   - Have coach from that federation review
   - Mark as `verified=True` after review
   - Set `verified_by` and `verified_at`

### Example Seed Data Structure

**Skate Canada:**
```python
# STARSkate Program
skate_canada_levels = [
    {
        'level_code': 'STAR_1',
        'display_name': 'STAR 1',
        'sort_order': 1,
        'capabilities': {
            'can_do_singles': True,
            'can_do_doubles': False,
            'can_do_triples': False,
            'max_program_length_seconds': 90,
            'typical_elements': ['1A', '1Lz', 'USSp1'],
            'ui_detail_level': 'simple',
            'age_restrictions': None,
            'competition_categories': ['STAR 1-2']
        },
        'data_source': 'https://skatecanada.ca/starskate-program/',
    },
    {
        'level_code': 'STAR_5',
        'display_name': 'STAR 5',
        'sort_order': 5,
        'capabilities': {
            'can_do_singles': True,
            'can_do_doubles': True,
            'can_do_triples': False,
            'max_program_length_seconds': 120,
            'typical_elements': ['2A', '2Lz', '2F', 'FSSp3'],
            'ui_detail_level': 'intermediate',
            'age_restrictions': None,
            'competition_categories': ['STAR 4-5']
        },
        'data_source': 'https://skatecanada.ca/starskate-program/',
    },
    {
        'level_code': 'PRE_NOVICE',
        'display_name': 'Pre-Novice',
        'sort_order': 11,
        'capabilities': {
            'can_do_singles': True,
            'can_do_doubles': True,
            'can_do_triples': False,
            'max_program_length_seconds': 150,
            'typical_elements': ['2A', '2Lz+2T', 'FSSp4', 'StSq2'],
            'ui_detail_level': 'intermediate',
            'age_restrictions': {'min': None, 'max': 13},
            'competition_categories': ['Pre-Novice Women', 'Pre-Novice Men']
        },
        'data_source': 'https://skatecanada.ca/competitions/categories/',
    },
    # ... NOVICE, JUNIOR, SENIOR, etc.
]
```

**US Figure Skating:**
```python
usfs_levels = [
    {
        'level_code': 'BASIC_1',
        'display_name': 'Basic Skills 1',
        'sort_order': 1,
        'capabilities': {
            'can_do_singles': False,
            'can_do_doubles': False,
            'max_program_length_seconds': 60,
            'ui_detail_level': 'simple'
        },
        'data_source': 'https://www.usfigureskating.org/skate/learn-to-skate',
    },
    {
        'level_code': 'JUVENILE',
        'display_name': 'Juvenile',
        'sort_order': 10,
        'capabilities': {
            'can_do_singles': True,
            'can_do_doubles': True,
            'can_do_triples': True,  # USFS allows triples at Juvenile!
            'max_program_length_seconds': 180,
            'typical_elements': ['2A', '3S', '3T', '2A+2T'],
            'ui_detail_level': 'intermediate',
            'age_restrictions': None,
            'competition_categories': ['Juvenile Girls', 'Juvenile Boys']
        },
        'data_source': 'https://www.usfigureskating.org/compete/rules',
    },
    # ... etc.
]
```

---

## Management Commands

### Seed Initial Data

```python
# management/commands/seed_federations.py
from django.core.management.base import BaseCommand
from api.models import Federation, FederationLevel
import json

class Command(BaseCommand):
    help = 'Seed federation and level data'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--federation',
            type=str,
            help='Seed specific federation (e.g., "skate-canada")',
        )
    
    def handle(self, *args, **options):
        if options['federation']:
            self.seed_federation(options['federation'])
        else:
            self.seed_all_federations()
    
    def seed_all_federations(self):
        """Seed all federations from JSON files"""
        federations = [
            'skate-canada',
            'us-figure-skating',
            'philippine-skating-union',
            'isu',
            'british-ice-skating',
            # ... etc.
        ]
        
        for fed_code in federations:
            self.seed_federation(fed_code)
    
    def seed_federation(self, federation_code):
        """Seed a specific federation from JSON file"""
        data_file = f'data/federations/{federation_code}.json'
        
        try:
            with open(data_file, 'r') as f:
                data = json.load(f)
            
            # Create/update federation
            federation, created = Federation.objects.update_or_create(
                code=data['code'],
                defaults={
                    'name': data['name'],
                    'country_code': data.get('country_code', ''),
                    'website': data.get('website', ''),
                    'support_tier': data.get('support_tier', 'BASIC')
                }
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Created federation: {federation.name}')
                )
            
            # Create/update levels
            if 'levels' in data:
                for level_data in data['levels']:
                    level, created = FederationLevel.objects.update_or_create(
                        federation=federation,
                        level_code=level_data['level_code'],
                        defaults={
                            'display_name': level_data['display_name'],
                            'sort_order': level_data['sort_order'],
                            'capabilities': level_data.get('capabilities', {}),
                            'data_source': level_data.get('data_source', ''),
                            'verified': level_data.get('verified', False),
                            'notes': level_data.get('notes', '')
                        }
                    )
                    
                    if created:
                        self.stdout.write(
                            self.style.SUCCESS(f'  Created level: {level.display_name}')
                        )
            
            self.stdout.write(
                self.style.SUCCESS(f'✓ Seeded {federation.name}')
            )
            
        except FileNotFoundError:
            self.stdout.write(
                self.style.ERROR(f'✗ Data file not found: {data_file}')
            )
        except json.JSONDecodeError:
            self.stdout.write(
                self.style.ERROR(f'✗ Invalid JSON in: {data_file}')
            )
```

### Import from CSV

```python
# management/commands/import_levels_csv.py
import csv
from django.core.management.base import BaseCommand
from api.models import Federation, FederationLevel

class Command(BaseCommand):
    help = 'Import levels from CSV file'
    
    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Path to CSV file')
    
    def handle(self, *args, **options):
        with open(options['csv_file'], 'r') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                federation = Federation.objects.get(code=row['federation_code'])
                
                FederationLevel.objects.update_or_create(
                    federation=federation,
                    level_code=row['level_code'],
                    defaults={
                        'display_name': row['display_name'],
                        'sort_order': int(row['sort_order']),
                        'capabilities': json.loads(row['capabilities']),
                        'data_source': row['data_source'],
                        'verified': row['verified'].lower() == 'true'
                    }
                )
                
                self.stdout.write(
                    self.style.SUCCESS(f'Imported {row["display_name"]}')
                )
```

---

## Admin Interface

### Django Admin Configuration

```python
# admin.py
from django.contrib import admin
from django.utils.html import format_html
from .models import Federation, FederationLevel, FederationLevelContribution

@admin.register(Federation)
class FederationAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'country_code', 'support_tier', 
                   'level_count', 'is_active']
    list_filter = ['support_tier', 'is_active', 'country_code']
    search_fields = ['name', 'code']
    
    fieldsets = [
        ('Basic Information', {
            'fields': ['name', 'code', 'country_code']
        }),
        ('Details', {
            'fields': ['website', 'logo', 'support_tier']
        }),
        ('Status', {
            'fields': ['is_active']
        }),
    ]
    
    def level_count(self, obj):
        count = obj.levels.count()
        if count > 0:
            return format_html(
                '<span style="color: green;">{} levels</span>', count
            )
        return format_html('<span style="color: red;">No levels</span>')
    level_count.short_description = 'Level Data'
    
    actions = ['mark_enhanced', 'export_to_json']
    
    def mark_enhanced(self, request, queryset):
        queryset.update(support_tier='ENHANCED')
        self.message_user(request, 'Marked as Enhanced support')
    mark_enhanced.short_description = 'Mark as Enhanced support'
    
    def export_to_json(self, request, queryset):
        # Export federation data to JSON for backup
        pass


@admin.register(FederationLevel)
class FederationLevelAdmin(admin.ModelAdmin):
    list_display = ['federation', 'display_name', 'level_code', 'sort_order',
                   'verified_status', 'data_source_link']
    list_filter = ['federation', 'verified']
    search_fields = ['level_code', 'display_name', 'federation__name']
    ordering = ['federation', 'sort_order']
    
    fieldsets = [
        ('Level Information', {
            'fields': ['federation', 'level_code', 'display_name', 'sort_order']
        }),
        ('Capabilities', {
            'fields': ['capabilities'],
            'classes': ['collapse']
        }),
        ('Verification', {
            'fields': ['data_source', 'verified', 'verified_by', 'verified_at']
        }),
        ('Notes', {
            'fields': ['notes'],
            'classes': ['collapse']
        }),
    ]
    
    readonly_fields = ['verified_by', 'verified_at']
    
    def verified_status(self, obj):
        if obj.verified:
            return format_html(
                '<span style="color: green;">✓ Verified</span>'
            )
        return format_html('<span style="color: orange;">⚠ Unverified</span>')
    verified_status.short_description = 'Status'
    
    def data_source_link(self, obj):
        if obj.data_source:
            if obj.data_source.startswith('http'):
                return format_html(
                    '<a href="{}" target="_blank">View Source</a>',
                    obj.data_source
                )
            return obj.data_source[:50]
        return '-'
    data_source_link.short_description = 'Source'
    
    actions = ['mark_verified', 'duplicate_to_federation']
    
    def mark_verified(self, request, queryset):
        from django.utils import timezone
        queryset.update(
            verified=True,
            verified_by=request.user,
            verified_at=timezone.now()
        )
        self.message_user(request, 'Marked levels as verified')
    mark_verified.short_description = 'Mark as verified'


@admin.register(FederationLevelContribution)
class FederationLevelContributionAdmin(admin.ModelAdmin):
    list_display = ['federation', 'display_name', 'submitted_by', 
                   'submitted_at', 'status']
    list_filter = ['status', 'federation', 'submitted_at']
    search_fields = ['display_name', 'level_code', 'submitted_by__email']
    
    fieldsets = [
        ('Contribution Info', {
            'fields': ['submitted_by', 'submitted_at', 'status']
        }),
        ('Level Details', {
            'fields': ['federation', 'level_code', 'display_name', 
                      'sort_order', 'capabilities']
        }),
        ('Source', {
            'fields': ['data_source', 'notes']
        }),
        ('Review', {
            'fields': ['admin_notes', 'reviewed_by', 'reviewed_at', 
                      'approved_level']
        }),
    ]
    
    readonly_fields = ['submitted_by', 'submitted_at', 'reviewed_by', 
                      'reviewed_at', 'approved_level']
    
    actions = ['approve_contributions', 'reject_contributions', 
               'request_more_info']
    
    def approve_contributions(self, request, queryset):
        from django.utils import timezone
        
        for contribution in queryset:
            # Create FederationLevel from contribution
            level = FederationLevel.objects.create(
                federation=contribution.federation,
                level_code=contribution.level_code,
                display_name=contribution.display_name,
                sort_order=contribution.sort_order,
                capabilities=contribution.capabilities,
                data_source=contribution.data_source,
                verified=True,
                verified_by=request.user,
                verified_at=timezone.now(),
                notes=contribution.notes
            )
            
            # Update contribution
            contribution.status = 'APPROVED'
            contribution.reviewed_by = request.user
            contribution.reviewed_at = timezone.now()
            contribution.approved_level = level
            contribution.save()
        
        self.message_user(request, f'Approved {queryset.count()} contributions')
    approve_contributions.short_description = 'Approve selected contributions'
    
    def reject_contributions(self, request, queryset):
        from django.utils import timezone
        queryset.update(
            status='REJECTED',
            reviewed_by=request.user,
            reviewed_at=timezone.now()
        )
        self.message_user(request, 'Rejected contributions')
    reject_contributions.short_description = 'Reject selected contributions'
```

---

## User-Facing Features

### 1. Skater Profile - Federation Selection

```svelte
<!-- SkaterForm.svelte -->
<script>
  let federations = [];
  let selectedFederation = null;
  let availableLevels = [];
  let levelInput = '';
  let showLevelDropdown = false;
  
  async function loadFederations() {
    const response = await fetch('/api/federations/');
    federations = await response.json();
  }
  
  async function onFederationChange() {
    // Check if this federation has level data
    const response = await fetch(`/api/federations/${selectedFederation.code}/levels/`);
    const data = await response.json();
    
    if (data.length > 0) {
      availableLevels = data;
      showLevelDropdown = true;
    } else {
      availableLevels = [];
      showLevelDropdown = false;
    }
  }
</script>

<form>
  <div class="form-group">
    <label>Federation</label>
    <select bind:value={selectedFederation} on:change={onFederationChange}>
      <option value={null}>Select federation...</option>
      {#each federations as federation}
        <option value={federation}>
          {federation.name}
          {#if federation.has_level_data}
            ✓
          {/if}
        </option>
      {/each}
    </select>
  </div>
  
  <div class="form-group">
    <label>Current Level</label>
    
    {#if showLevelDropdown}
      <!-- Structured data available -->
      <select bind:value={levelInput}>
        <option value="">Select level...</option>
        {#each availableLevels as level}
          <option value={level.level_code}>
            {level.display_name}
          </option>
        {/each}
      </select>
      <p class="text-sm text-gray-500">
        Enhanced features available for this federation
      </p>
    {:else}
      <!-- Free text fallback -->
      <input 
        type="text" 
        bind:value={levelInput}
        placeholder="Enter level (e.g., Intermediate, Juvenile, etc.)"
      />
      <p class="text-sm text-gray-500">
        We don't have structured data for this federation yet. 
        Basic features will work fine. Want to help add data?
        <a href="/contribute-federation-data">Contribute here</a>
      </p>
    {/if}
  </div>
</form>
```

### 2. Contribution Workflow

```svelte
<!-- ContributeFederationData.svelte -->
<script>
  let step = 1;
  let selectedFederation;
  let levelData = {
    level_code: '',
    display_name: '',
    sort_order: '',
    capabilities: {
      can_do_singles: true,
      can_do_doubles: false,
      can_do_triples: false,
      max_program_length_seconds: 120,
      ui_detail_level: 'intermediate'
    },
    data_source: '',
    notes: ''
  };
  
  async function submitContribution() {
    const response = await fetch('/api/federation-contributions/', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        federation: selectedFederation.id,
        ...levelData
      })
    });
    
    if (response.ok) {
      alert('Thank you! Your contribution will be reviewed.');
    }
  }
</script>

<div class="container">
  <h1>Contribute Federation Data</h1>
  <p>Help us expand support for your federation!</p>
  
  {#if step === 1}
    <div class="step">
      <h2>Step 1: Select Federation</h2>
      <select bind:value={selectedFederation}>
        {#each federations as federation}
          {#if !federation.has_level_data}
            <option value={federation}>{federation.name}</option>
          {/if}
        {/each}
      </select>
      <button on:click={() => step = 2}>Next</button>
    </div>
  
  {:else if step === 2}
    <div class="step">
      <h2>Step 2: Level Information</h2>
      
      <label>
        Level Name (as shown in rulebook)
        <input type="text" bind:value={levelData.display_name} />
      </label>
      
      <label>
        Level Code (abbreviation)
        <input type="text" bind:value={levelData.level_code} />
      </label>
      
      <label>
        Sort Order (1 = lowest level)
        <input type="number" bind:value={levelData.sort_order} />
      </label>
      
      <h3>Capabilities</h3>
      
      <label>
        <input type="checkbox" bind:checked={levelData.capabilities.can_do_doubles} />
        Can do double jumps
      </label>
      
      <label>
        <input type="checkbox" bind:checked={levelData.capabilities.can_do_triples} />
        Can do triple jumps
      </label>
      
      <label>
        Maximum program length (seconds)
        <input type="number" bind:value={levelData.capabilities.max_program_length_seconds} />
      </label>
      
      <label>
        UI detail level
        <select bind:value={levelData.capabilities.ui_detail_level}>
          <option value="simple">Simple (beginners)</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced (elite)</option>
        </select>
      </label>
      
      <button on:click={() => step = 3}>Next</button>
    </div>
  
  {:else if step === 3}
    <div class="step">
      <h2>Step 3: Source & Verification</h2>
      
      <label>
        Data Source (URL to rulebook or official document)
        <input type="url" bind:value={levelData.data_source} 
               placeholder="https://..." />
      </label>
      
      <label>
        Additional Notes
        <textarea bind:value={levelData.notes} 
                  placeholder="Any clarifications or context..."></textarea>
      </label>
      
      <div class="alert">
        <strong>Important:</strong> Please provide a verifiable source 
        (federation website, official rulebook, etc.). 
        Contributions without sources cannot be approved.
      </div>
      
      <button on:click={submitContribution}>Submit Contribution</button>
    </div>
  {/if}
</div>
```

### 3. Admin Review Interface

```svelte
<!-- admin/ReviewContributions.svelte -->
<script>
  let contributions = [];
  let selectedContribution = null;
  
  async function loadPendingContributions() {
    const response = await fetch('/api/admin/contributions/?status=PENDING');
    contributions = await response.json();
  }
  
  async function approveContribution(id) {
    await fetch(`/api/admin/contributions/${id}/approve/`, {method: 'POST'});
    loadPendingContributions();
  }
  
  async function rejectContribution(id, reason) {
    await fetch(`/api/admin/contributions/${id}/reject/`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({reason})
    });
    loadPendingContributions();
  }
</script>

<div class="admin-panel">
  <h1>Review Federation Contributions</h1>
  
  <div class="contributions-list">
    {#each contributions as contribution}
      <div class="contribution-card">
        <h3>{contribution.federation.name} - {contribution.display_name}</h3>
        <p>Submitted by: {contribution.submitted_by.email}</p>
        <p>Source: <a href={contribution.data_source} target="_blank">
          {contribution.data_source}
        </a></p>
        
        <div class="capabilities">
          <span>Doubles: {contribution.capabilities.can_do_doubles ? '✓' : '✗'}</span>
          <span>Triples: {contribution.capabilities.can_do_triples ? '✓' : '✗'}</span>
          <span>Max Length: {contribution.capabilities.max_program_length_seconds}s</span>
        </div>
        
        <div class="actions">
          <button on:click={() => approveContribution(contribution.id)}>
            Approve
          </button>
          <button on:click={() => rejectContribution(contribution.id, 'reason')}>
            Reject
          </button>
          <button on:click={() => selectedContribution = contribution}>
            Need More Info
          </button>
        </div>
      </div>
    {/each}
  </div>
</div>
```

---

## API Endpoints

```python
# api/views/federations.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

class FederationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public API for federation data.
    """
    queryset = Federation.objects.filter(is_active=True)
    serializer_class = FederationSerializer
    
    @action(detail=True, methods=['get'])
    def levels(self, request, pk=None):
        """Get all levels for a federation"""
        federation = self.get_object()
        levels = federation.levels.all().order_by('sort_order')
        serializer = FederationLevelSerializer(levels, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search federations by name"""
        query = request.query_params.get('q', '')
        federations = self.queryset.filter(name__icontains=query)
        serializer = self.get_serializer(federations, many=True)
        return Response(serializer.data)


class FederationLevelContributionViewSet(viewsets.ModelViewSet):
    """
    API for submitting and managing federation level contributions.
    """
    queryset = FederationLevelContribution.objects.all()
    serializer_class = FederationLevelContributionSerializer
    
    def perform_create(self, serializer):
        """Auto-set submitted_by to current user"""
        serializer.save(submitted_by=self.request.user)
    
    def get_queryset(self):
        """Filter by status if provided"""
        queryset = super().get_queryset()
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
        return queryset
    
    @action(detail=True, methods=['post'], 
            permission_classes=[IsAdminUser])
    def approve(self, request, pk=None):
        """Approve a contribution and create FederationLevel"""
        contribution = self.get_object()
        
        # Create FederationLevel
        level = FederationLevel.objects.create(
            federation=contribution.federation,
            level_code=contribution.level_code,
            display_name=contribution.display_name,
            sort_order=contribution.sort_order,
            capabilities=contribution.capabilities,
            data_source=contribution.data_source,
            verified=True,
            verified_by=request.user,
            verified_at=timezone.now(),
            notes=contribution.notes
        )
        
        # Update contribution
        contribution.status = 'APPROVED'
        contribution.reviewed_by = request.user
        contribution.reviewed_at = timezone.now()
        contribution.approved_level = level
        contribution.save()
        
        # Notify submitter
        send_approval_email(contribution)
        
        return Response({
            'status': 'approved',
            'level_id': level.id
        })
    
    @action(detail=True, methods=['post'], 
            permission_classes=[IsAdminUser])
    def reject(self, request, pk=None):
        """Reject a contribution"""
        contribution = self.get_object()
        
        contribution.status = 'REJECTED'
        contribution.reviewed_by = request.user
        contribution.reviewed_at = timezone.now()
        contribution.admin_notes = request.data.get('reason', '')
        contribution.save()
        
        # Notify submitter
        send_rejection_email(contribution)
        
        return Response({'status': 'rejected'})
```

---

## Documentation Structure

```
docs/
├── federation-support/
│   ├── README.md                      # Overview of federation support
│   ├── supported-federations.md       # List of supported federations
│   ├── contributing-data.md           # How to contribute data
│   ├── data-sources.md                # Sources for each federation
│   └── federations/
│       ├── skate-canada.md
│       ├── us-figure-skating.md
│       ├── philippine-skating-union.md
│       └── ...
└── api/
    └── federation-endpoints.md        # API documentation
```

---

## Maintenance Strategy

### Regular Updates (Quarterly)

1. **Check for Rule Changes:**
   - Review federation websites
   - Check for new rulebooks
   - Subscribe to federation newsletters

2. **Verify Data:**
   - Spot-check 10 random levels per federation
   - Confirm with coaches if uncertain
   - Update as needed

3. **Add New Federations:**
   - Prioritize based on user requests
   - Focus on federations with >5 active users

### Community Engagement

1. **Monthly Contribution Review:**
   - Review all pending contributions
   - Approve/reject within 48 hours
   - Provide feedback to contributors

2. **Recognition:**
   - Credit contributors in docs
   - Badge system for active contributors
   - Feature top contributors in newsletter

### Quality Control

1. **Verification Process:**
   - All data must have source
   - Admin reviews before approval
   - Mark as verified after review
   - Coach from federation reviews (ideal)

2. **Dispute Resolution:**
   - If users report incorrect data
   - Verify with official sources
   - Update or mark as disputed
   - Document reasoning

---

## Success Metrics

### Coverage:
- % of users with federation support (target: 80%)
- # of federations with full data (target: 15 by launch)
- # of federations with partial data (target: 30 by launch)

### Quality:
- % of levels marked as verified (target: 90%)
- # of data disputes per month (target: <5)
- User satisfaction with federation features

### Growth:
- # of community contributions per month
- # of new federations added per quarter
- # of federations upgraded from basic to enhanced

### Engagement:
- # of users contributing data
- # of federation partnerships
- # of data source updates per quarter

---

## Phase 0 Implementation Checklist

### Week 1: Models & Infrastructure

**Day 1-2: Data Models**
- [ ] Create Federation model
- [ ] Create FederationLevel model
- [ ] Create FederationLevelContribution model
- [ ] Create FederationTest model (optional, defer?)
- [ ] Run migrations

**Day 3-4: Seed Data**
- [ ] Create JSON data files for 3 core federations
  - [ ] Skate Canada (complete)
  - [ ] US Figure Skating (complete)
  - [ ] Philippine Skating Union (complete)
- [ ] Create management command: `seed_federations`
- [ ] Create management command: `import_levels_csv`
- [ ] Seed 25 additional federations (name/code only)
- [ ] Run seed commands

**Day 5: Admin Interface**
- [ ] Configure FederationAdmin
- [ ] Configure FederationLevelAdmin
- [ ] Configure FederationLevelContributionAdmin
- [ ] Test admin workflows

**Weekend: Data Collection**
- [ ] Collect ISU level data
- [ ] Collect British Ice Skating data
- [ ] Collect Skate Australia data
- [ ] Document all sources

### Week 2 (if time): API & Frontend

**Day 6-7: API Endpoints**
- [ ] Create FederationViewSet
- [ ] Create FederationLevelContributionViewSet
- [ ] Add federation search endpoint
- [ ] Add level lookup endpoint
- [ ] Test all endpoints

**Day 8-9: Frontend Components**
- [ ] Update SkaterForm with federation dropdown
- [ ] Add level selection (dropdown or free text)
- [ ] Create contribution form
- [ ] Add "Help add your federation" messaging

**Day 10: Testing & Documentation**
- [ ] Write tests for models
- [ ] Write tests for API
- [ ] Document supported federations
- [ ] Create contribution guide
- [ ] Update main README

---

## Future Enhancements (Post-MVP)

### Phase 2: Test Tracking
- Add FederationTest model
- Track test completion
- Generate test progress reports

### Phase 3: Advanced Features
- Level progression pathways
- Element restrictions by level
- Program validation (length, elements)
- Competition category matching

### Phase 4: Federation Partnerships
- Custom branding for partner federations
- Direct data management access
- Priority support
- Custom reporting

### Phase 5: International Expansion
- Multi-language support
- Regional federation support
- Local currency for billing

---

## Summary

This comprehensive strategy:

✅ **Works universally** - Any federation, any level, even if we've never heard of them
✅ **Enhances progressively** - Better features for supported federations
✅ **Scales through community** - Coaches can contribute data
✅ **Maintains quality** - Admin review before approval
✅ **Sustainable** - Clear maintenance process
✅ **Flexible** - JSON capabilities adapt to federation needs

**Key Insight:** Federation data is an ENHANCEMENT, not a REQUIREMENT. The tool must work perfectly without it, and get better with it.

