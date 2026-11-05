import { type LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { createContext, RefObject } from 'react';
import { SettingsSidebarTab } from '../visualization/page-setup/sidebar/customizationbar/settings-sidebar-context';
import { ToolbarTool } from '../visualization/page-setup/sidebar/toolbar/toolbar-context';

export interface Model {
  id: string;
  name: string;
}

export interface Provider {
  id: string;
  name: string;
  models: Model[];
}

export const EMPTY_MODEL: Model = { id: '', name: '' };
export const EMPTY_PROVIDER: Provider = { id: '', name: '', models: [] };

export type EntityFilteringFilters = {
  minClassMethodCount?: number;
};

export type EntityFilteringController = {
  applyFilters: (filters: EntityFilteringFilters) => void;
  reset: () => void;
};

export type EntitySearchController = {
  search: (params: { query: string; selectAll?: boolean }) => void;
  selectEntities: (ids: string[]) => void;
  reset: () => void;
};

export type SidebarSelectionOptions = {
  showSidebar?: boolean;
};

export interface ChatbotContextData {
  providers: Provider[];
  selectedProvider: Provider;
  setSelectedProvider: (provider: Provider) => void;
  selectedModel: Model;
  setSelectedModel: (model: Model) => void;
  landscapeData: LandscapeData | null;
  pingScreenAtPoint: (x: number, y: number) => void;
  showToolsSidebar: boolean;
  setShowToolsSidebar: (open: boolean) => void;
  showSettingsSidebar: boolean;
  setShowSettingsSidebar: (open: boolean) => void;
  selectedToolbarTool: ToolbarTool | null;
  setSelectedToolbarTool: (tool: ToolbarTool | null, options?: SidebarSelectionOptions) => void;
  selectedSettingsSidebarTab: string | null;
  setSelectedSettingsSidebarTab: (tab: SettingsSidebarTab | null, options?: SidebarSelectionOptions) => void;
  entityFilteringControllerRef: RefObject<EntityFilteringController | null> | null;
  entitySearchControllerRef: RefObject<EntitySearchController | null> | null;
  providersError: string | null;
  isLoadingProviders: boolean;
  reloadProviders: () => void;
  isCopilotRuntimeReady: boolean;
  copilotRuntimeError: string | null;
  copilotRuntimeUrl: string | undefined;
  copilotRuntimeHeaders: Record<string, string>;
  copilotRuntimeKey: string;
  reportCopilotCrash: (error: Error) => void;
}

const defaultContext: ChatbotContextData = {
  providers: [],
  selectedProvider: EMPTY_PROVIDER,
  setSelectedProvider: () => {},
  selectedModel: EMPTY_MODEL,
  setSelectedModel: () => {},
  landscapeData: null,
  pingScreenAtPoint: () => {},
  showToolsSidebar: false,
  setShowToolsSidebar: () => {},
  showSettingsSidebar: false,
  setShowSettingsSidebar: () => {},
  selectedToolbarTool: null,
  setSelectedToolbarTool: () => {},
  selectedSettingsSidebarTab: null,
  setSelectedSettingsSidebarTab: () => {},
  entityFilteringControllerRef: null,
  entitySearchControllerRef: null,
  providersError: null,
  isLoadingProviders: false,
  reloadProviders: () => {},
  isCopilotRuntimeReady: false,
  copilotRuntimeError: null,
  copilotRuntimeUrl: undefined,
  copilotRuntimeHeaders: {},
  copilotRuntimeKey: 'none:none',
  reportCopilotCrash: () => {},
};

export const ChatbotContext = createContext(defaultContext);
