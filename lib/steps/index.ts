/**
 * Step registry - maps action types to executable step functions
 * This allows the workflow executor to call step functions directly
 * without code generation or eval()
 * 
 * NOTE: Integration actions (Send Email, Slack, Linear, etc.) now run through Membrane SDK
 * Only System actions are registered here
 */

import type { conditionStep } from "./condition";
import type { databaseQueryStep } from "./database-query";
import type { httpRequestStep } from "./http-request";
import type { logNodeCompleteStep, logNodeStartStep } from "./logging";

// Step function type
export type StepFunction = (input: Record<string, unknown>) => Promise<unknown>;

// Registry of all available System action steps
// Integration actions now execute via Membrane SDK
export const stepRegistry: Record<string, StepFunction> = {
  "HTTP Request": async (input) =>
    (await import("./http-request")).httpRequestStep(
      input as Parameters<typeof httpRequestStep>[0]
    ),
  "Database Query": async (input) =>
    (await import("./database-query")).databaseQueryStep(
      input as Parameters<typeof databaseQueryStep>[0]
    ),
  Condition: async (input) =>
    (await import("./condition")).conditionStep(
      input as Parameters<typeof conditionStep>[0]
    ),
  "Log Node Start": async (input) =>
    (await import("./logging")).logNodeStartStep(
      input as Parameters<typeof logNodeStartStep>[0]
    ),
  "Log Node Complete": async (input) =>
    (await import("./logging")).logNodeCompleteStep(
      input as Parameters<typeof logNodeCompleteStep>[0]
    ),
};

// Helper to check if a step exists
export function hasStep(actionType: string): boolean {
  return actionType in stepRegistry;
}

// Helper to get a step function
export function getStep(actionType: string): StepFunction | undefined {
  return stepRegistry[actionType];
}
