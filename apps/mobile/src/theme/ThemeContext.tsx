import React, { createContext, useContext, useState, useEffect } from "react";
import type { ThemePalette, ThemeName } from "./themes";
import { themes, LightTheme } from "./themes";
import { loadTheme, saveTheme } from "../utils/storage";

interface ThemeContextValue {
  C: ThemePalette;
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  C: LightTheme,
  themeName: "light",
  setThemeName: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeNameState] = useState<ThemeName>("light");

  useEffect(() => {
    loadTheme().then((saved) => {
      if (saved && saved in themes) {
        setThemeNameState(saved as ThemeName);
      }
    });
  }, []);

  const setThemeName = (name: ThemeName) => {
    setThemeNameState(name);
    saveTheme(name);
  };

  return (
    <ThemeContext.Provider
      value={{ C: themes[themeName], themeName, setThemeName }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
