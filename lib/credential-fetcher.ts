/**
 * Credential Fetcher
 *
 * SECURITY: Steps should fetch credentials at runtime using only an integration ID reference.
 * This ensures credentials are never passed as step parameters (not logged in observability).
 *
 * NOTE: Most integrations (Resend, Linear, Slack, etc.) are now handled by Membrane.
 * This file only handles System actions that still need credentials (like Database Query).
 */
import "server-only";

import { getIntegrationById, type IntegrationConfig } from "./db/integrations";

export type WorkflowCredentials = {
  DATABASE_URL?: string;
};

function mapDatabaseConfig(config: IntegrationConfig): WorkflowCredentials {
  const creds: WorkflowCredentials = {};
  if (config.url) {
    creds.DATABASE_URL = config.url;
  }
  return creds;
}

/**
 * Fetch credentials for an integration by ID
 *
 * @param integrationId - The ID of the integration to fetch credentials for
 * @returns WorkflowCredentials object with the integration's credentials
 */
export async function fetchCredentials(
  integrationId: string
): Promise<WorkflowCredentials> {
  console.log("[Credential Fetcher] Fetching integration:", integrationId);

  const integration = await getIntegrationById(integrationId);

  if (!integration) {
    console.log("[Credential Fetcher] Integration not found");
    return {};
  }

  console.log("[Credential Fetcher] Found integration:", integration.type);

  // Only database integration needs credentials now
  // Other integrations (Resend, Linear, Slack, etc.) are handled by Membrane
  if (integration.type === "database") {
    const credentials = mapDatabaseConfig(integration.config);
    console.log("[Credential Fetcher] Returning database credentials");
    return credentials;
  }

  return {};
}
