import { createContext, useEffect, useState } from "react";

const updateCss = (filename: string) => {
  const link = document.getElementById("theme-link") as HTMLLinkElement | null;

  const newHref = `${process.env.PUBLIC_URL}/${filename}`;
  const isSameTheme =
    (newHref.includes("dark") && link?.href.includes("dark")) ||
    (newHref.includes("light") && link?.href.includes("light"));
  if (link && !isSameTheme) {
    link.href = newHref;
  }
};

export type Theme = "light" | "dark";
export const ThemeContext = createContext<{
  theme: Theme;
  setThemeOverride: (theme: Theme | undefined) => void;
}>({ theme: "light", setThemeOverride: () => {} });

export const ThemeProvider = ({
  children,
  initialThemeOverride,
}: {
  children: React.ReactNode;
  initialThemeOverride?: Theme;
}) => {
  const [theme, setTheme] = useState<Theme>("dark");
  const [themeOverride, setThemeOverride] = useState<undefined | Theme>(
    initialThemeOverride
  );

  const updateTheme = (theme: Theme) => {
    setTheme(theme);
    updateCss(
      theme === "dark"
        ? "themes/lara-dark-theme.css"
        : "themes/lara-light-theme.css"
    );
  };

  useEffect(() => {
    const prefersDarkScheme = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    updateTheme(themeOverride ?? (prefersDarkScheme ? "dark" : "light"));

    const darkModeListener = (event: MediaQueryListEvent) => {
      updateTheme(themeOverride ?? (event.matches ? "dark" : "light"));
    };

    // Listen for changes to the system dark mode
    const darkModeMediaQuery = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );
    darkModeMediaQuery.addEventListener("change", darkModeListener);

    // Clean up by removing the listener when the component unmounts
    return () => {
      darkModeMediaQuery.removeEventListener("change", darkModeListener);
    };
  }, [themeOverride]);

  return (
    <ThemeContext.Provider
      value={{ theme: theme, setThemeOverride: setThemeOverride }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
