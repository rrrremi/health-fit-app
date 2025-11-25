# Workout Generation with User Inputs - Implementation Guide

## Overview
Users must select muscle groups, workout focus, and number of exercises before generating a workout. These inputs are incorporated into the AI prompt for targeted workout generation.

## User Input Fields

### 1. Muscle Focus (Multi-select, 1-4 required)
```
Options:
- Chest
- Back
- Shoulders
- Arms (Biceps/Triceps)
- Core
- Glutes
- Quads
- Hamstrings
- Calves
```

### 2. Workout Focus (Single select, required)
```
Options:
- Cardio
- Hypertrophy (muscle growth)
- Isolation (single muscle)
- Strength (heavy, low reps)
- Speed (explosive movements)
- Activation (warm-up focused)
- Stretch (flexibility)
- Mobility (range of motion)
- Plyometric (jumping/explosive)
```

### 3. Number of Exercises (Slider/Select, required)
```
Range: 1-10 exercises
Default: 4
```

### 4. Special Instructions (Optional text input)
```
- Max 140 characters
- Placeholder: "e.g., 'no jumping', 'bad knees', 'focus on form', 'use dumbbells only'"
- Added as additional rule to AI prompt
```

## UI Design

```
┌─────────────────────────────────────────┐
│  GENERATE YOUR WORKOUT                  │
├─────────────────────────────────────────┤
│  1. SELECT MUSCLE GROUPS (1-4)          │
│  ┌─────────────────────────────────┐   │
│  │ ☑ CHEST      ☐ BACK             │   │
│  │ ☐ SHOULDERS  ☐ ARMS             │   │
│  │ ☐ CORE       ☑ GLUTES           │   │
│  │ ☐ QUADS      ☑ HAMSTRINGS       │   │
│  │ ☐ CALVES                        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  2. WORKOUT FOCUS                       │
│  ┌─────────────────────────────────┐   │
│  │ ○ Cardio      ● Hypertrophy     │   │
│  │ ○ Isolation   ○ Strength        │   │
│  │ ○ Speed       ○ Activation      │   │
│  │ ○ Stretch     ○ Mobility        │   │
│  │ ○ Plyometric                    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  3. NUMBER OF EXERCISES                 │
│  ┌─────────────────────────────────┐   │
│  │ [1]━━━━━●━━━━━━━━━━━━━━━━[10]   │   │
│  │         4 exercises              │   │
│  └─────────────────────────────────┘   │
│                                         │
│  4. SPECIAL INSTRUCTIONS (Optional)     │
│  ┌─────────────────────────────────┐   │
│  │ No equipment needed, bad back   │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│  23/140 characters                      │
├─────────────────────────────────────────┤
│        [GENERATE WORKOUT]               │
└─────────────────────────────────────────┘
```

## Modified Prompt Structure

### Template with User Inputs:
```
You are a professional fitness coach and exercise scientist god.
Generate a cool workout for a user based on the following data inputs. Use logic, safety, goal alignment, and biomechanics understanding, fitness understanding, sport science understanding.

USER REQUIREMENTS:
- MUSCLE_FOCUS: [Chest, Glutes, Hamstrings]
- WORKOUT_FOCUS: [Hypertrophy]
- EXERCISE_COUNT: [4]
- SPECIAL_INSTRUCTIONS: [No equipment needed, bad back]

------------------------------
TASK:
1. Create EXACTLY [4] exercises
2. AT LEAST 75% of exercises must target the specified MUSCLE_FOCUS groups
3. ALL exercises must align with the WORKOUT_FOCUS of [Hypertrophy]
4. YOU MUST FOLLOW THIS USER INSTRUCTION: [No equipment needed, bad back]
5. Select exercises that:
   ✅ Prioritize the muscle groups in MUSCLE_FOCUS
   ✅ Match the training style of WORKOUT_FOCUS
   ✅ STRICTLY ADHERE to the SPECIAL_INSTRUCTIONS provided
   ✅ Avoid contraindications based on injuries/conditions if risky
   ✅ Respect fatigue, avoid overloading same joints in sequence
   ✅ Include scalable or regression-friendly options if needed
   ✅ Include reps info in a single number
   ✅ Focus on exercises that are most effective, where benefit to reward ratio is high

[Rest of original prompt...]
```

## Workout Focus Specific Instructions

### Add to prompt based on selected focus:

```javascript
const focusInstructions = {
  cardio: "Focus on heart rate elevation, minimal rest, circuit-style training. Include dynamic movements.",
  hypertrophy: "Use 8-12 rep range, moderate rest (60-90s), focus on time under tension and muscle fatigue.",
  isolation: "Single-joint movements, target specific muscles, higher reps (12-20), shorter rest periods.",
  strength: "Heavy compound movements, 3-6 reps, longer rest (2-3 minutes), focus on progressive overload.",
  speed: "Explosive movements, focus on velocity, include plyometrics if appropriate, full recovery between sets.",
  activation: "Light loads, focus on mind-muscle connection, prep movements, 15-20 reps, minimal rest.",
  stretch: "Include dynamic and static stretches, hold positions, focus on flexibility and range of motion.",
  mobility: "Joint-focused movements, full range of motion, controlled tempo, include mobility drills.",
  plyometric: "Jumping, bounding, explosive movements, maximum effort, full recovery between sets."
};
```

## API Implementation

### Request Structure:
```typescript
interface GenerateWorkoutRequest {
  muscle_focus: string[];      // ["chest", "glutes", "hamstrings"]
  workout_focus: string;       // "hypertrophy"
  exercise_count: number;      // 4
  special_instructions?: string; // "No equipment needed, bad back" (optional, max 140 chars)
}
```

### Validation Rules:
```typescript
// Frontend validation
const validateInputs = () => {
  const errors = [];
  
  if (muscleFocus.length < 1 || muscleFocus.length > 4) {
    errors.push("Select 1-4 muscle groups");
  }
  
  if (!workoutFocus) {
    errors.push("Select a workout focus");
  }
  
  if (exerciseCount < 1 || exerciseCount > 10) {
    errors.push("Exercise count must be 1-10");
  }
  
  if (specialInstructions && specialInstructions.length > 140) {
    errors.push("Special instructions must be 140 characters or less");
  }
  
  return errors;
};

// Backend validation
const validateRequest = (body: GenerateWorkoutRequest) => {
  const allowedMuscles = ['chest', 'back', 'shoulders', 'arms', 'core', 'glutes', 'quads', 'hamstrings', 'calves'];
  const allowedFocus = ['cardio', 'hypertrophy', 'isolation', 'strength', 'speed', 'activation', 'stretch', 'mobility', 'plyometric'];
  
  // Check all muscle groups are valid
  if (!body.muscle_focus.every(m => allowedMuscles.includes(m.toLowerCase()))) {
    throw new Error('Invalid muscle group');
  }
  
  // Check workout focus is valid
  if (!allowedFocus.includes(body.workout_focus.toLowerCase())) {
    throw new Error('Invalid workout focus');
  }
  
  // Check exercise count
  if (body.exercise_count < 1 || body.exercise_count > 10) {
    throw new Error('Exercise count must be 1-10');
  }
  
  // Check special instructions length and sanitize
  if (body.special_instructions) {
    if (body.special_instructions.length > 140) {
      throw new Error('Special instructions too long');
    }
    // Sanitize: remove any potential prompt injection
    body.special_instructions = body.special_instructions
      .replace(/[<>]/g, '') // Remove HTML-like tags
      .trim();
  }
};
```

## Database Schema Update

```sql
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS
  muscle_focus TEXT[] NOT NULL,
  workout_focus TEXT NOT NULL,
  exercise_count INTEGER NOT NULL CHECK (exercise_count >= 1 AND exercise_count <= 10),
  special_instructions TEXT CHECK (char_length(special_instructions) <= 140);
```

## Frontend State Management

```typescript
// Component state
const [muscleFocus, setMuscleFocus] = useState<string[]>([]);
const [workoutFocus, setWorkoutFocus] = useState<string>('');
const [exerciseCount, setExerciseCount] = useState<number>(4);
const [specialInstructions, setSpecialInstructions] = useState<string>('');
const [isGenerating, setIsGenerating] = useState(false);

// Character counter for special instructions
const remainingChars = 140 - specialInstructions.length;

// Generate handler
const handleGenerate = async () => {
  // Validate
  const errors = validateInputs();
  if (errors.length > 0) {
    showError(errors[0]);
    return;
  }
  
  setIsGenerating(true);
  
  try {
    const response = await fetch('/api/workouts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        muscle_focus: muscleFocus,
        workout_focus: workoutFocus,
        exercise_count: exerciseCount,
        special_instructions: specialInstructions.trim() || undefined
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      router.push(`/workouts/${data.workout_id}`);
    } else {
      showError('Failed to generate workout');
    }
  } catch (error) {
    showError('Network error');
  } finally {
    setIsGenerating(false);
  }
};
```

## Smart Prompt Construction

```typescript
const constructPrompt = (inputs: GenerateWorkoutRequest) => {
  const focusInstructions = getFocusInstructions(inputs.workout_focus);
  
  return `
You are a professional fitness coach and exercise scientist god.
Generate a cool workout for a user based on the following data inputs.

USER REQUIREMENTS:
- MUSCLE_FOCUS: ${inputs.muscle_focus.join(', ')}
- WORKOUT_FOCUS: ${inputs.workout_focus}
- EXERCISE_COUNT: ${inputs.exercise_count}
${inputs.special_instructions ? `- SPECIAL_INSTRUCTIONS: ${inputs.special_instructions}` : ''}

SPECIFIC INSTRUCTIONS FOR ${inputs.workout_focus.toUpperCase()} TRAINING:
${focusInstructions}

------------------------------
MANDATORY RULES:
1. You MUST include EXACTLY ${inputs.exercise_count} exercises - no more, no less
2. At least ${Math.ceil(inputs.exercise_count * 0.75)} exercises must directly target the muscles in MUSCLE_FOCUS
3. All exercises must align with the ${inputs.workout_focus} training style
${inputs.special_instructions ? `4. YOU MUST STRICTLY FOLLOW THIS USER INSTRUCTION: "${inputs.special_instructions}"` : ''}

${basePrompt}
`;
};
```

## Special Instructions Implementation Details

### Input Component Example:
```typescript
<div className="mb-4">
  <label className="block text-sm font-medium mb-2">
    4. SPECIAL INSTRUCTIONS (Optional)
  </label>
  <textarea
    value={specialInstructions}
    onChange={(e) => setSpecialInstructions(e.target.value)}
    maxLength={140}
    placeholder="e.g., 'no jumping', 'bad knees', 'focus on form', 'use dumbbells only'"
    className="w-full p-2 border border-black resize-none h-20"
  />
  <div className="text-right text-xs mt-1">
    {remainingChars}/140 characters
  </div>
</div>
```

### Common Use Cases for Special Instructions:
- **Injuries/Limitations**: "bad back", "knee problems", "shoulder injury"
- **Equipment**: "no equipment", "dumbbells only", "resistance bands available"
- **Environment**: "small space", "quiet apartment", "outdoor workout"
- **Preferences**: "no burpees", "love squats", "avoid planks"
- **Time/Intensity**: "low impact", "high intensity", "quick transitions"

### Security Considerations:
```typescript
// Sanitize special instructions to prevent prompt injection
const sanitizeInstructions = (text: string): string => {
  return text
    .replace(/[<>]/g, '')           // Remove potential HTML
    .replace(/["']/g, '')           // Remove quotes that could break JSON
    .replace(/\n/g, ' ')            // Replace newlines with spaces
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .trim()
    .substring(0, 140);             // Enforce length limit
};
```

## Success Criteria

- [ ] All three inputs are mandatory and validated
- [ ] Special instructions field is optional with 140 character limit
- [ ] Generate button disabled until mandatory inputs selected
- [ ] Muscle focus allows 1-4 selections
- [ ] AI generates exact number of requested exercises
- [ ] Workout matches the selected focus type
- [ ] Majority of exercises target selected muscles
- [ ] Special instructions are properly followed by AI
- [ ] Character counter shows remaining characters
- [ ] Special instructions are sanitized for security
- [ ] Clean UI with clear visual feedback
- [ ] Proper error handling for invalid combinations