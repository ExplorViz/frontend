export type SettingGroup =
  | 'Annotations'
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

export type AnnotationSettingId = 'enableCustomAnnotationPosition';

export type AnnotationSettings = Record<AnnotationSettingId, FlagSetting>;

export type CameraSettingId = 'cameraNear' | 'cameraFar' | 'cameraFov';

export type CameraSettings = {
  cameraNear: RangeSetting;
  cameraFar: RangeSetting;
  cameraFov: RangeSetting;
};

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
  | 'highlightedEntityColor'
  | 'k8sNodeColor'
  | 'k8sNamespaceColor'
  | 'k8sDeploymentColor'
  | 'k8sPodColor'
  | 'k8sTextColor';

export type ColorSettings = Record<ColorSettingId, ColorSetting>;

export type ControlSettingId = 'enableGamepadControls' | 'selectedGamepadIndex';

export type ControlSettings = {
  enableGamepadControls: FlagSetting;
  selectedGamepadIndex: RangeSetting;
};

export type CommunicationSettingId =
  | 'commThickness'
  | 'commArrowSize'
  | 'commArrowOffset'
  | 'curvyCommHeight';

export type CommunicationSettings = Record<
  CommunicationSettingId,
  RangeSetting
>;

export type DebugSettingId =
  | 'showExtendedSettings'
  | 'showFpsCounter'
  | 'showAxesHelper'
  | 'showLightHelper'
  | 'showSemanticZoomCenterPoints'
  | 'fullscreen'
  | 'syncRoomState'
  | 'resetToDefaults';

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

export type HeatmapSettingId = 'heatmapEnabled';

export type HeatmapSettings = {
  heatmapEnabled: FlagSetting;
};

export type HighlightingSettingId =
  | 'applyHighlightingOnHover'
  | 'keepHighlightingOnOpenOrClose'
  | 'transparencyIntensity'
  | 'enableMultipleHighlighting';

export type HighlightingSettings = {
  applyHighlightingOnHover: FlagSetting;
  keepHighlightingOnOpenOrClose: FlagSetting;
  transparencyIntensity: RangeSetting;
  enableMultipleHighlighting: FlagSetting;
};

export type HoveringSettingId =
  | 'enableHoverEffects'
  | 'enableAnimations'
  | 'castShadows';

export type HoveringSettings = Record<HoveringSettingId, FlagSetting>;

export type LayoutSettingId =
  | 'applicationDistance'
  | 'applicationAspectRatio'
  | 'classFootprint'
  | 'classMargin'
  | 'classLabelFontSize'
  | 'classLabelLength'
  | 'classLabelOffset'
  | 'classLabelOrientation'
  | 'appLabelMargin'
  | 'appMargin'
  | 'packageLabelMargin'
  | 'packageMargin'
  | 'openedComponentHeight'
  | 'closedComponentHeight';

export type LayoutSettings = Record<LayoutSettingId, RangeSetting>;

export type MinimapSettingId =
  | 'minimap'
  | 'zoom'
  | 'useCameraPosition'
  | 'layer1'
  | 'layer2'
  | 'layer3'
  | 'layer4'
  | 'layer6'
  | 'layer7';

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

export type PopupSettingId = 'hidePopupDelay';

export type PopupSettings = {
  hidePopupDelay: RangeSetting;
};

export type SemanticZoomSettingId =
  | 'semanticZoomState'
  | 'usePredefinedSet'
  | 'distancePreSet'
  | 'distanceLevel1'
  | 'distanceLevel2'
  | 'distanceLevel3'
  | 'distanceLevel4'
  | 'distanceLevel5'
  | 'autoOpenCloseFeature'
  | 'useKmeansInsteadOfMeanShift'
  | 'clusterBasedOnMembers';

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
  useKmeansInsteadOfMeanShift: FlagSetting;
};

export type XrSettingId = 'showVrButton' | 'showVrOnClick';

export type XrSettings = Record<XrSettingId, FlagSetting>;

export type VisualizationSettingId =
  | AnnotationSettingId
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

export type VisualizationSettings = AnnotationSettings &
  CameraSettings &
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
