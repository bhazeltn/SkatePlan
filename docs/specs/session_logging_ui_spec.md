# Session Logging UI Specification

## Overview
Session logging must capture both quick daily tracking AND detailed technical data (program runs, element attempts) to support data-driven coaching.

---

## Session Log Data Layers

### Layer 1: Essential (Required)
**The minimum for ANY session log:**
- Date
- Discipline (auto-detected if single discipline)
- Duration (minutes)
- Energy/Stamina (1-5 scale)
- Session Rating (1-5 stars)

### Layer 2: Quick Notes (Highly Encouraged)
**Quick context via voice or text:**
- What did you work on? (voice note or text)
- How did it go? (general sentiment)

### Layer 3: Technical Detail (Optional but Valuable)
**Structured tracking for analytics:**
- Program Runs
- Element Attempts
- Specific focus areas

---

## Mobile UI Flow

### Quick Entry (Primary Path - 2 minutes)

```
┌─────────────────────────────────┐
│ Log Today's Session             │
├─────────────────────────────────┤
│ Singles - 90 minutes            │ ← Pre-filled from plan
│                                 │
│ How was your energy?            │
│ ●●●○○                          │ ← Tap stars
│                                 │
│ Session quality?                │
│ ★★★★☆                          │ ← Tap stars
│                                 │
│ ┌─────────────────────────────┐ │
│ │  🎤 Quick Voice Note        │ │ ← BIG BUTTON
│ └─────────────────────────────┘ │
│                                 │
│ [Skip Details] [Add Details]    │
└─────────────────────────────────┘

If user taps "Add Details" →
```

### Detailed Entry (Optional)

```
┌─────────────────────────────────┐
│ Session Details                 │
├─────────────────────────────────┤
│ 📊 Program Runs                 │
│ ┌─────────────────────────────┐ │
│ │ Short Program               │ │ ← Dropdown from athlete's programs
│ │ Full runthrough w/ music   │ │ ← Run type
│ │ Quality: ★★★★☆             │ │
│ │ [Remove] [+ Add Another]    │ │
│ └─────────────────────────────┘ │
│                                 │
│ 🎯 Element Attempts             │
│ ┌─────────────────────────────┐ │
│ │ 3Lz: 10 attempts, 7 good   │ │ ← Quick entry
│ │ 2A:  15 attempts, 12 good  │ │
│ │ [+ Add Element]             │ │
│ └─────────────────────────────┘ │
│                                 │
│ 💭 Notes                        │
│ ┌─────────────────────────────┐ │
│ │ Felt good on jumps today.  │ │
│ │ Still struggling with      │ │
│ │ entry into 3Lz.            │ │
│ └─────────────────────────────┘ │
│                                 │
│ [Save Session]                  │
└─────────────────────────────────┘
```

---

## Voice Note Processing (AI-Assisted)

### What the AI Should Extract

**Input (skater speaking):**
> "Singles session today, hour and a half. Ran my short program three times, twice with music. First one was okay, like a 3 out of 5, second one was better, maybe a 4, and the last one I fell on the triple lutz so probably a 2. Also worked on double axel, did about 15, landed maybe 10 of them. Tried triple lutz by itself, got 6 out of 10. Energy was pretty low today, like a 3, been tired this week."

**AI Extraction (GPT-4 Structured Output):**
```json
{
  "duration": 90,
  "energy_stamina": 3,
  "session_rating": 3,
  "program_runs": [
    {
      "program_title": "Short Program",
      "run_type": "Full",
      "music": true,
      "quality": 3
    },
    {
      "program_title": "Short Program", 
      "run_type": "Full",
      "music": true,
      "quality": 4
    },
    {
      "program_title": "Short Program",
      "run_type": "Full", 
      "music": true,
      "quality": 2,
      "notes": "Fell on 3Lz"
    }
  ],
  "element_attempts": [
    {
      "element_code": "2A",
      "attempts": 15,
      "successful": 10
    },
    {
      "element_code": "3Lz",
      "attempts": 10,
      "successful": 6
    }
  ],
  "wellbeing_mental_focus_notes": "Tired this week, low energy",
  "full_transcript": "Singles session today, hour and a half..."
}
```

**UI shows this in editable form:**
```
┌─────────────────────────────────┐
│ Review & Edit                   │
├─────────────────────────────────┤
│ ✓ Duration: 90 min              │
│ ✓ Energy: 3/5                   │
│ ✓ Rating: 3/5                   │
│                                 │
│ Program Runs (3):               │
│ ✓ SP - Full w/ music - ★★★☆☆   │
│ ✓ SP - Full w/ music - ★★★★☆   │
│ ✓ SP - Full w/ music - ★★☆☆☆   │
│   Note: "Fell on 3Lz"          │
│                                 │
│ Element Attempts (2):           │
│ ✓ 2A: 15 attempts, 10 clean    │
│ ✓ 3Lz: 10 attempts, 6 clean    │
│                                 │
│ Notes:                          │
│ "Tired this week, low energy"   │
│                                 │
│ [Edit] [Looks Good - Save]      │
└─────────────────────────────────┘
```

---

## Program Runs Detail Levels

### Level 1: Simple (Default)
```json
{
  "program_id": 12,
  "program_title": "Short Program",
  "run_type": "Full",
  "music": true,
  "quality": 4
}
```

**UI:**
- Program dropdown (from athlete's programs)
- Run type: Full / Partial / Elements Only
- With music? Yes/No
- Quality: 1-5 stars
- Optional notes field

### Level 2: Element Tracking (Optional)
```json
{
  "program_id": 12,
  "program_title": "Short Program",
  "run_type": "Full",
  "music": true,
  "quality": 4,
  "elements": [
    {
      "element_code": "3Lz",
      "planned": true,
      "executed": true,
      "quality": "clean"
    },
    {
      "element_code": "3F+3T",
      "planned": true,
      "executed": true, 
      "quality": "under-rotated"
    }
  ]
}
```

**UI:**
- Shows planned program elements (from Program.planned_elements)
- For each element: ✓ Clean / ⚠️ Issue / ✗ Missed
- Expandable for notes on specific elements

### Level 3: Protocol-Style (Future - Competition Simulation)
```json
{
  "program_id": 12,
  "program_title": "Short Program",
  "run_type": "Full",
  "music": true,
  "quality": 4,
  "elements": [
    {
      "element_code": "3Lz",
      "base_value": 5.90,
      "goe": 2,
      "score": 7.08,
      "calls": []
    }
  ],
  "total_score": 45.50
}
```

**Defer to post-MVP** - Too complex for daily logging

---

## Element Attempts Entry

### Quick Entry (Mobile)
```
┌─────────────────────────────────┐
│ Element Attempts                │
├─────────────────────────────────┤
│ ┌──────────┬─────────┬─────────┐│
│ │ Element  │ Total   │ Clean   ││
│ ├──────────┼─────────┼─────────┤│
│ │ 3Lz ▼    │ 10      │ 7       ││
│ ├──────────┼─────────┼─────────┤│
│ │ 2A ▼     │ 15      │ 12      ││
│ └──────────┴─────────┴─────────┘│
│                                 │
│ [+ Add Element]                 │
└─────────────────────────────────┘
```

**Features:**
- Element dropdown with autocomplete (from SkatingElement table)
- Recent elements appear first
- Can add custom text if element not in database
- Simple numeric entry
- Quick add/remove rows

### Data Structure
```json
{
  "element_attempts": [
    {
      "element_code": "3Lz",
      "element_id": 123,  // FK to SkatingElement
      "attempts": 10,
      "successful": 7
    },
    {
      "element_code": "2A",
      "element_id": 124,
      "attempts": 15,
      "successful": 12
    }
  ]
}
```

---

## Desktop Coach View

### Session Log Display
```
┌────────────────────────────────────────────────────────┐
│ Session Log - Jan 15, 2025                             │
├────────────────────────────────────────────────────────┤
│ Author: Sarah Chen (Skater)                            │
│ Discipline: Singles (90 min)                           │
│ Energy: 3/5  |  Quality: ★★★☆☆                        │
│                                                        │
│ 📊 PROGRAM RUNS (3)                                    │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Short Program - Full w/ music        ★★★☆☆         │ │
│ │ Short Program - Full w/ music        ★★★★☆         │ │
│ │ Short Program - Full w/ music        ★★☆☆☆         │ │
│ │   "Fell on 3Lz"                                   │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ 🎯 ELEMENT ATTEMPTS                                    │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 2A:  15 attempts → 12 clean (80%)  📈              │ │
│ │ 3Lz: 10 attempts →  6 clean (60%)  📉              │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ 💭 NOTES                                               │
│ "Tired this week, low energy"                          │
│                                                        │
│ 🎤 VOICE TRANSCRIPT                                    │
│ [Expand to see full transcript]                        │
│                                                        │
│ [Add Coach Notes] [Edit] [💬 Comment]                 │
└────────────────────────────────────────────────────────┘
```

---

## Analytics Integration

### Element Success Rate Over Time

**Query:** All element_attempts for a specific element across multiple sessions

```sql
SELECT 
  session_date,
  attempts,
  successful,
  ROUND(successful::float / attempts * 100, 0) as success_rate
FROM session_logs,
  jsonb_to_recordset(element_attempts) as ea(
    element_code text,
    attempts int,
    successful int
  )
WHERE element_code = '3Lz'
  AND planning_entity_id = 123
ORDER BY session_date;
```

**Chart:**
```
3Lz Success Rate Over Time

100% ┤                                    ●
 90% ┤                              ●
 80% ┤                    ●    ●
 70% ┤              ●
 60% ┤        ●
 50% ┤  ●
     └────────────────────────────────────
      Jan 1  Jan 8  Jan 15  Jan 22  Jan 29
      
Attempts per session: ●●●●●●● (5-15 range)
```

### Program Run Quality Trends

**Query:** All program runs for a specific program

```sql
SELECT
  session_date,
  run_type,
  music,
  quality
FROM session_logs,
  jsonb_to_recordset(program_runs) as pr(
    program_id int,
    run_type text,
    music boolean,
    quality int
  )
WHERE program_id = 12
ORDER BY session_date, quality;
```

**Visualization:**
```
Short Program - Quality Trend

★★★★★ ┤                              ●
★★★★☆ ┤                    ●    ●
★★★☆☆ ┤        ●    ●    ●
★★☆☆☆ ┤  ●    ●
★☆☆☆☆ ┤
       └────────────────────────────────
        Week 1  Week 2  Week 3  Week 4

● With Music    ○ Without Music
```

---

## Implementation Priority

### MVP (Phase 2-3)
1. ✅ Basic session log (duration, energy, rating)
2. ✅ Simple program runs (program, type, quality)
3. ✅ Element attempts (quick table entry)
4. ✅ Voice note recording + transcript storage
5. ⚠️ AI extraction (basic - duration, energy, rating only)

### Post-MVP (Phase 8)
6. Advanced AI extraction (programs, elements from voice)
7. Element-level program tracking (which elements in each run)
8. Success rate charts
9. Program quality trends
10. Predictive analytics (readiness for competition)

---

## Technical Implementation Notes

### AI Extraction Prompt (GPT-4)

```python
SYSTEM_PROMPT = """
You are analyzing a figure skating session voice note.
Extract structured data in JSON format.

Element codes you might see:
- Jumps: 1A, 2A, 3A, 2Lz, 3Lz, 2F, 3F, 2Lo, 3Lo, 2S, 3S, 2T, 3T
- Combos: 3Lz+3T, 2A+3T, etc.
- Spins: FCSp, LSp, CCoSp, etc.

Program types:
- Short Program (SP)
- Free Skate (FS)
- Rhythm Dance (RD)
- Free Dance (FD)

Extract:
- duration (minutes)
- energy_stamina (1-5)
- session_rating (1-5)
- program_runs (list)
- element_attempts (list)
- notes (any other relevant info)
"""

def extract_session_data(transcript: str) -> dict:
    response = openai.chat.completions.create(
        model="gpt-4-turbo-preview",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": transcript}
        ],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)
```

### Mobile Voice Recording

```javascript
// React component for voice recording
const VoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const audioChunks = [];
    
    mediaRecorder.ondataavailable = (e) => {
      audioChunks.push(e.data);
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      setAudioBlob(blob);
    };
    
    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
  };
  
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };
  
  return (
    <button onClick={isRecording ? stopRecording : startRecording}>
      {isRecording ? '⏹️ Stop' : '🎤 Start Recording'}
    </button>
  );
};
```

---

## Open Design Questions

1. **Element autocomplete** - Should we suggest elements based on:
   - Current goals?
   - Recently logged elements?
   - Program planned elements?
   - All of the above?

2. **Success criteria** - What counts as "successful"?
   - Coach says "clean"
   - Athlete's subjective feeling
   - Configurable per element?

3. **Program run notes** - Should each run have:
   - Just overall quality rating?
   - Or detailed notes on specific moments?
   - Or both with optional detail?

4. **Offline mode** - Should program runs save locally if offline?
   - Essential for rink usage
   - But adds complexity

---

## Success Metrics

**For this feature:**
- % of sessions with program runs logged
- % of sessions with element attempts logged
- Average time to log detailed session
- Voice note → AI extraction accuracy rate
- User satisfaction with AI extraction

**Analytics usage:**
- % of coaches viewing element trends
- % of coaches viewing program quality trends
- Time spent in analytics vs. logging

