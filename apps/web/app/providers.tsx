"use client";

import posthog from "posthog-js";
import { PostHogProvider as PH } from "posthog-js/react";
import { useEffect } from "react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY as string | undefined;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST as string | undefined;
    if (key && host) {
      posthog.init(key, { api_host: host, capture_pageview: true });
    }
  }, []);
  return <PH client={posthog}>{children}</PH>;
}
