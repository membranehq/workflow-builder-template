/**
 * Code generation utilities for workflow step functions
 * 
 * NOTE: Integration actions (Send Email, Slack, Linear, etc.) now run through Membrane SDK
 * Only System action templates are imported here
 */

import conditionTemplate from "@/lib/codegen-templates/condition";
import databaseQueryTemplate from "@/lib/codegen-templates/database-query";
import httpRequestTemplate from "@/lib/codegen-templates/http-request";

// Generate code snippet for a single node
export const generateNodeCode = (node: {
  id: string;
  data: {
    type: string;
    label: string;
    description?: string;
    config?: Record<string, unknown>;
  };
}): string => {
  if (node.data.type === "trigger") {
    const triggerType = (node.data.config?.triggerType as string) || "Manual";

    if (triggerType === "Schedule") {
      const cron = (node.data.config?.scheduleCron as string) || "0 9 * * *";
      const timezone =
        (node.data.config?.scheduleTimezone as string) || "America/New_York";
      return `{
  "crons": [
    {
      "path": "/api/workflow",
      "schedule": "${cron}",
      "timezone": "${timezone}"
    }
  ]
}`;
    }

    if (triggerType === "Webhook") {
      return `import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Call your workflow function here
  await executeWorkflow(body);
  
  return Response.json({ success: true });
}`;
    }

    // Manual trigger - no code
    return "";
  }

  if (node.data.type === "action") {
    const actionType = node.data.config?.actionType as string;

    // Map System action types to templates
    // Integration actions now run through Membrane SDK and don't need templates
    switch (actionType) {
      case "Database Query":
        return databaseQueryTemplate;
      case "HTTP Request":
        return httpRequestTemplate;
      case "Condition":
        return conditionTemplate;
      default:
        // Integration actions handled by Membrane
        return `async function actionStep(input: Record<string, unknown>) {
  "use step";
  
  // This action runs through Membrane SDK
  console.log('Executing Membrane action: ${actionType}');
  return { success: true };
}`;
    }
  }

  return `async function unknownStep(input: Record<string, unknown>) {
  "use step";

  return input;
}`;
};
