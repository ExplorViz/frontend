export type SettingGroup =
  | 'Camera'
  | 'Minimap'
  | 'Colors'
  | 'Controls'
  | 'Communication'
  | 'Heatmap'
  | 'Highlighting'
  | 'Effects'
  | 'Popups'
  | 'Annotations'
  | 'Virtual Reality'
  | 'Debugging';

export type ColorSettingId =
  | 'backgroundColor'
  | 'clazzColor'
  | 'clazzTextColor'
  | 'communicationArrowColor'
  | 'communicationColor'
  | 'componentEvenColor'
  | 'componentOddColor'
  | 'componentTextColor'
  | 'foundationColor'
  | 'foundationTextColor'
  | 'highlightedEntityColor';

export type ControlSettingId = 'enableGamepadControls' | 'selectedGamepadIndex';

export type HeatmapSettingId = 'heatmapEnabled';

export type HighlightingSettingId =
  | 'applyHighlightingOnHover'
  | 'keepHighlightingOnOpenOrClose'
  | 'transparencyIntensity'
  | 'enableMultipleHighlighting';

export type HoveringSettingId =
  | 'enableHoverEffects'
  | 'enableAnimations'
  | 'castShadows';

export type CommunicationSettingId =
  | 'commThickness'
  | 'commArrowSize'
  | 'curvyCommHeight';

export type MinimapSettingId =
  | 'minimap'
  | 'zoom'
  | 'version2'
  | 'layer1'
  | 'layer2'
  | 'layer3'
  | 'layer4'
  | 'layer6'
  | 'layer7';

export type CameraSettingId = 'cameraNear' | 'cameraFar' | 'cameraFov';

export type XrSettingId = 'showVrButton' | 'showVrOnClick';

export type DebugSettingId =
  | 'showFpsCounter'
  | 'showAxesHelper'
  | 'showLightHelper'
  | 'fullscreen'
  | 'syncRoomState'
  | 'resetToDefaults';

export type PopupSettingId = 'hidePopupDelay';

export type AnnotationSettingId = 'enableCustomAnnotationPosition';

export type VisualizationSettingId =
  | ColorSettingId
  | ControlSettingId
  | HeatmapSettingId
  | HighlightingSettingId
  | HoveringSettingId
  | CommunicationSettingId
  | DebugSettingId
  | CameraSettingId
  | XrSettingId
  | PopupSettingId
  | MinimapSettingId
  | AnnotationSettingId;

export type ColorSettings = Record<ColorSettingId, ColorSetting>;

export type ControlSettings = {
  enableGamepadControls: FlagSetting;
  selectedGamepadIndex: RangeSetting;
};

export type HeatmapSettings = {
  heatmapEnabled: FlagSetting;
};

export type HighlightingSettings = {
  applyHighlightingOnHover: FlagSetting;
  keepHighlightingOnOpenOrClose: FlagSetting;
  transparencyIntensity: RangeSetting;
  enableMultipleHighlighting: FlagSetting;
};

export type HoveringSettings = Record<HoveringSettingId, FlagSetting>;

export type CommunicationSettings = Record<
  CommunicationSettingId,
  RangeSetting
>;

export type DebugSettings = {
  showFpsCounter: FlagSetting;
  showAxesHelper: FlagSetting;
  showLightHelper: FlagSetting;
  showVrOnClick: FlagSetting;
  fullscreen: ButtonSetting;
  syncRoomState: ButtonSetting;
  resetToDefaults: ButtonSetting;
};

export type PopupSettings = {
  hidePopupDelay: RangeSetting;
};

export type AnnotationSettings = Record<AnnotationSettingId, FlagSetting>;

export type CameraSettings = {
  cameraNear: RangeSetting;
  cameraFar: RangeSetting;
  cameraFov: RangeSetting;
};

export type MinimapSettings = {
  minimap: FlagSetting;
  zoom: RangeSetting;
  version2: FlagSetting;
  layer1: FlagSetting;
  layer2: FlagSetting;
  layer3: FlagSetting;
  layer4: FlagSetting;
  layer6: FlagSetting;
  layer7: FlagSetting;
};

export type XrSettings = Record<XrSettingId, FlagSetting>;

export type VisualizationSettings = ColorSettings &
  ControlSettings &
  HeatmapSettings &
  HighlightingSettings &
  HoveringSettings &
  DebugSettings &
  PopupSettings &
  AnnotationSettings &
  CameraSettings &
  XrSettings &
  CommunicationSettings &
  MinimapSettings;

export interface Setting<T> {
  value: T;
  orderNumber: number;
  group: SettingGroup;
}

export interface ButtonSetting extends Setting<boolean> {
  type:
    | 'primary'
    | 'secondary'
    | 'success'
    | 'danger'
    | 'warning'
    | 'info'
    | 'light'
    | 'dark'
    | 'link';
  displayName: string;
  description: string;
  buttonText: string;
  readonly isButtonSetting: true;
}

export interface FlagSetting extends Setting<boolean> {
  displayName: string;
  description: string;
  readonly isFlagSetting: true;
}

export interface ColorSetting extends Setting<string> {
  displayName: string;
  readonly isColorSetting: true;
}

export interface RangeSetting extends Setting<number> {
  displayName: string;
  description: string;
  range: {
    min: number;
    max: number;
    step: number;
  };
  readonly isRangeSetting: true;
}

// eslint-disable-next-line class-methods-use-this
export function isRangeSetting(x: unknown): x is RangeSetting {
  return {}.hasOwnProperty.call(x, 'isRangeSetting');
}

// eslint-disable-next-line class-methods-use-this
export function isColorSetting(x: unknown): x is ColorSetting {
  return {}.hasOwnProperty.call(x, 'isColorSetting');
}

// eslint-disable-next-line class-methods-use-this
export function isFlagSetting(x: unknown): x is FlagSetting {
  return {}.hasOwnProperty.call(x, 'isFlagSetting');
}
