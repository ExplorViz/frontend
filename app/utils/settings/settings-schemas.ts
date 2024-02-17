export type SettingGroup =
  | 'Camera'
  | 'Colors'
  | 'Communication'
  | 'Highlighting'
  | 'Hover Effect'
  | 'Popups'
  | 'Virtual Reality'
  | 'Debugging';

export type ApplicationRenderSettingId =
  | 'staticStructure'
  | 'dynamicStructure';

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

export type ApplicationHighlightingSettingId =
  | 'applyHighlightingOnHover'
  | 'keepHighlightingOnOpenOrClose'
  | 'transparencyIntensity'
  | 'enableMultipleHighlighting';

export type ApplicationHoveringSettingId = 'enableHoverEffects';

export type ApplicationCommunicationSettingId =
  | 'commThickness'
  | 'commArrowSize'
  | 'curvyCommHeight';

export type ApplicationCameraSettingId = 'useOrthographicCamera' | 'cameraFov';

export type ApplicationXRSettingId = 'showVrButton' | 'showVrOnClick';

export type ApplicationDebugSettingId =
  | 'showFpsCounter'
  | 'showAxesHelper'
  | 'showLightHelper'
  | 'fullscreen'
  | 'resetToDefaults';

export type ApplicationPopupSettingId = 'enableCustomPopupPosition';

export type ApplicationSettingId =
  | ApplicationRenderSettingId
  | ApplicationColorSettingId
  | ApplicationHighlightingSettingId
  | ApplicationHoveringSettingId
  | ApplicationCommunicationSettingId
  | ApplicationDebugSettingId
  | ApplicationCameraSettingId
  | ApplicationXRSettingId
  | ApplicationPopupSettingId;


export type ApplicationRenderSettings = Record<ApplicationRenderSettingId, FlagSetting>; 
export type ApplicationColorSettings = Record<
  ApplicationColorSettingId,
  ColorSetting
>;

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
  resetToDefaults: ButtonSetting;
};

// export type ApplicationRenderSettings = {
//   showDynamicStructure: FlagSetting;
//   showStaticStructure: FlagSetting;
// };

export type ApplicationPopupSettings = Record<
  ApplicationPopupSettingId,
  FlagSetting
>;

export type ApplicationCameraSettings = {
  useOrthographicCamera: FlagSetting;
  cameraFov: RangeSetting;
};

export type ApplicationXRSettings = Record<ApplicationXRSettingId, FlagSetting>;

export type ApplicationSettings = ApplicationRenderSettings &
ApplicationColorSettings &
  ApplicationHighlightingSettings &
  ApplicationHoveringSettings &
  ApplicationDebugSettings &
  ApplicationPopupSettings &
  ApplicationCameraSettings &
  ApplicationXRSettings &
  ApplicationCommunicationSettings;

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
