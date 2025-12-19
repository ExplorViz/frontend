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
  | 'Label'
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
  | 'classColor'
  | 'classTextColor'
  | 'communicationArrowColor'
  | 'communicationColor'
  | 'componentRootLevelColor'
  | 'componentDeepestLevelColor'
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
  | 'commCurveHeightDependsOnDistance';

// export type CommunicationSettings = Record<
//   CommunicationSettingId,
//   RangeSetting
// >;

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

export type HighlightingSettings = {
  applyHighlightingOnHover: FlagSetting;
  keepHighlightingOnOpenOrClose: FlagSetting;
  transparencyIntensity: RangeSetting;
  enableMultipleHighlighting: FlagSetting;
};
export type HighlightingSettingId = keyof HighlightingSettings;

export type EffectSettings = {
  animationDuration: RangeSetting;
  castShadows: FlagSetting;
  enableAnimations: FlagSetting;
  enableHoverEffects: FlagSetting;
  showAllClassLabels: FlagSetting;
  showOutlines: FlagSetting;
};
export type EffectSettingId = keyof EffectSettings;

export type LabelSettings = {
  appLabelMargin: RangeSetting;
  classLabelFontSize: RangeSetting;
  classLabelLength: RangeSetting;
  classLabelOrientation: RangeSetting;
  labelOffset: RangeSetting;
  maxCamHeightForCamera: RangeSetting;
  packageLabelMargin: RangeSetting;
  componentLabelPlacement: SelectSetting<string>;
};
export type LabelSettingId = keyof LabelSettings;

export type LayoutSettings = {
  applicationLayoutAlgorithm: SelectSetting<string>;
  packageLayoutAlgorithm: SelectSetting<string>;
  classLayoutAlgorithm: SelectSetting<string>;
  landscapeScalar: RangeSetting;
  landscapePositionX: RangeSetting;
  landscapePositionY: RangeSetting;
  landscapePositionZ: RangeSetting;
  landscapeRotationX: RangeSetting;
  landscapeRotationY: RangeSetting;
  landscapeRotationZ: RangeSetting;
  applicationDistance: RangeSetting;
  applicationAspectRatio: RangeSetting;
  appMargin: RangeSetting;
  packageMargin: RangeSetting;
  classFootprint: RangeSetting;
  classWidthMetric: SelectSetting<string>;
  classWidthMultiplier: RangeSetting;
  classDepthMetric: SelectSetting<string>;
  classDepthMultiplier: RangeSetting;
  classHeightMetric: SelectSetting<string>;
  classHeightMultiplier: RangeSetting;
  classMargin: RangeSetting;
  openedComponentHeight: RangeSetting;
  closedComponentHeight: RangeSetting;
  spiralCenterOffset: RangeSetting;
  spiralGap: RangeSetting;
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
  enableClustering: FlagSetting;
  displayClusters: FlagSetting;
  clusterCount: RangeSetting;
  labelDistanceThreshold: RangeSetting;
  distanceUpdateFrequency: RangeSetting;
};
export type SemanticZoomSettingId = keyof SemanticZoomSettings;

export type MiscSettings = {
  showEmbeddedBrowserIcon: FlagSetting;
};
export type MiscSettingId = keyof MiscSettings;

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
  | EffectSettingId
  | LayoutSettingId
  | LabelSettingId
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
  HighlightingSettings &
  EffectSettings &
  LayoutSettings &
  LabelSettings &
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
