import { useAppliedTheme } from "@/hooks/useTheme";
import { type ReactNode, useLayoutEffect } from "react";

export function ThemeGate({ children }: { children: ReactNode }) {
  const theme = useAppliedTheme();

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return <>{children}</>;
}
