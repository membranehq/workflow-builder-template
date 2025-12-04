import { type Algorithm, sign } from "jsonwebtoken";

interface TokenData {
  id: string;
  name?: string | null;
  email?: string | null;
}

export async function generateIntegrationAppCustomerAccessToken(
  tokenData: TokenData,
  expiresIn = 7200 // 2 hours
): Promise<string> {
  if (
    !process.env.INTEGRATION_APP_WORKSPACE_KEY ||
    !process.env.INTEGRATION_APP_WORKSPACE_SECRET
  ) {
    throw new Error("Integration.app credentials not configured");
  }

  try {
    const options = {
      expiresIn,
      algorithm: "HS512" as Algorithm,
    };

    return sign(
      {
        workspaceKey: process.env.INTEGRATION_APP_WORKSPACE_KEY,
        id: tokenData.id,
        name: tokenData.name || tokenData.email || tokenData.id,
        fields: {
          email: tokenData.email,
        },
      },
      process.env.INTEGRATION_APP_WORKSPACE_SECRET,
      options
    );
  } catch (error) {
    console.error("Error generating integration token:", error);
    throw new Error("Failed to generate integration token");
  }
}


