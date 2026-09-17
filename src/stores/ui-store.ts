export type ThemeMode = "light" | "dark" | "system";

export type UiState = {
  sidebarCollapsed: boolean;
  theme: ThemeMode;
};

export const defaultUiState: UiState = {
  sidebarCollapsed: false,
  theme: "light",
};
