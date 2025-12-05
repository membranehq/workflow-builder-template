/**
 * Step function for generating Membrane integration app tokens
 * This must be a step function because it uses Node.js crypto module via jsonwebtoken
 */

import { generateIntegrationAppCustomerAccessToken } from "../integration-app/generateCustomerAccessToken";
import type { WorkflowUser } from "../workflow-executor.workflow";

export interface GenerateTokenStepInput {
  user: WorkflowUser;
}

export interface GenerateTokenStepOutput {
  token: string;
}

export async function generateTokenStep(
  input: GenerateTokenStepInput
): Promise<GenerateTokenStepOutput> {
  "use step";

  const { user } = input;

  const token = await generateIntegrationAppCustomerAccessToken({
    id: user.id,
    name: user.name,
    email: user.email,
  });

  return {
    token,
  };
}