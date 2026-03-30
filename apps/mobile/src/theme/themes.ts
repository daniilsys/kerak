export interface ThemePalette {
  primary: string;
  primaryDark: string;
  secondaryBg: string;
  paleOak: string;
  greyOlive: string;
  white: string;
  accent: string;
  teal: string;
  amber: string;
  error: string;
  success: string;
  background: string;
  card: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  statusBarStyle: "dark" | "light";
}

export type ThemeName = "light" | "dark-nature" | "dark-neutral";

export const LightTheme: ThemePalette = {
  primary: "#5C7457",
  primaryDark: "#214E34",
  secondaryBg: "#EFD0CA",
  paleOak: "#8A8174",
  greyOlive: "#5E6356",
  white: "#FFFFFF",
  accent: "#E8985A",
  teal: "#5B8FA8",
  amber: "#D4943A",
  error: "#C2564B",
  success: "#4CAF50",
  background: "#EFD0CA",
  card: "#FFFFFF",
  textPrimary: "#214E34",
  textSecondary: "#5E6356",
  border: "#8A817440",
  statusBarStyle: "dark",
};

export const DarkNatureTheme: ThemePalette = {
  primary: "#7FA878",
  primaryDark: "#C8DCC4",
  secondaryBg: "#1A2E1A",
  paleOak: "#8A9A82",
  greyOlive: "#A0AE98",
  white: "#243824",
  accent: "#E8985A",
  teal: "#6BAFC8",
  amber: "#E0A84A",
  error: "#E06B5F",
  success: "#5CBF60",
  background: "#1A2E1A",
  card: "#243824",
  textPrimary: "#E8F0E6",
  textSecondary: "#A0AE98",
  border: "#8A9A8230",
  statusBarStyle: "light",
};

export const DarkNeutralTheme: ThemePalette = {
  primary: "#7FA878",
  primaryDark: "#E0E0E0",
  secondaryBg: "#121212",
  paleOak: "#8A8A8A",
  greyOlive: "#A0A0A0",
  white: "#1E1E1E",
  accent: "#E8985A",
  teal: "#6BAFC8",
  amber: "#E0A84A",
  error: "#E06B5F",
  success: "#5CBF60",
  background: "#121212",
  card: "#1E1E1E",
  textPrimary: "#E8E8E8",
  textSecondary: "#A0A0A0",
  border: "#8A8A8A30",
  statusBarStyle: "light",
};

export const themes: Record<ThemeName, ThemePalette> = {
  light: LightTheme,
  "dark-nature": DarkNatureTheme,
  "dark-neutral": DarkNeutralTheme,
};
