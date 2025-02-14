export type SidebarOpenerProps = {
  openedComponent: string;
  toggleSettingsSidebarComponent: (componentId: string) => void;
};

export type ToolbarOpenerProps = {
  openedComponent: string;
  toggleToolsSidebarComponent: (componentId: string) => void;
};
