export type SettingGroup =
  | 'Camera'
  | 'Colors'
  | 'Communication'
  | 'Controls'
  | 'Debugging'
  | 'Effects'
  | 'Heatmap'
  | 'Layout'
  | 'Label'
  | 'Magnifier'
  | 'Minimap'
  | 'Misc'
  | 'Popups'
  | 'Semantic Zoom'
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
  | 'buildingColor'
  | 'buildingTextColor'
  | 'communicationArrowColor'
  | 'communicationColor'
  | 'districtRootLevelColor'
  | 'districtDeepestLevelColor'
  | 'districtTextColor'
  | 'foundationColor'
  | 'foundationTextColor'
  | 'highlightedEntityColor'
  | 'addedDistrictColor'
  | 'removedDistrictColor'
  | 'unchangedDistrictColor'
  | 'addedBuildingColor'
  | 'modifiedBuildingColor'
  | 'removedBuildingColor'
  | 'unchangedBuildingColor';

export type ColorSettings = Record<ColorSettingId, ColorSetting>;

export type ControlSettings = {
  leftMouseButtonAction: SelectSetting<string>;
  middleMouseButtonAction: SelectSetting<string>;
  mouseWheelAction: SelectSetting<string>;
  rightMouseButtonAction: SelectSetting<string>;
  enableGamepadControls: FlagSetting;
  selectedGamepadIndex: RangeSetting;
};
export type ControlSettingId = keyof ControlSettings;

export type CommunicationSettingId =
  | 'commThickness'
  | 'commArrowSize'
  | 'commArrowOffset'
  | 'curvyCommHeight'
  | 'enableEdgeBundling'
  | 'bundleStrength'
  | 'compatibilityThreshold'
  | 'bundlingIterations'
  | 'bundlingStepSize'
  | 'beta'
  | 'use3DHAPAlgorithm'
  | 'commCurveHeightDependsOnDistance'
  | 'showHAPTree'
  | 'scatterRadius'
  | 'edgeBundlingStreamline'
  | 'leafPackagesOnly';

export type CommunicationSettings = {
  commThickness: RangeSetting;
  commArrowSize: RangeSetting;
  commArrowOffset: RangeSetting;
  curvyCommHeight: RangeSetting;
  commCurveHeightDependsOnDistance: FlagSetting;
  enableEdgeBundling: FlagSetting;
  bundleStrength: RangeSetting;
  compatibilityThreshold: RangeSetting;
  bundlingIterations: RangeSetting;
  bundlingStepSize: RangeSetting;
  beta: RangeSetting;
  use3DHAPAlgorithm: FlagSetting;
  showHAPTree: FlagSetting;
  scatterRadius: RangeSetting;
  edgeBundlingStreamline: FlagSetting;
  leafPackagesOnly: FlagSetting;
};

export type DebugSettings = {
  showExtendedSettings: FlagSetting;
  showFpsCounter: FlagSetting;
  showAxesHelper: FlagSetting;
  showLightHelper: FlagSetting;
  entityOpacity: RangeSetting;
  fullscreen: ButtonSetting;
  syncRoomState: ButtonSetting;
  resetToDefaults: ButtonSetting;
  clearTraceData: ButtonSetting;
};
export type DebugSettingId = keyof DebugSettings;

export type HeatmapSettings = {
  heatmapEnabled: FlagSetting;
};
export type HeatmapSettingId = keyof HeatmapSettings;

export type EffectSettings = {
  animationDuration: RangeSetting;
  castShadows: FlagSetting;
  enableAnimations: FlagSetting;
  enableHoverEffects: FlagSetting;
  showAllBuildingLabels: FlagSetting;
  showOutlines: FlagSetting;
};
export type EffectSettingId = keyof EffectSettings;

export type LabelSettings = {
  cityLabelMargin: RangeSetting;
  buildingLabelFontSize: RangeSetting;
  buildingLabelLength: RangeSetting;
  buildingLabelOrientation: RangeSetting;
  labelOffset: RangeSetting;
  districtLabelMargin: RangeSetting;
  districtLabelPlacement: SelectSetting<string>;
};
export type LabelSettingId = keyof LabelSettings;

export type LayoutSettings = {
  cityLayoutAlgorithm: SelectSetting<string>;
  districtLayoutAlgorithm: SelectSetting<string>;
  buildingLayoutAlgorithm: SelectSetting<string>;
  landscapeScalar: RangeSetting;
  landscapePositionX: RangeSetting;
  landscapePositionY: RangeSetting;
  landscapePositionZ: RangeSetting;
  landscapeRotationX: RangeSetting;
  landscapeRotationY: RangeSetting;
  landscapeRotationZ: RangeSetting;
  cityDistance: RangeSetting;
  cityAspectRatio: RangeSetting;
  cityMargin: RangeSetting;
  districtMargin: RangeSetting;
  buildingFootprint: RangeSetting;
  buildingWidthMetric: SelectSetting<string>;
  buildingWidthMultiplier: RangeSetting;
  buildingDepthMetric: SelectSetting<string>;
  buildingDepthMultiplier: RangeSetting;
  buildingHeightMetric: SelectSetting<string>;
  buildingHeightMultiplier: RangeSetting;
  buildingMargin: RangeSetting;
  openedDistrictHeight: RangeSetting;
  closedDistrictHeight: RangeSetting;
  spiralCenterOffset: RangeSetting;
  spiralGap: RangeSetting;
};
export type LayoutSettingId = keyof LayoutSettings;

export type MinimapSettings = {
  isMinimapEnabled: FlagSetting;
  minimapBgColor: ColorSetting;
  minimapZoom: RangeSetting;
  minimapMode: SelectSetting<string>;
  minimapCorner: SelectSetting<string>;
  minimapMarginX: RangeSetting;
  minimapMarginY: RangeSetting;
  minimapWidth: RangeSetting;
  minimapHeight: RangeSetting;
  minimapShape: SelectSetting<string>;
  minimapRotate: FlagSetting;
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
  enableClustering: FlagSetting;
  displayClusters: FlagSetting;
  clusterCount: RangeSetting;
  labelDistanceThreshold: RangeSetting;
  distanceUpdateFrequency: RangeSetting;
  autoOpenCloseDistricts: FlagSetting;
  districtOpenCloseDistanceThreshold: RangeSetting;
};
export type SemanticZoomSettingId = keyof SemanticZoomSettings;

export type MiscSettings = {
  showEmbeddedBrowserIcon: FlagSetting;
};
export type MiscSettingId = keyof MiscSettings;

export type MagnifierSettings = {
  isMagnifierActive: FlagSetting;
  magnifierZoom: RangeSetting;
  magnifierExponent: RangeSetting;
  magnifierRadius: RangeSetting;
  magnifierOutlineColor: ColorSetting;
  magnifierOutlineThickness: RangeSetting;
  magnifierAntialias: FlagSetting;
};
export type MagnifierSettingId = keyof MagnifierSettings;

export type XrSettingId = 'autoEnterVr';
export type XrSettings = Record<XrSettingId, FlagSetting>;

export type VisualizationSettingId =
  | CameraSettingId
  | ColorSettingId
  | CommunicationSettingId
  | ControlSettingId
  | DebugSettingId
  | HeatmapSettingId
  | EffectSettingId
  | LayoutSettingId
  | LabelSettingId
  | MagnifierSettingId
  | MinimapSettingId
  | MiscSettingId
  | PopupSettingId
  | SemanticZoomSettingId
  | XrSettingId;

export type VisualizationSettings = CameraSettings &
  CommunicationSettings &
  ControlSettings &
  DebugSettings &
  HeatmapSettings &
  EffectSettings &
  LayoutSettings &
  LabelSettings &
  MagnifierSettings &
  MinimapSettings &
  MiscSettings &
  PopupSettings &
  SemanticZoomSettings &
  XrSettings &
  ColorSettings;

export enum SettingLevel {
  DEFAULT,
  EXTENDED,
  DEVELOPER,
}

/**
 * Defines a dependency condition for a setting.
 * A setting with a dependsOn condition will only be displayed
 * if the condition is met.
 */
export type SettingDependency =
  | {
      /**
       * The setting ID that this setting depends on
       */
      settingId: VisualizationSettingId;
      /**
       * Single value that must match (equality check)
       */
      value: any;
    }
  | {
      /**
       * The setting ID that this setting depends on
       */
      settingId: VisualizationSettingId;
      /**
       * Array of allowed values. The setting is displayed if the dependent
       * setting's value is one of these values.
       */
      values: any[];
    }
  | {
      /**
       * The setting ID that this setting depends on
       */
      settingId: VisualizationSettingId;
      /**
       * Value that must NOT match (inequality check).
       * The setting is displayed if the dependent setting's value is NOT equal to this value.
       */
      notEqual: any;
    }
  | {
      /**
       * The setting ID that this setting depends on
       */
      settingId: VisualizationSettingId;
      /**
       * Array of values that must NOT match.
       * The setting is displayed if the dependent setting's value is NOT one of these values.
       */
      notValues: any[];
    };

export type Setting<T> = {
  value: T;
  group: SettingGroup;
  displayName: string;
  description: string;
  level: SettingLevel;
  /**
   * Optional dependency condition. If specified, this setting will only
   * be displayed if the dependency condition is met.
   */
  dependsOn?: SettingDependency;
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

export enum SelectedBuildingMetric {
  None = 'None',
  Method = 'Function Count',
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
