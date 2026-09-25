import { createContext } from 'react';

export enum SettingsSidebarTab {
  EntityConfig = 'Entity Config',
  Collaboration = 'Collaboration',
  Chatbot = 'Chatbot',
  VsCodeExtension = 'Extension',
  Restructure = 'Restructure',
  Snapshot = 'Snapshot',
  Settings = 'Settings',
}

export type SettingsSidebarState = {
  showSidebar: boolean;
  selectedTab: SettingsSidebarTab | null;
};

export type SettingsSidebarActions = {
  openSettingsSidebarTab(tab: SettingsSidebarTab | null): void;
};

export const defaultSettingsSidebarState: SettingsSidebarState = {
  showSidebar: false,
  selectedTab: null,
};

export const SettingsSidebarContext = createContext<
  SettingsSidebarState & SettingsSidebarActions
>({
  ...defaultSettingsSidebarState,
  openSettingsSidebarTab: () =>
    console.error('Settings sidebar context provider missing'),
});
