export type SettingGroup =
  | 'Camera'
  | 'Minimap'
  | 'Colors'
  | 'Controls'
  | 'Communication'
  | 'Highlighting'
  | 'Effects'
  | 'Popups'
  | 'Annotations'
  | 'Virtual Reality'
  | 'Debugging';

export type ApplicationColorSettingId =
  | 'foundationColor'
  | 'componentOddColor'
  | 'componentEvenColor'
  | 'clazzColor'
  | 'highlightedEntityColor'
  | 'componentTextColor'
  | 'clazzTextColor'
  | 'foundationTextColor'
  | 'communicationColor'
  | 'communicationArrowColor'
  | 'backgroundColor';

export type ApplicationControlSettingId =
  | 'enableGamepadControls'
  | 'selectedGamepadIndex';

export type ApplicationHighlightingSettingId =
  | 'applyHighlightingOnHover'
  | 'keepHighlightingOnOpenOrClose'
  | 'transparencyIntensity'
  | 'enableMultipleHighlighting';

export type ApplicationHoveringSettingId =
  | 'enableHoverEffects'
  | 'enableAnimations'
  | 'castShadows';

export type ApplicationCommunicationSettingId =
  | 'commThickness'
  | 'commArrowSize'
  | 'curvyCommHeight';

export type ApplicationMinimapSettingId =
  | 'minimap'
  | 'zoom'
  | 'version2'
  | 'layer1'
  | 'layer2'
  | 'layer3'
  | 'layer4'
  | 'layer6'
  | 'layer7';

export type ApplicationCameraSettingId =
  | 'cameraNear'
  | 'cameraFar'
  | 'cameraFov';

export type ApplicationXRSettingId = 'showVrButton' | 'showVrOnClick';

export type ApplicationDebugSettingId =
  | 'showFpsCounter'
  | 'showAxesHelper'
  | 'showLightHelper'
  | 'fullscreen'
  | 'syncRoomState'
  | 'resetToDefaults';

export type ApplicationPopupSettingId = 'hidePopupDelay';

export type ApplicationAnnotationSettingId = 'enableCustomAnnotationPosition';

export type ApplicationSettingId =
  | ApplicationColorSettingId
  | ApplicationControlSettingId
  | ApplicationHighlightingSettingId
  | ApplicationHoveringSettingId
  | ApplicationCommunicationSettingId
  | ApplicationDebugSettingId
  | ApplicationCameraSettingId
  | ApplicationXRSettingId
  | ApplicationPopupSettingId
  | ApplicationMinimapSettingId
  | ApplicationAnnotationSettingId;

export type ApplicationColorSettings = Record<
  ApplicationColorSettingId,
  ColorSetting
>;

export type ApplicationControlSettings = {
  enableGamepadControls: FlagSetting;
  selectedGamepadIndex: RangeSetting;
};

export type ApplicationHighlightingSettings = {
  applyHighlightingOnHover: FlagSetting;
  keepHighlightingOnOpenOrClose: FlagSetting;
  transparencyIntensity: RangeSetting;
  enableMultipleHighlighting: FlagSetting;
};

export type ApplicationHoveringSettings = Record<
  ApplicationHoveringSettingId,
  FlagSetting
>;

export type ApplicationCommunicationSettings = Record<
  ApplicationCommunicationSettingId,
  RangeSetting
>;

export type ApplicationDebugSettings = {
  showFpsCounter: FlagSetting;
  showAxesHelper: FlagSetting;
  showLightHelper: FlagSetting;
  showVrOnClick: FlagSetting;
  fullscreen: ButtonSetting;
  syncRoomState: ButtonSetting;
  resetToDefaults: ButtonSetting;
};

export type ApplicationPopupSettings = {
  hidePopupDelay: RangeSetting;
};

export type ApplicationAnnotationSettings = Record<
  ApplicationAnnotationSettingId,
  FlagSetting
>;

export type ApplicationCameraSettings = {
  cameraNear: RangeSetting;
  cameraFar: RangeSetting;
  cameraFov: RangeSetting;
};

export type ApplicationMinimapSettings = {
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

export type ApplicationXRSettings = Record<ApplicationXRSettingId, FlagSetting>;

export type ApplicationSettings = ApplicationColorSettings &
  ApplicationControlSettings &
  ApplicationHighlightingSettings &
  ApplicationHoveringSettings &
  ApplicationDebugSettings &
  ApplicationPopupSettings &
  ApplicationAnnotationSettings &
  ApplicationCameraSettings &
  ApplicationXRSettings &
  ApplicationCommunicationSettings &
  ApplicationMinimapSettings;

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
