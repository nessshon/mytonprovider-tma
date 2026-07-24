import { ErrorBoundary } from "@/components/ErrorBoundary";
import { HashRouter } from "react-router-dom";
import { AppShell } from "./AppShell";
import { AppRoutes } from "./routes";
import { ThemeGate } from "./ThemeGate";

export function Root() {
  return (
    <ErrorBoundary>
      <ThemeGate>
        <AppShell>
          <HashRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
            <AppRoutes />
          </HashRouter>
        </AppShell>
      </ThemeGate>
    </ErrorBoundary>
  );
}
