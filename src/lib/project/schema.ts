import { z } from 'zod';

export const StepIdSchema = z.enum([
  'project',
  'problem',
  'existing',
  'target',
  'actors',
  'relations',
  'preconditions',
  'risks',
  'roles',
  'backlog',
]);
export type StepId = z.infer<typeof StepIdSchema>;

export const StageSchema = z.enum(['start', 'mid']);
export type Stage = z.infer<typeof StageSchema>;

export const AlertCodeSchema = z.enum([
  'team_no_time',
  'solution_in_problem',
  'no_evidence',
  'first_in_world',
  'app_as_goal',
  'abstract_change',
  'nobody_excluded',
  'only_users',
  'powerful_actor_unused',
  'magic_leap',
  'all_through_app',
  'build_and_they_come',
  'hypothesis_without_test',
  'all_on_one',
  'orphan_feature',
  'only_code',
]);
export type AlertCode = z.infer<typeof AlertCodeSchema>;

const StepStateSchema = z.object({
  status: z.enum(['untouched', 'in_progress', 'done']),
  messages: z
    .array(
      z.object({
        role: z.enum(['assistant', 'user']),
        content: z.string().max(4000),
      }),
    )
    .max(60),
});

const stepsShape = Object.fromEntries(
  StepIdSchema.options.map((id) => [id, StepStateSchema]),
) as Record<StepId, typeof StepStateSchema>;

export const ProjectSchema = z.object({
  version: z.literal(1),
  project: z.object({
    name: z.string().max(120),
    description: z.string().max(2000),
    stage: z.enum(['idea', 'prototype', 'live']).nullable(),
    area: z.string().max(120),
    links: z.array(z.string().url()).max(10),
    motivation: z.string().max(1000),
    contact: z.string().max(200),
  }),
  team: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().max(80),
        skills: z.array(z.string().max(60)).max(20),
        hoursPerWeek: z.number().min(0).max(80),
      }),
    )
    .max(20),
  features: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().max(300),
        /** Already works for users (true) or still planned (false); older drafts have none. */
        done: z.boolean().optional(),
      }),
    )
    .max(100),
  steps: z.object(stepsShape),
  problem: z.object({
    statement: z.string().max(1500),
    evidence: z.array(z.string().max(500)).max(10),
    verified: z.boolean(),
  }),
  existing: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().max(200),
        url: z.string().nullable(),
        difference: z.string().max(500),
      }),
    )
    .max(20),
  direction: z.string().max(500),
  targetChanges: z
    .array(z.object({ id: z.string(), text: z.string().max(300), signal: z.string().max(300) }))
    .max(3),
  actors: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().max(120),
        type: z.enum(['user', 'institution', 'ngo', 'media', 'funder', 'business', 'other']),
        power: z.enum(['low', 'medium', 'high']),
        stance: z.enum(['supports', 'neutral', 'opposes', 'unknown']),
        excluded: z.boolean(),
        /** Why the actor matters for the problem, in the dev's words; older drafts have none. */
        note: z.string().max(300).optional(),
      }),
    )
    .max(40),
  relations: z
    .array(
      z.object({
        id: z.string(),
        from: z.string(),
        to: z.string(),
        type: z.enum(['decides', 'funds', 'influences', 'blocks', 'holds_data', 'represents']),
        note: z.string().max(300),
      }),
    )
    .max(80),
  preconditions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().max(300),
        actorId: z.string().nullable(),
        stage: StageSchema,
        leadsTo: z.string(),
        coveredByApp: z.boolean(),
        assumption: z.string().max(500),
        risky: z.boolean(),
        test: z.string().max(500),
        /** Who called it risky: the dev or an AI suggestion; older drafts and manual edits have none (the dev). */
        riskBy: z.enum(['dev', 'ai']).optional(),
      }),
    )
    .max(40),
  roles: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().max(80),
        reason: z.string().max(500),
        reasonRefs: z.array(z.string()),
        stage: StageSchema,
        status: z.enum(['covered', 'seeking', 'partner', 'not_needed']),
        coveredBy: z.string().nullable(),
      }),
    )
    .max(30),
  backlog: z
    .array(
      z.object({
        id: z.string(),
        stage: StageSchema,
        kind: z.enum(['feature', 'test', 'organizing']),
        featureId: z.string().nullable(),
        preconditionId: z.string().nullable(),
        text: z.string().max(300),
        order: z.number(),
      }),
    )
    .max(150),
  toFindOut: z
    .array(z.object({ id: z.string(), step: StepIdSchema, text: z.string().max(300) }))
    .max(40),
  alerts: z.array(
    z.object({
      code: AlertCodeSchema,
      step: z.number(),
      refs: z.array(z.string()),
      status: z.enum(['open', 'dismissed', 'resolved']),
      message: z.string().max(400),
    }),
  ),
  stale: z.array(z.string()),
});

export type Project = z.infer<typeof ProjectSchema>;
export type Message = Project['steps'][StepId]['messages'][number];
export type Alert = Project['alerts'][number];
