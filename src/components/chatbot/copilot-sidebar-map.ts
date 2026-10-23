import { SettingsSidebarTab } from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings-sidebar-context';
import { ToolbarTool } from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/toolbar-context';

/** Copilot tool ids -> tools sidebar tab (see open-close-tools-component). */
export const copilotToolComponentToToolbarTool: Record<string, ToolbarTool> = {
  'entity-filtering': ToolbarTool.Filter,
  'entity-search': ToolbarTool.EntitySearch,
  'Trace-Replayer': ToolbarTool.TracePlayer,
  'telemetry-search': ToolbarTool.TelemetrySearch,
  'repo-analysis': ToolbarTool.RepositoryAnalysis,
  'kubernetes-diagrams': ToolbarTool.KubernetesDiagrams,
};

export const copilotToolComponentIds = Object.keys(
  copilotToolComponentToToolbarTool
);

/** Copilot setting ids -> settings sidebar tab (see open-close-settings-component). */
export const copilotSettingComponentToTab: Record<string, SettingsSidebarTab> =
  {
    Collaboration: SettingsSidebarTab.Collaboration,
    Chatbot: SettingsSidebarTab.Chatbot,
    'VSCode-Extension-Settings': SettingsSidebarTab.VsCodeExtension,
    'Restructure-Landscape': SettingsSidebarTab.Restructure,
    'Persist-Landscape': SettingsSidebarTab.Snapshot,
    'Building-Config': SettingsSidebarTab.EntityConfig,
    Settings: SettingsSidebarTab.Settings,
  };
