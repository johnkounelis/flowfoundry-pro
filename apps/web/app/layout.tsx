import "./../styles/globals.css";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { PostHogProvider } from "./providers";
import { TRPCProvider } from "@/lib/trpc-provider";
import { AuthSessionProvider } from "./session-provider";

export const metadata = {
  title: "FlowFoundry Pro",
  description: "AI-powered workflow automation platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <Suspense>{/* analytics */}</Suspense>
        <AuthSessionProvider>
          <TRPCProvider>
            <PostHogProvider>
              {children}
            </PostHogProvider>
          </TRPCProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
