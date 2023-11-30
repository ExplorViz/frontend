export type SettingGroup =
  | 'Colors'
  | 'Highlighting'
  | 'Hover Effects'
  | 'Communication'
  | 'Popup'
  | 'Camera'
  | 'Extended Reality'
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

export type ApplicationHighlightingSettingId =
  | 'applyHighlightingOnHover'
  | 'keepHighlightingOnOpenOrClose'
  | 'transparencyIntensity'
  | 'enableMultipleHighlighting';

export type ApplicationHoveringSettingId = 'enableHoverEffects';

export type ApplicationCommunicationSettingId =
  | 'commArrowSize'
  | 'curvyCommHeight';

export type ApplicationCameraSettingId = 'useOrthographicCamera';

export type ApplicationXRSettingId = 'showXRButton';

export type ApplicationDebugSettingId =
  | 'showFpsCounter'
  | 'showAxesHelper'
  | 'showLightHelper'
  | 'showVrOnClick';

export type ApplicationPopupSettingId = 'enableCustomPopupPosition';

export type ApplicationSettingId =
  | ApplicationColorSettingId
  | ApplicationHighlightingSettingId
  | ApplicationHoveringSettingId
  | ApplicationCommunicationSettingId
  | ApplicationDebugSettingId
  | ApplicationCameraSettingId
  | ApplicationXRSettingId
  | ApplicationPopupSettingId;

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

export type ApplicationDebugSettings = Record<
  ApplicationDebugSettingId,
  FlagSetting
>;

export type ApplicationPopupSettings = Record<
  ApplicationPopupSettingId,
  FlagSetting
>;

export type ApplicationCameraSettings = Record<
  ApplicationCameraSettingId,
  FlagSetting
>;

export type ApplicationXRSettings = Record<ApplicationXRSettingId, FlagSetting>;

export type ApplicationSettings = ApplicationColorSettings &
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
