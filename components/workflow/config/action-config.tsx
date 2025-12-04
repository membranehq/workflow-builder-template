"use client";

import { useAtom } from "jotai";
import { Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { CodeEditor } from "@/components/ui/code-editor";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TemplateBadgeInput } from "@/components/ui/template-badge-input";
import {
  currentWorkflowIdAtom,
  currentWorkflowNameAtom,
} from "@/lib/workflow-store";
import { SchemaBuilder, type SchemaField } from "./schema-builder";
import { useIntegrations, useActions, type Action, useIntegrationApp } from "@membranehq/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import Form from "@rjsf/core";
import type { RJSFSchema } from "@rjsf/utils";
import validator from "@rjsf/validator-ajv8";
import {
  CustomTextWidget,
  CustomTextareaWidget,
  CustomSelectWidget,
  CustomDateWidget,
  CustomDateTimeWidget,
  CustomTimeWidget,
  CustomCheckboxWidget,
  CustomFieldTemplate,
  CustomArrayFieldTemplate,
} from "./json-schema-form-theme";

type ActionConfigProps = {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string | Record<string, unknown>, value?: unknown) => void;
  disabled: boolean;
};

type CategoryType = "System" | "Integration";

type Category = {
  label: string;
  key: string;
  icon?: string;
  logoUri?: string;
  actions: string[];
  type: CategoryType;
};

// Database Query fields component
function DatabaseQueryFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string | Record<string, unknown>, value?: unknown) => void;
  disabled: boolean;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="dbQuery">SQL Query</Label>
        <div className="overflow-hidden rounded-md border">
          <CodeEditor
            defaultLanguage="sql"
            height="150px"
            onChange={(value) => onUpdateConfig("dbQuery", value || "")}
            options={{
              minimap: { enabled: false },
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              fontSize: 12,
              readOnly: disabled,
              wordWrap: "off",
            }}
            value={(config?.dbQuery as string) || ""}
          />
        </div>
        <p className="text-muted-foreground text-xs">
          The DATABASE_URL from your project integrations will be used to
          execute this query.
        </p>
      </div>
      <div className="space-y-2">
        <Label>Schema (Optional)</Label>
        <SchemaBuilder
          disabled={disabled}
          onChange={(schema) =>
            onUpdateConfig("dbSchema", JSON.stringify(schema))
          }
          schema={
            config?.dbSchema
              ? (JSON.parse(config.dbSchema as string) as SchemaField[])
              : []
          }
        />
      </div>
    </>
  );
}

// HTTP Request fields component
function HttpRequestFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string | Record<string, unknown>, value?: unknown) => void;
  disabled: boolean;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="httpMethod">HTTP Method</Label>
        <Select
          disabled={disabled}
          onValueChange={(value) => onUpdateConfig("httpMethod", value)}
          value={(config?.httpMethod as string) || "POST"}
        >
          <SelectTrigger className="w-full" id="httpMethod">
            <SelectValue placeholder="Select method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="PATCH">PATCH</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="endpoint">URL</Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="endpoint"
          onChange={(value) => onUpdateConfig("endpoint", value)}
          placeholder="https://api.example.com/endpoint or {{NodeName.url}}"
          value={(config?.endpoint as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="httpHeaders">Headers (JSON)</Label>
        <div className="overflow-hidden rounded-md border">
          <CodeEditor
            defaultLanguage="json"
            height="100px"
            onChange={(value) => onUpdateConfig("httpHeaders", value || "{}")}
            options={{
              minimap: { enabled: false },
              lineNumbers: "off",
              scrollBeyondLastLine: false,
              fontSize: 12,
              readOnly: disabled,
              wordWrap: "off",
            }}
            value={(config?.httpHeaders as string) || "{}"}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="httpBody">Body (JSON)</Label>
        <div
          className={`overflow-hidden rounded-md border ${config?.httpMethod === "GET" ? "opacity-50" : ""}`}
        >
          <CodeEditor
            defaultLanguage="json"
            height="120px"
            onChange={(value) => onUpdateConfig("httpBody", value || "{}")}
            options={{
              minimap: { enabled: false },
              lineNumbers: "off",
              scrollBeyondLastLine: false,
              fontSize: 12,
              readOnly: config?.httpMethod === "GET" || disabled,
              domReadOnly: config?.httpMethod === "GET" || disabled,
              wordWrap: "off",
            }}
            value={(config?.httpBody as string) || "{}"}
          />
        </div>
        {config?.httpMethod === "GET" && (
          <p className="text-muted-foreground text-xs">
            Body is disabled for GET requests
          </p>
        )}
      </div>
    </>
  );
}

// Condition fields component
function ConditionFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string | Record<string, unknown>, value?: unknown) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="condition">Condition Expression</Label>
      <TemplateBadgeInput
        disabled={disabled}
        id="condition"
        onChange={(value) => onUpdateConfig("condition", value)}
        placeholder="e.g., 5 > 3, status === 200, {{PreviousNode.value}} > 100"
        value={(config?.condition as string) || ""}
      />
      <p className="text-muted-foreground text-xs">
        Enter a JavaScript expression that evaluates to true or false. You can
        use @ to reference previous node outputs.
      </p>
    </div>
  );
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Component inherently complex due to multiple action types

const DEFAULT_CATEGORY = {
  label: "System",
  key: "System",
  icon: "settings",
  actions: ["HTTP Request", "Database Query", "Condition"],
  type: "System",
} as Category

export function ActionConfig({
  config,
  onUpdateConfig,
  disabled,
}: ActionConfigProps) {
  const [_workflowId] = useAtom(currentWorkflowIdAtom);
  const [_workflowName] = useAtom(currentWorkflowNameAtom);

  // Fetch integrations from Membrane SDK
  const { items: integrations, loading: integrationsLoading } = useIntegrations();

  // Integration app instance for connecting
  const integrationApp = useIntegrationApp();

  // State for connection attempt
  const [isConnecting, setIsConnecting] = useState(false);

  // Initialize categories with system category
  const [categories, setCategories] = useState<Category[]>([
    DEFAULT_CATEGORY
  ]);

  // Update categories when integrations are fetched
  useEffect(() => {
    if (integrations.length > 0) {
      const integrationCategories: Category[] = integrations
        .filter((integration) => integration.key)
        .map((integration) => ({
          label: integration.name,
          key: integration.key!,
          logoUri: integration.logoUri,
          actions: [], // Actions will be fetched dynamically
          type: "Integration" as CategoryType,
        }));

      // Only update if we don't already have integration categories
      setCategories((prev) => {
        if (prev.length === 1 && prev[0].type === "System") {
          return [...integrationCategories, DEFAULT_CATEGORY];
        }
        return prev;
      });
    }
  }, [integrations]);

  // Get category info directly from config (config is stateful)
  const categoryKey = (config?.categoryKey as string) || "";
  const categoryType = config?.categoryType as CategoryType | undefined;

  // Get integration key (only if it's an integration type)
  const integrationKey = categoryType === "Integration" ? categoryKey : undefined;

  // Fetch actions for selected integration
  const actionsForSelectedIntegration = useActions({
    integrationKey: integrationKey,
  });

  const handleCategoryChange = (newCategoryKey: string) => {
    const category = categories.find((cat) => cat.key === newCategoryKey);

    if (!category) return;

    // Batch all config updates together in a single call
    onUpdateConfig({
      categoryKey: newCategoryKey,
      categoryType: category.type,
      actionId: "",
    });
  };

  const handleActionChange = (value: string) => {
    // For System actions, the value IS the action name
    if (categoryType === "System") {
      onUpdateConfig({
        actionId: value,
        actionName: value,
      });
    } else if (categoryType === "Integration") {
      // For Integration actions, find the action to get its name and logo
      const action = actionsForSelectedIntegration.items.find((a) => a.id === value);
      onUpdateConfig({
        actionId: value,
        actionName: action?.name || value,
        actionLogoUrl: action?.integration?.logoUri || null,
      });
    }
  };

  // Check if the selected integration is connected
  const selectedIntegration = categoryType === "Integration"
    ? integrations.find((int) => int.key === categoryKey)
    : null;

  const isIntegrationConnected = selectedIntegration?.connection && !selectedIntegration.connection.disconnected;

  const handleConnect = async () => {
    if (!categoryKey || categoryType !== "Integration") return;

    try {
      setIsConnecting(true);

      const connection = await integrationApp
        .integration(categoryKey)
        .openNewConnection();

      if (!connection?.id) {
        throw new Error("Connection was not successful");
      }

      toast.success("Successfully connected", {
        description: `Connected to ${selectedIntegration?.name || "integration"}`,
      });
    } catch (error) {
      toast.error("Failed to connect", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label className="ml-1" htmlFor="actionCategory">
            App/Category
          </Label>
          <Select
            disabled={disabled || integrationsLoading}
            onValueChange={handleCategoryChange}
            value={categoryKey || undefined}
          >
            <SelectTrigger className="w-full" id="actionCategory">
              {integrationsLoading ? (
                <div className="flex items-center gap-2">
                  <Spinner className="size-4" />
                  <span className="text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <SelectValue placeholder="Select app or category" />
              )}
            </SelectTrigger>
            <SelectContent>
              {integrationsLoading ? (
                <div className="p-2 space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                categories.map((category) => (
                  <SelectItem key={category.key} value={category.key}>
                    <div className="flex items-center gap-2">
                      {category.icon === "settings" ? (
                        <Settings className="size-4" />
                      ) : category.logoUri ? (
                        <Image
                          src={category.logoUri}
                          alt={category.label}
                          width={16}
                          height={16}
                          className="size-4 rounded"
                        />
                      ) : (
                        <div className="size-4 rounded bg-muted" />
                      )}
                      <span>{category.label}</span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="ml-1" htmlFor="actionType">
            Action
          </Label>
          <Select
            key={categoryType ? `${categoryType}-${categoryKey}` : "no-category"}
            disabled={
              disabled ||
              !categoryKey ||
              (categoryType === "Integration" && actionsForSelectedIntegration.loading)
            }
            onValueChange={handleActionChange}
            value={(config?.actionId as string) || undefined}
          >
            <SelectTrigger className="w-full" id="actionType">
              {!categoryType ? (
                <SelectValue placeholder="Select a category first" />
              ) : categoryType === "Integration" && actionsForSelectedIntegration.loading ? (
                <div className="flex items-center gap-2">
                  <Spinner className="size-4" />
                  <span className="text-muted-foreground">Loading actions...</span>
                </div>
              ) : (
                <SelectValue placeholder="Select action" />
              )}
            </SelectTrigger>
            <SelectContent>
              {(() => {
                if (!categoryType) return null;

                if (categoryType === "System") {
                  // Show system actions from category
                  const systemCategory = DEFAULT_CATEGORY;
                  if (!systemCategory) return null;

                  return systemCategory.actions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ));
                }

                if (categoryType === "Integration") {
                  // Show Membrane actions
                  if (actionsForSelectedIntegration.loading) {
                    return (
                      <div className="p-2 space-y-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    );
                  }

                  if (actionsForSelectedIntegration.items.length === 0) {
                    return (
                      <div className="p-4 border rounded-lg text-sm text-muted-foreground text-center">
                        There are no actions available for this integration
                      </div>
                    );
                  }

                  return actionsForSelectedIntegration.items.map((action: Action) => (
                    <SelectItem key={action.id} value={action.id}>
                      <div className="flex items-center gap-2">
                        {action.integration?.logoUri ? (
                          <Image
                            src={action.integration.logoUri}
                            alt={action.integration.name}
                            width={16}
                            height={16}
                            className="size-4 rounded"
                          />
                        ) : null}
                        <span>{action.name}</span>
                      </div>
                    </SelectItem>
                  ));
                }

                return null;
              })()}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Connection Alert for Integration */}
      {categoryType === "Integration" && categoryKey && !isIntegrationConnected && (
        <Alert variant="default" className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20 items-center">
          <AlertCircle className="text-yellow-600 dark:text-yellow-500" />
          <AlertDescription className="flex items-center justify-between gap-2 m-0">
            <span className="text-yellow-900 dark:text-yellow-100">
              {selectedIntegration?.name || "Integration"} is not connected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleConnect}
              disabled={isConnecting || disabled}
              className="shrink-0 border-yellow-600 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-500 dark:text-yellow-400 dark:hover:bg-yellow-950"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 size-3 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect now"
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Database Query fields */}
      {config?.actionId === "Database Query" && categoryType === "System" && (
        <DatabaseQueryFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
        />
      )}

      {/* HTTP Request fields */}
      {config?.actionId === "HTTP Request" && categoryType === "System" && (
        <HttpRequestFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
        />
      )}

      {/* Condition fields */}
      {config?.actionId === "Condition" && categoryType === "System" && (
        <ConditionFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
        />
      )}

      {/* Integration action input form */}
      {categoryType === "Integration" && config?.actionId && (() => {
        const selectedAction = actionsForSelectedIntegration.items.find(
          (a) => a.id === config.actionId
        );

        if (!selectedAction?.inputSchema) return null;

        const schema = selectedAction.inputSchema as RJSFSchema;
        const formData = config?.actionInputs as Record<string, unknown> || {};

        return (
          <div className="space-y-2">
            <Label>Action Configuration</Label>
            <div className="rounded-md border bg-background p-4">
              <Form
                schema={schema}
                formData={formData}
                validator={validator}
                onChange={(e) => onUpdateConfig("actionInputs", e.formData)}
                disabled={disabled}
                templates={{
                  FieldTemplate: CustomFieldTemplate,
                  ArrayFieldTemplate: CustomArrayFieldTemplate,
                }}
                widgets={{
                  TextWidget: CustomTextWidget,
                  TextareaWidget: CustomTextareaWidget,
                  SelectWidget: CustomSelectWidget,
                  EmailWidget: CustomTextWidget,
                  URLWidget: CustomTextWidget,
                  DateWidget: CustomDateWidget,
                  DateTimeWidget: CustomDateTimeWidget,
                  TimeWidget: CustomTimeWidget,
                  CheckboxWidget: CustomCheckboxWidget,
                }}
                uiSchema={{
                  "ui:submitButtonOptions": {
                    norender: true,
                  },
                }}
              >
                <div />
              </Form>
            </div>
          </div>
        );
      })()}
    </>
  );
}
