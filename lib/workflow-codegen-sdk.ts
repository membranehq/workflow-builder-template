import "server-only";

// Import codegen templates for System actions only
import conditionTemplate from "./codegen-templates/condition";
import databaseQueryTemplate from "./codegen-templates/database-query";
import httpRequestTemplate from "./codegen-templates/http-request";
import {
  ARRAY_INDEX_PATTERN,
  analyzeNodeUsage,
  buildEdgeMap,
  escapeForTemplateLiteral,
  findTriggerNodes,
  sanitizeFunctionName,
  sanitizeStepName,
  sanitizeVarName,
} from "./workflow-codegen-shared";
import type { WorkflowEdge, WorkflowNode } from "./workflow-store";

/**
 * Load step implementation from templates
 */
const FUNCTION_BODY_REGEX =
  /export\s+(?:async\s+)?function\s+\w+\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{([\s\S]*)\}/;

function loadStepImplementation(actionType: string): string | null {
  // Only System actions have codegen templates
  // Integration actions now run through Membrane SDK
  const templateMap: Record<string, string> = {
    "Database Query": databaseQueryTemplate,
    "HTTP Request": httpRequestTemplate,
    Condition: conditionTemplate,
  };

  const template = templateMap[actionType];
  if (!template) {
    return null;
  }

  try {
    // Extract just the function body (remove export statement and function declaration)
    const functionMatch = template.match(FUNCTION_BODY_REGEX);

    if (functionMatch) {
      return functionMatch[1].trim();
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Process new format ID references (@nodeId:DisplayName)
 */
function processNewFormatID(trimmed: string, match: string): string {
  const withoutAt = trimmed.substring(1);
  const colonIndex = withoutAt.indexOf(":");

  if (colonIndex === -1) {
    return match; // Invalid format, keep original
  }

  const nodeId = withoutAt.substring(0, colonIndex);
  const rest = withoutAt.substring(colonIndex + 1);
  const dotIndex = rest.indexOf(".");
  const fieldPath = dotIndex !== -1 ? rest.substring(dotIndex + 1) : "";

  const sanitizedNodeId = nodeId.replace(/[^a-zA-Z0-9]/g, "_");

  if (!fieldPath) {
    return `\${outputs?.['${sanitizedNodeId}']?.data}`;
  }

  const accessPath = fieldPath
    .split(".")
    .map((part: string) => {
      const arrayMatch = part.match(ARRAY_INDEX_PATTERN);
      if (arrayMatch) {
        return `?.${arrayMatch[1]}?.[${arrayMatch[2]}]`;
      }
      return `?.${part}`;
    })
    .join("");

  return `\${outputs?.['${sanitizedNodeId}']?.data${accessPath}}`;
}

/**
 * Process legacy dollar references ($nodeId)
 */
function processLegacyDollarRef(trimmed: string): string {
  const withoutDollar = trimmed.substring(1);

  if (!(withoutDollar.includes(".") || withoutDollar.includes("["))) {
    const sanitizedNodeId = withoutDollar.replace(/[^a-zA-Z0-9]/g, "_");
    return `\${outputs?.['${sanitizedNodeId}']?.data}`;
  }

  const parts = withoutDollar.split(".");
  const nodeId = parts[0];
  const sanitizedNodeId = nodeId.replace(/[^a-zA-Z0-9]/g, "_");
  const fieldPath = parts.slice(1).join(".");

  if (!fieldPath) {
    return `\${outputs?.['${sanitizedNodeId}']?.data}`;
  }

  const accessPath = fieldPath
    .split(".")
    .map((part: string) => {
      const arrayMatch = part.match(ARRAY_INDEX_PATTERN);
      if (arrayMatch) {
        return `?.${arrayMatch[1]}?.[${arrayMatch[2]}]`;
      }
      return `?.${part}`;
    })
    .join("");

  return `\${outputs?.['${sanitizedNodeId}']?.data${accessPath}}`;
}

/**
 * Convert template variables to JavaScript expressions
 * Converts {{@nodeId:DisplayName.field}} to ${outputs?.['nodeId']?.data?.field}
 */
function convertTemplateToJS(template: string): string {
  if (!template || typeof template !== "string") {
    return template;
  }

  const pattern = /\{\{([^}]+)\}\}/g;

  return template.replace(pattern, (match, expression) => {
    const trimmed = expression.trim();

    if (trimmed.startsWith("@")) {
      return processNewFormatID(trimmed, match);
    }

    if (trimmed.startsWith("$")) {
      return processLegacyDollarRef(trimmed);
    }

    return match;
  });
}

// Helper to generate Database Query step body
function _generateDatabaseQueryStepBody(
  config: Record<string, unknown>
): string {
  const dbQuery = (config.dbQuery as string) || "SELECT 1";
  const convertedQuery = convertTemplateToJS(dbQuery);

  return `  // Database Query - You need to set up your database connection
  // Install: pnpm add postgres (or your preferred database library)
  // Set DATABASE_URL in your environment variables
  
  // Use template literal with dynamic values from outputs
  const query = \`${escapeForTemplateLiteral(convertedQuery)}\`;
  const finalQuery = (input.dbQuery as string) || query;
  
  // Example using postgres library:
  // import postgres from 'postgres';
  // const sql = postgres(process.env.DATABASE_URL!);
  // const result = await sql.unsafe(finalQuery);
  // await sql.end();
  
  throw new Error('Database Query not implemented - see comments in generated code');`;
}

// Helper to generate HTTP Request step body
function _generateHTTPRequestStepBody(config: Record<string, unknown>): string {
  let headersCode = "'Content-Type': 'application/json'";
  if (config.httpHeaders) {
    try {
      const headers =
        typeof config.httpHeaders === "string"
          ? JSON.parse(config.httpHeaders as string)
          : config.httpHeaders;
      const headerEntries = Object.entries(headers as Record<string, string>)
        .map(([key, value]) => `'${key}': '${value}'`)
        .join(",\n      ");
      if (headerEntries) {
        headersCode = headerEntries;
      }
    } catch {
      headersCode = "'Content-Type': 'application/json'";
    }
  }

  return `  const response = await fetch('${config.endpoint || "https://api.example.com"}', {
    method: '${config.httpMethod || "POST"}',
    headers: {
      ${headersCode}
    },
    body: JSON.stringify(input),
  });
  
  const data = await response.json();
  return data;`;
}

// Helper to analyze which node outputs are used (extended from shared for SDK)
function analyzeNodeUsageSDK(nodes: WorkflowNode[]): Set<string> {
  const usedNodes = analyzeNodeUsage(nodes);

  // Always mark the last node as used (it's returned)
  const lastNode = nodes.at(-1);
  if (lastNode) {
    usedNodes.add(lastNode.id);
  }

  return usedNodes;
}

// Helper to create step name mapping
function createStepNameMapping(nodes: WorkflowNode[]): Map<string, string> {
  const stepNameCounts = new Map<string, number>();
  const nodeToStepName = new Map<string, string>();

  for (const node of nodes) {
    if (node.data.type === "action") {
      const config = node.data.config || {};
      const actionType = config.actionType as string;
      const baseLabel = node.data.label || actionType || "UnnamedStep";
      const baseName = sanitizeStepName(baseLabel);

      const count = stepNameCounts.get(baseName) || 0;
      stepNameCounts.set(baseName, count + 1);

      const uniqueName = count > 0 ? `${baseName}${count + 1}` : baseName;
      nodeToStepName.set(node.id, uniqueName);
    }
  }

  return nodeToStepName;
}

// Helper to generate all step functions
function generateAllStepFunctions(
  nodes: WorkflowNode[],
  nodeToStepName: Map<string, string>,
  generateStepFunc: (node: WorkflowNode, name?: string) => string
): string[] {
  const stepFunctions: string[] = [];

  for (const node of nodes) {
    if (node.data.type === "action") {
      const uniqueName = nodeToStepName.get(node.id);
      stepFunctions.push(generateStepFunc(node, uniqueName));
    }
  }

  return stepFunctions;
}

/**
 * Generate workflow SDK code from workflow definition
 * This generates proper "use workflow" and "use step" code
 */
export function generateWorkflowSDKCode(
  workflowName: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): string {
  const imports = new Set<string>();
  const stepFunctions: string[] = [];

  // Build a map of node connections
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edgesBySource = buildEdgeMap(edges);

  // Find trigger nodes
  const triggerNodes = findTriggerNodes(nodes, edges);

  // Analyze which node outputs are actually used
  const usedNodeOutputs = analyzeNodeUsageSDK(nodes);

  // Always import sleep and FatalError
  imports.add("import { sleep, FatalError } from 'workflow';");

  function buildDatabaseParams(config: Record<string, unknown>): string[] {
    return [
      `query: \`${convertTemplateToJS((config.dbQuery as string) || "SELECT 1")}\``,
    ];
  }

  function buildHttpParams(config: Record<string, unknown>): string[] {
    const params = [
      `url: "${config.endpoint || "https://api.example.com/endpoint"}"`,
      `method: "${config.httpMethod || "POST"}"`,
      `headers: ${config.httpHeaders || "{}"}`,
    ];
    if (config.httpBody) {
      params.push(`body: ${config.httpBody}`);
    }
    return params;
  }

  function buildConditionParams(config: Record<string, unknown>): string[] {
    return [
      `condition: ${convertTemplateToJS((config.condition as string) || "true")}`,
    ];
  }

  function buildStepInputParams(
    actionType: string,
    config: Record<string, unknown>
  ): string[] {
    // Only System actions are supported
    // Integration actions now run through Membrane SDK
    const paramBuilders: Record<string, () => string[]> = {
      "Database Query": () => buildDatabaseParams(config),
      "HTTP Request": () => buildHttpParams(config),
      Condition: () => buildConditionParams(config),
    };

    const builder = paramBuilders[actionType];
    return builder ? builder() : [];
  }

  function generateStepFunction(
    node: WorkflowNode,
    uniqueStepName?: string
  ): string {
    const config = node.data.config || {};
    const actionType = config.actionType as string;
    const label = node.data.label || actionType || "UnnamedStep";
    const stepName = uniqueStepName || sanitizeStepName(label);

    const stepImplementation = loadStepImplementation(actionType);

    let stepBody: string;
    if (stepImplementation && node.data.type === "action") {
      const inputParams = buildStepInputParams(actionType, config);
      stepBody = `  // Call step function with constructed input
  const stepInput = {
    ${inputParams.join(",\n    ")}
  };

      // Execute step implementation
      ${stepImplementation}`;
    } else {
      stepBody = "  return { success: true };";
    }

    return `async function ${stepName}(input: Record<string, unknown> & { outputs?: Record<string, { label: string; data: unknown }> }) {
  "use step";
  
${stepBody}
}`;
  }

  // Generate all step functions with unique names
  const nodeToStepName = createStepNameMapping(nodes);
  stepFunctions.push(
    ...generateAllStepFunctions(nodes, nodeToStepName, generateStepFunction)
  );

  // Helper to generate trigger node code
  function generateTriggerCode(
    nodeId: string,
    label: string,
    indent: string
  ): string[] {
    // Skip trigger code if trigger outputs aren't used
    if (!usedNodeOutputs.has(nodeId)) {
      return [`${indent}// Trigger (outputs not used)`];
    }

    const varName = `result_${sanitizeVarName(nodeId)}`;
    return [
      `${indent}// Triggered`,
      `${indent}let ${varName} = input;`,
      `${indent}outputs['${sanitizeVarName(nodeId)}'] = { label: '${label}', data: ${varName} };`,
    ];
  }

  // Helper to generate action/transform node code
  function generateActionTransformCode(
    nodeId: string,
    nodeConfig: Record<string, unknown>,
    label: string,
    indent: string
  ): string[] {
    const nodeActionType = nodeConfig.actionType as string;
    const nodeLabel = label || nodeActionType || "UnnamedStep";
    const stepFnName =
      nodeToStepName.get(nodeId) || sanitizeStepName(nodeLabel);

    const lines: string[] = [`${indent}// ${nodeLabel}`];

    // Check if this node's output is used by any downstream node
    const outputIsUsed = usedNodeOutputs.has(nodeId);

    if (outputIsUsed) {
      const varName = `result_${sanitizeVarName(nodeId)}`;
      lines.push(
        `${indent}const ${varName} = await ${stepFnName}({ ...input, outputs });`
      );
      lines.push(
        `${indent}outputs['${sanitizeVarName(nodeId)}'] = { label: '${nodeLabel}', data: ${varName} };`
      );
    } else {
      // If output not used, don't store the result in a variable
      lines.push(`${indent}await ${stepFnName}({ ...input, outputs });`);
    }

    return lines;
  }

  // Helper to generate condition node code
  function generateConditionCode(
    nodeId: string,
    node: WorkflowNode,
    indent: string,
    visitedLocal: Set<string>
  ): string[] {
    const condition = (node.data.config?.condition as string) || "true";
    const convertedCondition = convertTemplateToJS(condition);
    const nextNodes = edgesBySource.get(nodeId) || [];
    const conditionVarName = `conditionValue_${sanitizeVarName(nodeId)}`;
    const lines: string[] = [];

    if (nextNodes.length > 0) {
      lines.push(`${indent}// ${node.data.label}`);
      lines.push(
        `${indent}const ${conditionVarName} = \`${escapeForTemplateLiteral(convertedCondition)}\`;`
      );
      lines.push(`${indent}if (${conditionVarName}) {`);

      if (nextNodes[0]) {
        lines.push(
          ...generateWorkflowBody(nextNodes[0], `${indent}  `, visitedLocal)
        );
      }

      if (nextNodes[1]) {
        lines.push(`${indent}} else {`);
        lines.push(
          ...generateWorkflowBody(nextNodes[1], `${indent}  `, visitedLocal)
        );
      }

      lines.push(`${indent}}`);
    }

    return lines;
  }

  // Generate main workflow function
  function generateWorkflowBody(
    nodeId: string,
    indent = "  ",
    visitedLocal: Set<string> = new Set()
  ): string[] {
    if (visitedLocal.has(nodeId)) {
      return [];
    }

    visitedLocal.add(nodeId);
    const node = nodeMap.get(nodeId);
    if (!node) {
      return [];
    }

    const lines: string[] = [];

    switch (node.data.type) {
      case "trigger":
        lines.push(...generateTriggerCode(nodeId, node.data.label, indent));
        break;

      case "action": {
        const actionType = node.data.config?.actionType as string;
        // Handle condition as an action type
        if (actionType === "Condition") {
          lines.push(
            ...generateConditionCode(nodeId, node, indent, visitedLocal)
          );
          // Conditions handle their own next nodes
          return lines;
        }
        lines.push(
          ...generateActionTransformCode(
            nodeId,
            node.data.config || {},
            node.data.label,
            indent
          )
        );
        break;
      }

      default:
        lines.push(`${indent}// Unknown node type: ${node.data.type}`);
        break;
    }

    // Process next nodes (conditions return early above)
    const nextNodes = edgesBySource.get(nodeId) || [];
    for (const nextNodeId of nextNodes) {
      lines.push(...generateWorkflowBody(nextNodeId, indent, visitedLocal));
    }

    return lines;
  }

  const workflowBody: string[] = [];

  if (triggerNodes.length === 0) {
    workflowBody.push('  return { error: "No trigger nodes" };');
  } else {
    // Initialize outputs tracking
    workflowBody.push(
      "  // Track outputs from each node for template processing"
    );
    workflowBody.push(
      "  const outputs: Record<string, { label: string; data: unknown }> = {};"
    );
    workflowBody.push("");

    for (const trigger of triggerNodes) {
      workflowBody.push(...generateWorkflowBody(trigger.id));
    }

    // Find the last node to return its result
    const lastNode = nodes.at(-1);
    if (lastNode) {
      const lastVarName = `result_${sanitizeVarName(lastNode.id)}`;
      workflowBody.push("");
      workflowBody.push(`  return ${lastVarName};`);
    }
  }

  const functionName = sanitizeFunctionName(workflowName);

  const mainFunction = `export async function ${functionName}() {
  "use workflow";
  
  // Input from workflow trigger - replace with your trigger data
  const input: Record<string, unknown> = {};
  
${workflowBody.join("\n")}
}`;

  // Combine everything
  const code = `${Array.from(imports).join("\n")}

${stepFunctions.join("\n\n")}

${mainFunction}
`;

  return code;
}
