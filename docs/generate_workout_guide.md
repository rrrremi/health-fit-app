# AI Workout Generator - Simple Requirements (No User Input)

## Feature Overview
Users click a button to generate a random workout. The AI decides all parameters and returns a structured workout plan that must be parsed, validated, and stored correctly.

## Core Requirements

### 1. The Prompt
**Exact prompt to send to OpenAI:**
```
You are a professional fitness coach and exercise scientist god.
Generate a cool workout for a user based on the following data inputs. Use logic, safety, goal alignment, and biomechanics understanding, fitness understanding, sport science understanding.
------------------------------
TASK:
1.Select exercises that:
   ✅ Avoid contraindications based on injuries/conditions if risky
   ✅ Focus on prioritized body parts across the plan, but don't overlook mistakes
   ✅ Respect fatigue, avoid overloading same joints in sequence
   ✅ Include scalable or regression-friendly options if needed
   ✅ Include reps info in a single number
   ✅ Focus on exercises that are most effective, where benefit to reward ratio is high
2. For each workout:
   - Generate exercises in smart order
   - Include sets and reps
   - Provide rest time in seconds
   - Add short rationale: why this movement, what it targets, why it fits, how to do it technically safely
------------------------------
REVIEW RULES:
- Verify all selected exercises follow the user's constraints and goals
- Cross-check for excessive fatigue on same joints (e.g. avoid 3 knee-heavy exercises back to back)
- Avoid high technical difficulty unless justified by user experience
- Ensure that reps and sets are matching user goals and settings
- Ensure balance across muscle groups and plane of movement over the plan
- Ensure you are not making mistakes, doubles - run the whole check to ensure quality.
- Do not do more than asked for; do not hallucinate.
GIVE RESPONSE IN JSON FORMAT
[Include the example JSON]
```

### 2. Expected JSON Response Structure
```json
{
  "workout": {
    "exercises": [
      {
        "name": "string",
        "sets": number,
        "reps": number,
        "rest_time_seconds": number,
        "rationale": "string"
      }
    ],
    "total_duration_minutes": number,
    "muscle_groups_targeted": "string",
    "joint_groups_affected": "string",
    "equipment_needed": "string"
  }
}
```

## Technical Requirements

### 3. Database Schema
```sql
CREATE TABLE public.workouts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Parsed workout data
  total_duration_minutes INTEGER NOT NULL,
  muscle_groups_targeted TEXT NOT NULL,
  joint_groups_affected TEXT NOT NULL,
  equipment_needed TEXT NOT NULL,
  
  -- Full workout JSON
  workout_data JSONB NOT NULL,
  
  -- AI metadata
  raw_ai_response TEXT NOT NULL, -- Store original response for debugging
  ai_model TEXT DEFAULT 'gpt-3.5-turbo',
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  
  -- Generation metadata
  generation_time_ms INTEGER, -- How long the API call took
  parse_attempts INTEGER DEFAULT 1, -- How many times we tried to parse
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX workouts_user_id_idx ON public.workouts(user_id);
CREATE INDEX workouts_created_at_idx ON public.workouts(created_at DESC);
```

### 4. API Requirements

#### 4.1 Generate Endpoint
**Route**: `POST /api/workouts/generate`

**No request body needed** - fully random generation

**Response Flow:**
```
1. Check Authentication
   └─ Error 401: "Unauthorized"

2. Check Rate Limit (10/day)
   └─ Error 429: "Daily limit reached"

3. Call OpenAI API
   └─ Error 503: "AI service unavailable"
   └─ Timeout after 30 seconds

4. Parse & Validate Response
   └─ Multiple validation layers

5. Store in Database
   └─ Error 500: "Failed to save workout"

6. Return Success
   └─ 200: { success: true, workoutId: "..." }
```

### 5. Response Validation Requirements

#### 5.1 JSON Structure Validation
```javascript
// Required structure checks:
- Response must be valid JSON
- Must have root "workout" object
- "workout" must have "exercises" array
- Each exercise must have ALL required fields
- Arrays must not be empty
```

#### 5.2 Data Type Validation
```javascript
// Type checks for each field:
- name: non-empty string
- sets: positive integer (1-10 range)
- reps: positive integer (1-100 range)
- rest_time_seconds: positive integer (0-300 range)
- rationale: non-empty string
- total_duration_minutes: positive integer (5-120 range)
- muscle_groups_targeted: non-empty string
- joint_groups_affected: non-empty string
- equipment_needed: non-empty string
```

#### 5.3 Business Logic Validation
```javascript
// Logical checks:
- Minimum 1 exercise, maximum 10 exercises
- Total duration should roughly match (sets × reps × exercises)
- No duplicate exercise names
- Rest times make sense for exercise type
```

### 6. Error Handling Requirements

#### 6.1 OpenAI API Errors
| Error Type | User Message | Internal Action |
|------------|--------------|-----------------|
| Network timeout | "Generation took too long, please try again" | Log timeout, return 504 |
| Rate limit | "AI service is busy, please try later" | Return 429 with retry-after |
| Invalid API key | "Configuration error" | Alert admin, return 500 |
| Model overloaded | "Service temporarily unavailable" | Return 503 |

#### 6.2 Parsing Errors
| Error Type | User Message | Internal Action |
|------------|--------------|-----------------|
| Invalid JSON | "Failed to generate valid workout" | Log raw response, retry once |
| Missing fields | "Incomplete workout generated" | Log missing fields, retry once |
| Invalid values | "Invalid workout data" | Log validation errors, fail |

#### 6.3 Retry Logic
```
IF first attempt fails due to parsing:
  - Log the raw response
  - Try ONE more time with stricter prompt
  - If still fails, return error to user
  - Store failed attempt for debugging
```

### 7. Frontend Requirements

#### 7.1 UI States
**Initial State:**
```
┌─────────────────────────────────┐
│   GENERATE WORKOUT              │
└─────────────────────────────────┘
```

**Loading State:**
```
┌─────────────────────────────────┐
│   ⚫ ⚫ ⚫ Generating...         │
│   AI is creating your workout   │
└─────────────────────────────────┘
```

**Error State:**
```
┌─────────────────────────────────┐
│   ❌ Generation Failed          │
│   [Error message]               │
│   [TRY AGAIN]                   │
└─────────────────────────────────┘
```

**Success State:**
Redirect to `/workouts/[id]`

#### 7.2 Workout Display Requirements
```
┌─────────────────────────────────┐
│  WORKOUT                        │
│  30 minutes • 4 exercises       │
├─────────────────────────────────┤
│  Targets: chest, arms, glutes   │
│  Equipment: dumbbells, bench    │
├─────────────────────────────────┤
│  1. INCLINE DUMBBELL PRESS      │
│     3 sets × 10 reps            │
│     Rest: 90 seconds            │
│     ─────────────────────       │
│     Why: Targeting the upper... │
├─────────────────────────────────┤
│  2. DUMBBELL HAMMER CURL        │
│     3 sets × 12 reps            │
│     Rest: 60 seconds            │
│     ─────────────────────       │
│     Why: Focuses on the...      │
└─────────────────────────────────┘
```

### 8. Monitoring & Logging Requirements

#### 8.1 Log Every Generation
```json
{
  "user_id": "...",
  "timestamp": "...",
  "model": "gpt-3.5-turbo",
  "prompt_tokens": 450,
  "completion_tokens": 380,
  "total_cost": 0.0016,
  "generation_time_ms": 2340,
  "parse_success": true,
  "parse_attempts": 1,
  "exercise_count": 4
}
```

#### 8.2 Track Metrics
- Success rate (successful generations / total attempts)
- Average generation time
- Parse failure rate
- Most common error types
- Daily usage patterns

### 9. Performance Requirements
- Generation must complete within 30 seconds
- UI must show progress within 100ms of click
- Page must handle slow connections gracefully
- Error messages must appear within 1 second

### 10. Security Requirements
- OpenAI API key never exposed to client
- Rate limiting per user (10/day)
- Validate all data before storage
- Sanitize AI responses before display
- No user data sent to OpenAI (fully random)

## Success Criteria
- [ ] One-click workout generation
- [ ] Proper JSON parsing with validation
- [ ] All errors handled gracefully
- [ ] Workout data stored correctly
- [ ] Clean display of all workout information
- [ ] No security vulnerabilities
- [ ] Works reliably 95%+ of the time


PROMPT EXAMPLE: 

You are a professional fitness coach and exercise scientist god.
Generate a cool workout for a user based on the following data inputs. Use logic, safety, goal alignment, and biomechanics understanding, fitness understanding, sport science understanding.
------------------------------
TASK:
1.Select exercises that:
   ✅ Avoid contraindications based on injuries/conditions if risky
   ✅ Focus on prioritized body parts across the plan, but don't overlook mistakes
   ✅ Respect fatigue, avoid overloading same joints in sequence
   ✅ Include scalable or regression-friendly options if needed
 ✅ Include reps info in a single number
✅ Focus on exercises that are most effective, where benefit to reward ratio is high
2. For each workout:
   - Generate exercises in smart order
   - Include sets and reps
   - Provide rest time in seconds
   - Add short rationale: why this movement, what it targets, why it fits, how to do it technically safely
------------------------------
REVIEW RULES:
- Verify all selected exercises follow the user’s constraints and goals
- Cross-check for excessive fatigue on same joints (e.g. avoid 3 knee-heavy exercises back to back)
- Avoid high technical difficulty unless justified by user experience
- Ensure that reps and sets are matching user goals and settings
- Ensure balance across muscle groups and plane of movement over the plan
- Ensure you are not making mistakes, doubles - run the whole check to ensure quality.
- Do not do more than asked for; do not hallucinate.
GIVE RESPONSE IN JSON FORMAT
EXAMPLE:
{
  "workout": {
    "exercises": [
      {
        "name": "Incline Dumbbell Bench Press",
        "sets": 3,
        "reps": 10,
        "rest_time_seconds": 90,
        "rationale": "Targeting the upper portion of the chest while minimizing strain on the shoulder due to the incline angle, this exercise aligns with the hypertrophy goal and accommodates the user's shoulder injury."
      },
      {
        "name": "Dumbbell Hammer Curl",
        "sets": 3,
        "reps": 12,
        "rest_time_seconds": 60,
        "rationale": "Focuses on the biceps brachii and brachialis, promoting arm muscle growth and ensuring a different grip style to reduce overuse injuries. This fits the user's goal for arm hypertrophy."
      },
      {
        "name": "Hip Thrust",
        "sets": 3,
        "reps": 10,
        "rest_time_seconds": 90,
        "rationale": "A powerful glute-building exercise, this isolates the glutes effectively, matching the user's goal while avoiding undue strain on the shoulders."
      }
    ],
    "total_duration_minutes": 30
    "muscle_groups_targeted": "xxxxx"
    "joint_groups_affected": "xxxxx"
    "equipment_needed": "xxxxx"
  }
}