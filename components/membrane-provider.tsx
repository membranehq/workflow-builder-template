"use client";

import { IntegrationAppProvider as Provider } from "@membranehq/react";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api-client";

export function MembraneProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    const loadToken = async () => {
      try {
        const { token } = await api.membrane.getToken();
        setToken(token);
      } catch (error) {
        console.error("Failed to fetch Membrane token:", error);
      }
    };

    loadToken();
  }, []);

  return (
    <Provider token={token}>{children}</Provider>
  );
}