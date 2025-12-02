"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useIntegrations, useConnections } from "@membranehq/react";
import { AlertCircle, Loader2, RefreshCw, Plug2, Search } from "lucide-react";
import Image from "next/image";
import { useIntegrationApp, type Integration } from "@membranehq/react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

function UnconnectedIntegrationItem({
  integration,
}: { integration: Integration }) {
  const integrationApp = useIntegrationApp();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isReady = integration.state === "READY";
  const isDisabled = !isReady;

  const handleConnect = async () => {
    if (isDisabled || !integration.key) return;

    try {
      setIsConnecting(true);

      const connection = await integrationApp
        .integration(integration.key)
        .openNewConnection();

      if (!connection?.id) {
        throw new Error("Connection was not successful");
      }

      setIsConnecting(false);
    } catch (error) {
      setIsConnecting(false);

      toast.error("Failed to connect", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <div
      className={`relative flex flex-col rounded-lg border p-3 transition-colors ${
        isDisabled
          ? "cursor-not-allowed bg-muted/30 opacity-50"
          : "cursor-pointer hover:border-primary/50 hover:bg-muted/50"
      }`}
      onClick={handleConnect}
      onMouseEnter={() => !isDisabled && setIsHovered(true)}
      onMouseLeave={() => !isDisabled && setIsHovered(false)}
    >
      {isConnecting && (
        <div className="absolute right-0 top-0 p-2">
          <Loader2 className="size-3 animate-spin" />
        </div>
      )}

      <div className="flex items-center gap-3">
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
          <div className="mt-1 h-4">
            {isHovered ? (
              <div className="flex items-center gap-1">
                {isDisabled ? (
                  <>
                    <AlertCircle className="size-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Not available
                    </span>
                  </>
                ) : (
                  <>
                    <Plug2 className="size-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Click to connect
                    </span>
                  </>
                )}
              </div>
            ) : (
              <span className="block truncate font-mono text-xs text-muted-foreground/60">
                {integration.key}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function UnconnectedIntegrations() {
  const [searchQuery, setSearchQuery] = useState("");
  const { connections, refresh: refreshConnections } = useConnections();

  const {
    integrations: searchResults,
    loading: searchIsLoading,
    error: searchError,
  } = useIntegrations({ search: searchQuery });

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

  // Filter out already connected integrations from search results
  const connectedKeys = new Set(
    connectedIntegrations.map((integration) => integration.key)
  );
  const unconnectedIntegrations = searchResults.filter(
    (integration) => !connectedKeys.has(integration.key)
  );

  const refresh = async () => {
    await refreshConnections();
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Connect Apps
        </h3>
        <div className="relative w-64">
          <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search apps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {searchIsLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">
            Searching integrations...
          </p>
        </div>
      ) : searchError ? (
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle />
          <p className="mb-4 text-sm text-muted-foreground">
            {searchError.message || "Failed to search integrations"}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="gap-2"
          >
            <RefreshCw /> Try again
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 pt-3 md:grid-cols-3 lg:grid-cols-4">
          {unconnectedIntegrations.map((integration) => (
            <UnconnectedIntegrationItem
              key={integration.key}
              integration={integration}
            />
          ))}
        </div>
      )}
    </div>
  );
}

