/**
 * Step function for executing Membrane actions
 * This must be a step function because IntegrationAppClient uses Node.js modules like axios
 */

import { IntegrationAppClient } from "@membranehq/sdk";
import { generateIntegrationAppCustomerAccessToken } from "../integration-app/generateCustomerAccessToken";
import type { WorkflowUser } from "../workflow-executor.workflow";

export interface MembraneActionStepInput {
  actionId: string;
  input: Record<string, unknown>;
  user: WorkflowUser;
}

export interface MembraneActionStepOutput {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function membraneActionStep(
  input: MembraneActionStepInput
): Promise<MembraneActionStepOutput> {
  "use step";

  const { actionId, input: membraneInput, user } = input;

  try {
    // Generate token
    const membraneToken = await generateIntegrationAppCustomerAccessToken({
      id: user.id,
      name: user.name,
      email: user.email,
    });

    // Create Membrane client
    const membraneClient = new IntegrationAppClient({
      token: membraneToken,
    });

    console.log("[Membrane Action] Executing:", {
      actionId,
      inputKeys: Object.keys(membraneInput),
    });

    // Execute the action on Membrane
    const result = await membraneClient
      .action(actionId)
      .run(membraneInput);

    console.log("[Membrane Action] Success:", {
      hasResult: !!result,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("[Membrane Action] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error executing Membrane action",
    };
  }
}