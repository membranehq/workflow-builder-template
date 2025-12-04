"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useConnections } from "@membranehq/react";
import { Plug } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UnconnectedIntegrations } from "./unconnected-integrations";
import { ConnectedIntegrations } from "./connected-integrations";

interface ManageIntegrationsModalProps {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ManageIntegrationsModal({
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: ManageIntegrationsModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;
  const { connections, loading: connectionsIsLoading } = useConnections();

  const hasConnectedIntegration = connections.some(
    (connection) => !connection.disconnected
  );

  const defaultTrigger = (
    <Button
      size="icon"
      variant="outline"
      className="relative h-9 w-9 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Plug className="h-4 w-4" />
      {!connectionsIsLoading && (
        <div
          className={cn(
            "absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-background",
            hasConnectedIntegration ? "bg-green-500" : "bg-red-500"
          )}
        />
      )}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {!trigger && controlledOpen === undefined && (
        <DialogTrigger asChild>{defaultTrigger}</DialogTrigger>
      )}
      <DialogContent className="max-w-4xl min-w-[900px]">
        <DialogHeader className="pl-2">
          <DialogTitle>Manage Apps</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Connect to third-party apps using Membrane&apos;s prebuilt UI
          </p>
        </DialogHeader>
        <div className="h-[70vh] overflow-y-auto">
          <div className="flex h-full flex-col">
            <div className="flex-1 space-y-6 overflow-auto p-2">
              <ConnectedIntegrations />
              <UnconnectedIntegrations />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

