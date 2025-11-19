import { z } from 'zod'

export const AnalysisSchema = z.object({
  sum: z.string().optional().default(''),
  qc: z.array(z.object({
    item: z.string().optional().default(''),
    type: z.string().optional().default(''),
    detail: z.string().optional().default('')
  })).optional().default([]),
  norm: z.array(z.string()).optional().default([]),
  drv: z.array(z.object({
    name: z.string().optional().default(''),
    val: z.number().nullable().optional(),
    unit: z.string().optional().default(''),
    meth: z.string().optional().default(''),
    inputs: z.array(z.string()).optional().default([]),
    ok: z.boolean().optional().default(true),
    note: z.string().optional().default('')
  })).optional().default([]),
  state: z.array(z.object({
    metric: z.string().optional().default(''),
    val: z.number().nullable().optional(),
    unit: z.string().optional().default(''),
    date: z.string().optional().default(''),
    interp: z.string().optional().default('')
  })).optional().default([]),
  tr: z.array(z.object({
    metric: z.string().optional().default(''),
    dir: z.string().optional().default(''),
    d_abs: z.number().nullable().optional(),
    d_pct: z.number().nullable().optional(),
    start: z.string().optional().default(''),
    end: z.string().optional().default(''),
    cmt: z.string().optional().default('')
  })).optional().default([]),
  rel: z.array(z.object({
    between: z.array(z.string()).optional().default([]),
    strength: z.string().optional().default(''),
    pattern: z.string().optional().default(''),
    phys: z.string().optional().default('')
  })).optional().default([]),
  px: z.array(z.object({
    finding: z.string().optional().default(''),
    why: z.string().optional().default(''),
    expl: z.array(z.string()).optional().default([])
  })).optional().default([]),
  hyp: z.array(z.object({
    claim: z.string().optional().default(''),
    ev: z.array(z.string()).optional().default([]),
    alt: z.array(z.string()).optional().default([])
  })).optional().default([]),
  risk: z.array(z.object({
    area: z.string().optional().default(''),
    lvl: z.string().optional().default(''),
    why: z.union([
      z.string(),
      z.object({ rationale: z.string().optional() })
    ]).transform(val => typeof val === 'string' ? val : val.rationale || '')
  })).optional().default([]),
  next: z.object({
    labs: z.array(z.object({
      test: z.string().optional().default(''),
      why: z.union([
        z.string(),
        z.object({ rationale: z.string().optional() })
      ]).transform(val => typeof val === 'string' ? val : val.rationale || '').optional().default(''),
      when: z.string().optional().default('')
    })).optional().default([]),
    life: z.array(z.union([
        z.string(),
        z.object({ text: z.string().optional(), action: z.string().optional() })
      ]).transform(val => typeof val === 'string' ? val : val.text || val.action || JSON.stringify(val))
    ).optional().default([]),
    clinic: z.array(z.union([
        z.string(),
        z.object({ text: z.string().optional(), action: z.string().optional() })
      ]).transform(val => typeof val === 'string' ? val : val.text || val.action || JSON.stringify(val))
    ).optional().default([])
  }).optional().default({ labs: [], life: [], clinic: [] }),
  unc: z.array(z.string()).optional().default([]),
  gaps: z.array(z.string()).optional().default([])
});

export type AnalysisResponse = z.infer<typeof AnalysisSchema>;
