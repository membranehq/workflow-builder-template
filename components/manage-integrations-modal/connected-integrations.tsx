"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useConnections } from "@membranehq/react";
import { AlertCircle, Loader2, RefreshCw, Plug2 } from "lucide-react";
import Image from "next/image";
import { useIntegrationApp, type Integration } from "@membranehq/react";
import { toast } from "sonner";

interface IntegrationListItemProps {
  integration: Integration;
  onRefresh: () => Promise<void>;
}

function ConnectedIntegrationItem({
  integration,
  onRefresh,
}: IntegrationListItemProps) {
  const integrationApp = useIntegrationApp();

  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const handleDisconnect = async () => {
    if (!integration.connection?.id) {
      return;
    }

    try {
      setIsDisconnecting(true);

      await integrationApp.connection(integration.connection.id).archive();

      await onRefresh();
    } catch (error) {
      toast.error("Failed to disconnect", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleReconnect = async () => {
    if (!integration.key) {
      return;
    }

    try {
      setIsReconnecting(true);

      await integrationApp.integration(integration.key).openNewConnection();

      await onRefresh();

      toast.success("Successfully reconnected");
    } catch (error) {
      toast.error("Failed to reconnect", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsReconnecting(false);
    }
  };

  const isDisconnected = integration.connection?.disconnected;

  return (
    <>
      <div className="relative flex flex-col rounded-lg border p-3 transition-colors hover:bg-muted/50">
        <div className="flex items-center gap-3 pb-3">
          {integration.logoUri ? (
            <Image
              width={32}
              height={32}
              src={integration.logoUri}
              alt={`${integration.name} logo`}
              className="size-8 shrink-0 rounded-lg"
            />
          ) : (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-medium">
              {integration.name[0]}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium">{integration.name}</h3>
            {isDisconnected && (
              <p className="text-xs font-bold text-red-500">Disconnected</p>
            )}
            {integration.connection && !isDisconnected && (
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                {integration.key}
              </div>
            )}
          </div>
        </div>

        <div className="flex w-full items-end justify-between">
          {isDisconnected ? (
            <Button
              variant="outline"
              onClick={handleReconnect}
              size="sm"
              disabled={isReconnecting}
              className="h-7 py-1 text-xs text-blue-600 hover:text-blue-700"
            >
              {isReconnecting ? <Loader2 className="size-3" /> : "Reconnect"}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handleDisconnect}
              size="sm"
              disabled={isDisconnecting}
              className="h-7 py-1 text-xs text-red-500 hover:text-red-600"
            >
              {isDisconnecting ? <Loader2 className="size-3" /> : "Disconnect"}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

export function ConnectedIntegrations() {
  const {
    connections,
    refresh: refreshConnections,
    loading: connectionsIsLoading,
    error: connectionsError,
  } = useConnections();

  // Get connected integrations from connections
  const connectedIntegrations = connections
    .map((connection) => {
      const integration = connection.integration;
      if (integration) {
        return {
          ...integration,
          connection: connection,
        } as Integration;
      }
      return undefined;
    })
    .filter(
      (integration): integration is Integration => integration !== undefined
    );

  const refresh = async () => {
    await refreshConnections();
  };

  if (connectionsIsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Loading connections...</p>
      </div>
    );
  }

  if (connectionsError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle />
        <p className="mb-4 text-sm text-muted-foreground">
          {connectionsError.message || "Failed to load connections"}
        </p>
        <Button variant="outline" size="sm" onClick={refresh} className="gap-2">
          <RefreshCw /> Try again
        </Button>
      </div>
    );
  }

  if (connectedIntegrations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 py-8">
        <Plug2 className="mb-2 size-8 text-muted-foreground/50" />
        <p className="text-center text-sm text-muted-foreground">
          No connected apps yet
        </p>
        <p className="mt-1 text-center text-xs text-muted-foreground/70">
          Connect apps below to get started
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Connected Apps ({connectedIntegrations.length})
          </h3>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-3 md:grid-cols-3 lg:grid-cols-4">
        {connectedIntegrations.map((integration) => (
          <ConnectedIntegrationItem
            key={integration.key}
            integration={integration}
            onRefresh={refresh}
          />
        ))}
      </div>
    </div>
  );
}

