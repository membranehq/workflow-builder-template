import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ReactFlowProvider } from "@xyflow/react";
import { Provider } from "jotai";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/auth/provider";
import { GitHubStarsProvider } from "@/components/github-stars-provider";
import { MembraneProvider } from "@/components/membrane-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { PersistentCanvas } from "@/components/workflow/persistent-canvas";
import { mono, sans } from "@/lib/fonts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
  title: "AI Workflow Builder - Visual Workflow Automation",
  description:
    "Build powerful AI-driven workflow automations with a visual, node-based editor. Built with Next.js and React Flow.",
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/favicon.ico",
        media: "(prefers-color-scheme: dark)",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

const GITHUB_REPO = "vercel-labs/workflow-builder-template";

async function getGitHubStars(): Promise<number | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          ...(process.env.GITHUB_TOKEN && {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          }),
        },
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.stargazers_count;
  } catch {
    return null;
  }
}

type RootLayoutProps = {
  children: ReactNode;
};

const RootLayout = async ({ children }: RootLayoutProps) => {
  const stars = await getGitHubStars();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(sans.variable, mono.variable)}
    >
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          <Provider>
            <AuthProvider>
              <MembraneProvider>
                <GitHubStarsProvider stars={stars}>
                  <ReactFlowProvider>
                    <PersistentCanvas />
                    <div className="pointer-events-none relative z-10">
                      {children}
                    </div>
                  </ReactFlowProvider>
                </GitHubStarsProvider>
                <Toaster />
              </MembraneProvider>
            </AuthProvider>
          </Provider>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
