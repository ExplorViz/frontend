export type SettingGroup =
  | 'Camera'
  | 'Colors'
  | 'Communication'
  | 'Controls'
  | 'Debugging'
  | 'Effects'
  | 'Heatmap'
  | 'Highlighting'
  | 'Layout'
  | 'Minimap'
  | 'Popups'
  | 'Virtual Reality'
  | 'Semantic Zoom'
  | 'Debugging'
  | 'Virtual Reality';

export type CameraSettings = {
  cameraNear: RangeSetting;
  cameraFar: RangeSetting;
  cameraFov: RangeSetting;
  raycastEnabled: FlagSetting;
  raycastFirstHit: FlagSetting;
  raycastNear: RangeSetting;
  raycastFar: RangeSetting;
};
export type CameraSettingId = keyof CameraSettings;

export type ColorSettingId =
  | 'backgroundColor'
  | 'classColor'
  | 'classTextColor'
  | 'communicationArrowColor'
  | 'communicationColor'
  | 'componentEvenColor'
  | 'componentOddColor'
  | 'componentTextColor'
  | 'foundationColor'
  | 'foundationTextColor'
  | 'highlightedEntityColor'
  | 'addedComponentColor'
  | 'removedComponentColor'
  | 'unchangedComponentColor'
  | 'addedClassColor'
  | 'modifiedClassColor'
  | 'removedClassColor'
  | 'unchangedClassColor'
  | 'k8sNodeColor'
  | 'k8sNamespaceColor'
  | 'k8sDeploymentColor'
  | 'k8sPodColor'
  | 'k8sTextColor';

export type ColorSettings = Record<ColorSettingId, ColorSetting>;

export type ControlSettings = {
  enableGamepadControls: FlagSetting;
  selectedGamepadIndex: RangeSetting;
};
export type ControlSettingId = keyof ControlSettings;

export type CommunicationSettingId =
  | 'commThickness'
  | 'commArrowSize'
  | 'commArrowOffset'
  | 'curvyCommHeight';

export type CommunicationSettings = Record<
  CommunicationSettingId,
  RangeSetting
>;

export type DebugSettings = {
  showExtendedSettings: FlagSetting;
  showFpsCounter: FlagSetting;
  showAxesHelper: FlagSetting;
  showLightHelper: FlagSetting;
  showSemanticZoomCenterPoints: ButtonSetting;
  fullscreen: ButtonSetting;
  syncRoomState: ButtonSetting;
  resetToDefaults: ButtonSetting;
};
export type DebugSettingId = keyof DebugSettings;

export type HeatmapSettings = {
  heatmapEnabled: FlagSetting;
};
export type HeatmapSettingId = keyof HeatmapSettings;

export type HighlightingSettings = {
  applyHighlightingOnHover: FlagSetting;
  keepHighlightingOnOpenOrClose: FlagSetting;
  transparencyIntensity: RangeSetting;
  enableMultipleHighlighting: FlagSetting;
};
export type HighlightingSettingId = keyof HighlightingSettings;

export type HoveringSettingId =
  | 'enableHoverEffects'
  | 'enableAnimations'
  | 'castShadows'
  | 'showAllClassLabels'
  | 'showOutlines';

export type HoveringSettings = Record<HoveringSettingId, FlagSetting>;

export type LayoutSettings = {
  applicationLayoutAlgorithm: SelectSetting<string>;
  packageLayoutAlgorithm: SelectSetting<string>;
  landscapeScalar: RangeSetting;
  applicationDistance: RangeSetting;
  applicationAspectRatio: RangeSetting;
  classFootprint: RangeSetting;
  classWidthMetric: SelectSetting<string>;
  classWidthMultiplier: RangeSetting;
  classDepthMetric: SelectSetting<string>;
  classDepthMultiplier: RangeSetting;
  classHeightMetric: SelectSetting<string>;
  classHeightMultiplier: RangeSetting;
  classMargin: RangeSetting;
  classLabelFontSize: RangeSetting;
  classLabelLength: RangeSetting;
  classLabelOffset: RangeSetting;
  classLabelOrientation: RangeSetting;
  appLabelMargin: RangeSetting;
  appMargin: RangeSetting;
  packageLabelMargin: RangeSetting;
  packageMargin: RangeSetting;
  openedComponentHeight: RangeSetting;
  closedComponentHeight: RangeSetting;
};
export type LayoutSettingId = keyof LayoutSettings;

export type MinimapSettings = {
  minimap: FlagSetting;
  zoom: RangeSetting;
  useCameraPosition: FlagSetting;
  layer1: FlagSetting;
  layer2: FlagSetting;
  layer3: FlagSetting;
  layer4: FlagSetting;
  layer6: FlagSetting;
  layer7: FlagSetting;
};
export type MinimapSettingId = keyof MinimapSettings;

export type PopupSettings = {
  hidePopupDelay: RangeSetting;
};
export type PopupSettingId = keyof PopupSettings;

export type SemanticZoomSettings = {
  usePredefinedSet: FlagSetting;
  semanticZoomState: FlagSetting;
  distancePreSet: RangeSetting;
  distanceLevel1: RangeSetting;
  distanceLevel2: RangeSetting;
  distanceLevel3: RangeSetting;
  distanceLevel4: RangeSetting;
  distanceLevel5: RangeSetting;
  clusterBasedOnMembers: RangeSetting;
  autoOpenCloseFeature: FlagSetting;
  useKMeansInsteadOfMeanShift: FlagSetting;
};
export type SemanticZoomSettingId = keyof SemanticZoomSettings;

export type XrSettingId = 'showVrButton' | 'showVrOnClick';
export type XrSettings = Record<XrSettingId, FlagSetting>;

export type VisualizationSettingId =
  | CameraSettingId
  | ColorSettingId
  | CommunicationSettingId
  | ControlSettingId
  | DebugSettingId
  | HeatmapSettingId
  | HighlightingSettingId
  | HoveringSettingId
  | LayoutSettingId
  | MinimapSettingId
  | PopupSettingId
  | SemanticZoomSettingId
  | XrSettingId;

export type VisualizationSettings = CameraSettings &
  CommunicationSettings &
  ControlSettings &
  DebugSettings &
  HeatmapSettings &
  HighlightingSettings &
  HoveringSettings &
  LayoutSettings &
  MinimapSettings &
  PopupSettings &
  SemanticZoomSettings &
  XrSettings &
  ColorSettings;

export enum SettingLevel {
  DEFAULT,
  EXTENDED,
  DEVELOPER,
}

export type Setting<T> = {
  value: T;
  group: SettingGroup;
  displayName: string;
  description: string;
  level: SettingLevel;
};

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
  buttonText: string;
  readonly isButtonSetting: true;
}

export enum SelectedClassMetric {
  None = 'None',
  Method = 'Method Count',
  LoC = 'LoC',
}

export interface FlagSetting extends Setting<boolean> {
  readonly isFlagSetting: true;
}

export interface ColorSetting extends Setting<string> {
  readonly isColorSetting: true;
}

export interface RangeSetting extends Setting<number> {
  range: {
    min: number;
    max: number;
    step: number;
  };
  readonly isRangeSetting: true;
}

export interface SelectSetting<T> extends Setting<T> {
  options: T[];
  readonly isSelectSetting: true;
}

export function isRangeSetting(x: unknown): x is RangeSetting {
  return {}.hasOwnProperty.call(x, 'isRangeSetting');
}

export function isColorSetting(x: unknown): x is ColorSetting {
  return {}.hasOwnProperty.call(x, 'isColorSetting');
}

export function isFlagSetting(x: unknown): x is FlagSetting {
  return {}.hasOwnProperty.call(x, 'isFlagSetting');
}

export function isButtonSetting(x: unknown): x is ButtonSetting {
  return {}.hasOwnProperty.call(x, 'isButtonSetting');
}

export function isSelectSetting<T>(x: unknown): x is SelectSetting<T> {
  return {}.hasOwnProperty.call(x, 'isSelectSetting');
}
