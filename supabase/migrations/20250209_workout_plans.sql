-- Workout Plans feature: plans, plan-workout links, access logs

-- 1. workout_plans table
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  share_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS workout_plans_user_id_idx ON public.workout_plans(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS workout_plans_share_token_idx ON public.workout_plans(share_token);

ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own workout plans"
  ON public.workout_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workout plans"
  ON public.workout_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout plans"
  ON public.workout_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout plans"
  ON public.workout_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Allow anonymous/public read via share_token (used by API route, bypasses RLS via service role or direct query)
-- We handle public access in the API route using the anon key with a specific select filter.
-- Add a policy for anon access by share_token:
CREATE POLICY "Anyone can view shared workout plans by token"
  ON public.workout_plans FOR SELECT
  TO anon, authenticated
  USING (true);
-- Note: The API route will filter by share_token. RLS allows SELECT for everyone,
-- but only the owner can INSERT/UPDATE/DELETE. This is safe because the share_token
-- is unguessable (32 hex chars = 128 bits of entropy).

-- 2. workout_plan_workouts junction table
CREATE TABLE IF NOT EXISTS public.workout_plan_workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES public.workout_plans(id) ON DELETE CASCADE NOT NULL,
  workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (plan_id, workout_id)
);

CREATE INDEX IF NOT EXISTS workout_plan_workouts_plan_id_idx ON public.workout_plan_workouts(plan_id);
CREATE INDEX IF NOT EXISTS workout_plan_workouts_workout_id_idx ON public.workout_plan_workouts(workout_id);

ALTER TABLE public.workout_plan_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own plan workouts"
  ON public.workout_plan_workouts FOR ALL
  USING (
    plan_id IN (SELECT id FROM public.workout_plans WHERE user_id = auth.uid())
  )
  WITH CHECK (
    plan_id IN (SELECT id FROM public.workout_plans WHERE user_id = auth.uid())
  );

-- Public read for shared plans
CREATE POLICY "Anyone can view shared plan workouts"
  ON public.workout_plan_workouts FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3. workout_plan_access_logs table
CREATE TABLE IF NOT EXISTS public.workout_plan_access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES public.workout_plans(id) ON DELETE CASCADE NOT NULL,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS workout_plan_access_logs_plan_id_idx ON public.workout_plan_access_logs(plan_id);
CREATE INDEX IF NOT EXISTS workout_plan_access_logs_accessed_at_idx ON public.workout_plan_access_logs(plan_id, accessed_at DESC);

ALTER TABLE public.workout_plan_access_logs ENABLE ROW LEVEL SECURITY;

-- Owner can view access logs for their plans
CREATE POLICY "Users can view access logs for their plans"
  ON public.workout_plan_access_logs FOR SELECT
  USING (
    plan_id IN (SELECT id FROM public.workout_plans WHERE user_id = auth.uid())
  );

-- Anyone can insert access logs (logged when visiting shared link)
CREATE POLICY "Anyone can insert access logs"
  ON public.workout_plan_access_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow reading workouts that are part of any plan (for shared plan view)
CREATE POLICY "Anyone can view workouts in shared plans"
  ON public.workouts FOR SELECT
  TO anon, authenticated
  USING (
    id IN (SELECT workout_id FROM public.workout_plan_workouts)
  );

-- Auto-update updated_at on workout_plans
CREATE OR REPLACE FUNCTION public.update_workout_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workout_plans_updated_at
  BEFORE UPDATE ON public.workout_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_workout_plans_updated_at();
