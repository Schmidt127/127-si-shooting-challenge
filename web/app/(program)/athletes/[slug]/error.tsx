"use client";

import { AthleteProfileErrorState } from "@/components/athlete/athlete-profile-view";

type AthleteProfileErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AthleteProfileError({ error, reset }: AthleteProfileErrorProps) {
  const message =
    error.message?.trim() && error.message !== "An error occurred in the Server Components render."
      ? error.message
      : undefined;

  return <AthleteProfileErrorState message={message} onRetry={reset} />;
}
