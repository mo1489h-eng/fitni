import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

/**
 * Wraps the app so `next-themes` can toggle the `dark` class on `document.documentElement`.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange {...props}>
      {children}
    </NextThemesProvider>
  );
}
