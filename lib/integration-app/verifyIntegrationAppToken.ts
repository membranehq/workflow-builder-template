import { verify, type JwtPayload } from "jsonwebtoken";

export const verifyIntegrationAppToken = (token: string): JwtPayload => {
  if (!process.env.INTEGRATION_APP_WORKSPACE_SECRET) {
    throw new Error("INTEGRATION_APP_WORKSPACE_SECRET is not set");
  }

  try {
    const decoded = verify(token, process.env.INTEGRATION_APP_WORKSPACE_SECRET);
    return decoded as JwtPayload;
  } catch (error) {
    console.error("Error verifying integration token:", error);
    throw new Error("Invalid integration token");
  }
};


