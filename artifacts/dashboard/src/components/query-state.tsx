import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function QueryState({
  isLoading,
  isError,
  loadingLabel,
  errorLabel,
  onRetry,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  loadingLabel: string;
  errorLabel: string;
  onRetry?: () => void;
  children: ReactNode;
}) {
  if (isLoading) {
    return (
      <div role="status" className="p-6 text-sm text-muted-foreground">
        {loadingLabel}
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="m-4 border border-destructive/40 bg-destructive/10 rounded-md p-4 text-sm">
        <p>{errorLabel}</p>
        {onRetry && (
          <Button type="button" variant="outline" className="mt-3" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
