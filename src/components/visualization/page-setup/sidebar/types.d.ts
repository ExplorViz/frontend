export type SidebarOpenerProps = {
  openedComponent: string | null;
  toggleSettingsSidebarComponent: (componentId: string) => boolean;
};

export type ToolbarOpenerProps = {
  openedComponent: string | null;
  toggleToolsSidebarComponent: (componentId: string) => boolean;
};
