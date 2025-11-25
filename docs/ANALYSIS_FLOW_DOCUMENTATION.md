# Health Analysis Flow - Complete Documentation

## 🔄 Flow Overview

```
User clicks "Analysis" button
    ↓
Frontend: handleGenerateAnalysis()
    ↓
POST /api/measurements/analyze
    ↓
Backend: Fetch data + Call OpenAI
    ↓
Store analysis in health_analyses table
    ↓
Redirect to /protected/measurements/analysis/[id]
    ↓
Display analysis results
```

---

## 📱 Frontend Flow

### **Entry Point: Measurements Page**
**File:** `app/protected/measurements/page.tsx`

**Button Location:** Lines 202-209
```tsx
<button
  onClick={handleGenerateAnalysis}
  disabled={isGeneratingAnalysis || !hasMetrics}
  className="..."
>
  <Activity className="h-3 w-3" />
  {isGeneratingAnalysis ? 'Analyzing...' : 'Analysis'}
</button>
```

**Handler Function:** Lines 162-185
```tsx
const handleGenerateAnalysis = async () => {
  setIsGeneratingAnalysis(true)
  try {
    const response = await fetch('/api/measurements/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to generate analysis')
    }

    const result = await response.json()

    // Redirect to analysis page
    window.location.href = `/protected/measurements/analysis/${result.analysis_id}`
  } catch (error: any) {
    console.error('Error generating analysis:', error)
    alert(error.message || 'Failed to generate analysis')
  } finally {
    setIsGeneratingAnalysis(false)
  }
}
```

**Key Points:**
- ✅ Button disabled when no metrics exist (`!hasMetrics`)
- ✅ Loading state managed (`isGeneratingAnalysis`)
- ✅ Error handling with user-friendly alerts
- ⚠️ Uses `window.location.href` (full page reload) instead of Next.js router
- ⚠️ No loading indicator beyond button text change

---

## 🔧 Backend API Flow

### **API Endpoint**
**File:** `app/api/measurements/analyze/route.ts`

### **Step 1: Authentication** (Lines 167-174)
```tsx
const supabase = await createClient()
const { data: { user }, error: authError } = await supabase.auth.getUser()

if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### **Step 2: Parallel Data Fetching** (Lines 177-209)
**OPTIMIZATION:** Uses `Promise.all()` for parallel queries

```tsx
const [profileResult, measurementsResult, catalogData] = await Promise.all([
  // 1. Get user profile (age, sex)
  supabase.from('profiles').select('age, sex').eq('id', user.id).single(),
  
  // 2. Get measurements (last 500, ordered by date)
  supabase.from('measurements')
    .select('metric, value, unit, measured_at, source')
    .eq('user_id', user.id)
    .order('measured_at', { ascending: false })
    .limit(500),
  
  // 3. Get metrics catalog (cached for 15 minutes)
  cacheHelper.getOrSet(
    cacheKeys.metricsCatalog(),
    async () => { /* fetch catalog */ },
    cacheTTL.LONG
  )
])
```

**Performance Optimizations:**
- ✅ Parallel queries (3x faster than sequential)
- ✅ Catalog caching (15-minute TTL)
- ✅ Limit to 500 measurements (~50 metrics × 10 values)

### **Step 3: Data Validation** (Lines 224-230)
```tsx
if (!measurements || measurements.length < 5) {
  return NextResponse.json(
    { error: 'Need at least 5 measurements to generate analysis' },
    { status: 400 }
  )
}
```

### **Step 4: Format Data as CSV** (Lines 120-161)
**Function:** `formatMeasurementsAsCSV()`

**Key Optimizations:**
- Takes **last 5 values per metric** (down from 10)
- Simplified CSV format: `metric,value,unit,date`
- Removes display_name, category, source (60% data reduction)
- Reduces precision: `value.toFixed(1)`

**Output Format:**
```
User Profile:
Age: 34
Sex: male

Measurements (CSV format, last 5 values per metric, newest first):
metric,value,unit,date
body_weight,75.2,kg,2025-01-15
body_weight,75.5,kg,2025-01-10
...
```

### **Step 5: Call OpenAI** (Lines 244-260)
```tsx
const completion = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: csvData }
  ],
  temperature: 0,  // Deterministic
  response_format: { type: 'json_object' }
})
```

**System Prompt:** Lines 11-36
- **Ultra-optimized:** 600 tokens (vs 1500 tokens = 60% reduction)
- Uses abbreviated JSON keys (`sum`, `qc`, `drv`, `tr`, etc.)
- Strict schema enforcement
- Clinical focus: QC → interpret → trends → relations → risks → recommendations

**Abbreviated Response Schema:**
```json
{
  "sum": "summary text",
  "qc": [{"item":"","type":"unit/range/miss/dup/date","detail":""}],
  "norm": ["normalization notes"],
  "drv": [{"name":"","val":null,"unit":"","meth":"","inputs":[],"ok":true,"note":""}],
  "state": [{"metric":"","val":null,"unit":"","date":"","interp":""}],
  "tr": [{"metric":"","dir":"up/down/stable","d_abs":null,"d_pct":null,"start":"","end":"","cmt":""}],
  "rel": [{"between":[],"strength":"weak/mod/strong","pattern":"pos/neg/nonlin","phys":""}],
  "px": [{"finding":"","why":"","expl":[]}],
  "hyp": [{"claim":"","ev":[],"alt":[]}],
  "risk": [{"area":"","lvl":"low/mod/high","why":""}],
  "next": {
    "labs": [{"test":"","why":"","when":""}],
    "life": [],
    "clinic": []
  },
  "unc": [],
  "gaps": []
}
```

### **Step 6: Map Response to Full Schema** (Lines 39-110)
**Function:** `mapAbbreviatedResponse()`

Expands abbreviated keys to full field names:
- `sum` → `summary`
- `qc` → `qc_issues`
- `drv` → `derived_metrics`
- `tr` → `trends`
- etc.

### **Step 7: Store in Database** (Lines 274-306)
```tsx
const { data: analysis, error: insertError } = await supabase
  .from('health_analyses')
  .insert({
    user_id: user.id,
    user_age: profile.age,
    user_sex: profile.sex,
    measurements_snapshot: csvData,
    metrics_count: metricsCount,
    date_range_start: dateRangeStart,
    date_range_end: dateRangeEnd,
    ai_provider: 'openai',
    model_version: completion.model,
    prompt_tokens: completion.usage?.prompt_tokens,
    completion_tokens: completion.usage?.completion_tokens,
    total_cost: ((completion.usage?.prompt_tokens || 0) * 0.0025 + (completion.usage?.completion_tokens || 0) * 0.01) / 1000,
    summary: analysisData.summary,
    qc_issues: analysisData.qc_issues,
    // ... all other fields
    full_response: analysisData,
    status: 'completed'
  })
  .select()
  .single()
```

**Cost Calculation:**
- Prompt tokens: $0.0025 per 1K tokens
- Completion tokens: $0.01 per 1K tokens

### **Step 8: Return Response** (Lines 316-328)
```tsx
return NextResponse.json({
  analysis_id: analysis.id,
  status: 'completed',
  data: analysisData,
  ...(process.env.NODE_ENV === 'development' && {
    performance: {
      total_ms: totalTime,
      db_ms: dbTime,
      ai_ms: aiTime,
      tokens: completion.usage
    }
  })
})
```

---

## 🗄️ Database Schema

### **Table: health_analyses**
**File:** `supabase/migrations/20250217_create_health_analyses_table.sql`

**Key Fields:**
```sql
CREATE TABLE health_analyses (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  
  -- Metadata
  created_at TIMESTAMPTZ,
  analysis_date TIMESTAMPTZ,
  
  -- Input snapshot
  user_age INTEGER,
  user_sex TEXT,
  measurements_snapshot TEXT,  -- CSV format
  metrics_count INTEGER,
  date_range_start TIMESTAMPTZ,
  date_range_end TIMESTAMPTZ,
  
  -- AI provider info
  ai_provider TEXT DEFAULT 'openai',
  model_version TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_cost DECIMAL(10,4),
  
  -- Analysis results (JSONB)
  summary TEXT,
  qc_issues JSONB,
  normalization_notes JSONB,
  derived_metrics JSONB,
  current_state JSONB,
  trends JSONB,
  correlations JSONB,
  paradoxes JSONB,
  hypotheses JSONB,
  risk_assessment JSONB,
  recommendations_next_steps JSONB,
  uncertainties JSONB,
  data_gaps JSONB,
  full_response JSONB,
  
  -- Status
  status TEXT DEFAULT 'completed',
  error_message TEXT,
  
  -- User interaction
  user_rating INTEGER,
  user_feedback TEXT,
  is_archived BOOLEAN DEFAULT false
);
```

**Indexes:**
- `idx_health_analyses_user_date` - Fast user queries by date
- `idx_health_analyses_status` - Track processing analyses

**RLS Policies:**
- ✅ Users can only view/insert/update/delete their own analyses
- ✅ Tied to `auth.uid()`

---

## 📊 Analysis Display Page

**File:** `app/protected/measurements/analysis/[id]/page.tsx`

**Route:** `/protected/measurements/analysis/[analysis_id]`

This page fetches and displays the analysis results from the `health_analyses` table.

---

## ⚡ Performance Characteristics

### **Typical Timing:**
- **DB queries:** 100-300ms (parallel)
- **OpenAI API:** 3-8 seconds (depends on data size)
- **Total:** 3-9 seconds

### **Token Usage:**
- **Prompt:** ~600-1200 tokens (depends on data)
- **Completion:** ~800-2000 tokens (depends on complexity)
- **Cost:** ~$0.02-0.05 per analysis

### **Data Limits:**
- Max 500 measurements fetched
- Last 5 values per metric sent to AI
- Minimum 5 measurements required

---

## 🐛 Potential Issues & Improvements

### **Current Issues:**

1. **❌ No Loading UI**
   - Button text changes but no spinner/progress indicator
   - User doesn't know how long it will take (3-9 seconds)
   - **Fix:** Add loading modal with progress text

2. **❌ Full Page Reload**
   - Uses `window.location.href` instead of Next.js router
   - Loses React state
   - **Fix:** Use `router.push()` from `next/navigation`

3. **❌ No Error Recovery**
   - Alert box for errors (poor UX)
   - No retry mechanism
   - **Fix:** Toast notifications + retry button

4. **❌ No Rate Limiting**
   - User can spam the button
   - Could generate multiple analyses quickly
   - **Fix:** Debounce or check for recent analysis

5. **❌ No Caching**
   - Regenerates analysis every time
   - Could cache for X hours if data hasn't changed
   - **Fix:** Check if recent analysis exists

6. **⚠️ Hardcoded Limits**
   - 500 measurements, 5 per metric
   - No configuration
   - **Consider:** Make configurable

7. **⚠️ No Streaming**
   - User waits for entire response
   - Could stream partial results
   - **Consider:** OpenAI streaming API

### **Security Considerations:**

✅ **Good:**
- RLS policies enforce user isolation
- Authentication checked
- No SQL injection risk (using Supabase client)

⚠️ **Consider:**
- Rate limiting per user (prevent API abuse)
- Cost tracking per user
- Maximum analyses per day/month

---

## 🔧 Recommended Improvements

### **Priority 1: UX Improvements**
```tsx
// Better loading state
const [analysisProgress, setAnalysisProgress] = useState<string>('')

const handleGenerateAnalysis = async () => {
  setIsGeneratingAnalysis(true)
  setAnalysisProgress('Fetching your measurements...')
  
  try {
    const response = await fetch('/api/measurements/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    
    setAnalysisProgress('Analyzing with AI...')
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to generate analysis')
    }

    const result = await response.json()
    
    setAnalysisProgress('Complete! Redirecting...')
    
    // Use Next.js router instead of window.location
    router.push(`/protected/measurements/analysis/${result.analysis_id}`)
  } catch (error: any) {
    console.error('Error generating analysis:', error)
    toast.error(error.message || 'Failed to generate analysis')
  } finally {
    setIsGeneratingAnalysis(false)
    setAnalysisProgress('')
  }
}
```

### **Priority 2: Add Loading Modal**
```tsx
{isGeneratingAnalysis && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 max-w-md">
      <div className="animate-spin h-12 w-12 border-4 border-emerald-400 border-t-transparent rounded-full mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-white text-center mb-2">
        Generating Analysis
      </h3>
      <p className="text-sm text-white/60 text-center">
        {analysisProgress || 'This may take 5-10 seconds...'}
      </p>
    </div>
  </div>
)}
```

### **Priority 3: Check for Recent Analysis**
```tsx
// Before generating, check if recent analysis exists
const { data: recentAnalysis } = await supabase
  .from('health_analyses')
  .select('id, created_at')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
  .limit(1)
  .single()

if (recentAnalysis) {
  const hoursSince = (Date.now() - new Date(recentAnalysis.created_at).getTime()) / (1000 * 60 * 60)
  
  if (hoursSince < 1) {
    // Redirect to existing analysis
    return NextResponse.json({
      analysis_id: recentAnalysis.id,
      status: 'cached',
      message: 'Using recent analysis'
    })
  }
}
```

---

## 📈 Monitoring & Debugging

### **Key Metrics to Track:**
- Analysis generation time (total, db, ai)
- Token usage and costs
- Error rates
- User satisfaction (ratings)

### **Logging:**
```
DB queries completed in 150ms
Calling OpenAI for health analysis (12 metrics, 60 data points)...
OpenAI completed in 4500ms
Health analysis completed: abc-123-def (total: 4800ms, db: 150ms, ai: 4500ms)
```

### **Development Mode:**
Returns performance data in response:
```json
{
  "analysis_id": "...",
  "status": "completed",
  "data": { ... },
  "performance": {
    "total_ms": 4800,
    "db_ms": 150,
    "ai_ms": 4500,
    "tokens": {
      "prompt_tokens": 850,
      "completion_tokens": 1200,
      "total_tokens": 2050
    }
  }
}
```

---

## ✅ Summary

**Flow is well-designed with:**
- ✅ Parallel data fetching
- ✅ Optimized prompts (60% token reduction)
- ✅ Data caching (catalog)
- ✅ Proper RLS security
- ✅ Cost tracking
- ✅ Error handling

**Needs improvement:**
- ❌ Loading UX (no progress indicator)
- ❌ Error UX (alerts instead of toasts)
- ❌ No caching of analyses
- ❌ No rate limiting
- ❌ Full page reload instead of SPA navigation

**Overall:** Solid implementation with room for UX polish!
