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

/** Resolves a copilot tools-component id (or tab label) to a toolbar tool. */
export function resolveCopilotToolbarTool(id: string): ToolbarTool | undefined {
  const trimmed = id.trim();
  const mapped = copilotToolComponentToToolbarTool[trimmed];
  if (mapped) {
    return mapped;
  }
  const lower = trimmed.toLowerCase();
  for (const [key, tool] of Object.entries(copilotToolComponentToToolbarTool)) {
    if (key.toLowerCase() === lower) {
      return tool;
    }
  }
  return Object.values(ToolbarTool).find(
    (tool) => tool.toLowerCase() === lower || tool === trimmed
  );
}

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

export const copilotSettingComponentIds = Object.keys(
  copilotSettingComponentToTab
);

/** Resolves a copilot settings-component id (or tab label) to a settings tab. */
export function resolveCopilotSettingsTab(
  id: string
): SettingsSidebarTab | undefined {
  const trimmed = id.trim();
  const mapped = copilotSettingComponentToTab[trimmed];
  if (mapped) {
    return mapped;
  }
  const lower = trimmed.toLowerCase();
  for (const [key, tab] of Object.entries(copilotSettingComponentToTab)) {
    if (key.toLowerCase() === lower) {
      return tab;
    }
  }
  return Object.values(SettingsSidebarTab).find(
    (tab) => tab.toLowerCase() === lower || tab === trimmed
  );
}
