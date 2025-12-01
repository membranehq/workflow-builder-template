import { auth } from "@/lib/auth";
import { generateIntegrationAppCustomerAccessToken } from "@/lib/integration-app/generateCustomerAccessToken";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = await generateIntegrationAppCustomerAccessToken({
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    });

    return NextResponse.json({
      token,
    });
  } catch (error) {
    console.error("Error generating integration token:", error);
    return NextResponse.json(
      { error: "Failed to generate integration token" },
      { status: 500 }
    );
  }
}


