import { VisualizationMode } from "collaborative-mode/services/local-user";

export const VISUALIZATION_MODE_UPDATE_EVENT = 'visualization_mode_update';

export type VisualizationModeUpdateMessage = {
    mode: VisualizationMode
}