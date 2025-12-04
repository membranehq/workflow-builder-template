/**
 * Step input enricher - adds API keys and credentials to step inputs
 * For test runs: uses user's stored credentials
 * For production: uses system environment variables
 */

export type CredentialSource = "user" | "system";

export type EnvVarConfig = {
  LINEAR_API_KEY?: string;
  LINEAR_TEAM_ID?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  SLACK_API_KEY?: string;
  OPENAI_API_KEY?: string;
  AI_GATEWAY_API_KEY?: string;
  DATABASE_URL?: string;
  FIRECRAWL_API_KEY?: string;
};

/**
 * Get credentials based on source
 */
export function getCredentials(
  source: CredentialSource,
  userEnvVars?: EnvVarConfig
): EnvVarConfig {
  if (source === "user" && userEnvVars) {
    return userEnvVars;
  }

  // For production, use system environment variables
  return {
    DATABASE_URL: process.env.DATABASE_URL,
  };
}

/**
 * Enrich step input with necessary credentials based on action type
 */
export function enrichStepInput(
  actionType: string,
  input: Record<string, unknown>,
  credentials: EnvVarConfig
): Record<string, unknown> {
  const enrichedInput = { ...input };

  const actionHandlers: Record<string, () => void> = {
    "Database Query": () =>
      enrichDatabaseCredentials(enrichedInput, credentials),
  };

  const handler = actionHandlers[actionType];
  if (handler) {
    handler();
  }

  return enrichedInput;
}

function enrichDatabaseCredentials(
  input: Record<string, unknown>,
  credentials: EnvVarConfig
): void {
  if (credentials.DATABASE_URL) {
    input.databaseUrl = credentials.DATABASE_URL;
  }
}
