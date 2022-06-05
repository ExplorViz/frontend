export type SettingGroup = 'Colors' | 'Highlighting' | 'Hover Effects'
| 'Communication' | 'Popup' | 'Debugging';

export type LandscapeColorSettingId
= 'nodeColor'
| 'applicationColor'
| 'communicationColor'
| 'nodeTextColor'
| 'applicationTextColor'
| 'backgroundColor';

export type LandscapeHoveringSettingId = 'enableHoverEffects';

export type LandscapeDebugSettingId = 'showFpsCounter';

export type LandscapeSettingId
= LandscapeColorSettingId
| LandscapeDebugSettingId
| LandscapeHoveringSettingId;

export type ApplicationColorSettingId
= 'foundationColor'
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

export type ApplicationHighlightingSettingId
= 'keepHighlightingOnOpenOrClose'
| 'transparencyIntensity';

export type ApplicationHoveringSettingId = 'enableHoverEffects';

export type ApplicationCommunicationSettingId =
| 'commArrowSize'
| 'curvyCommHeight';

export type ApplicationDebugSettingId = 'showFpsCounter';

export type ApplicationSettingId
= ApplicationColorSettingId
| ApplicationHighlightingSettingId
| ApplicationHoveringSettingId
| ApplicationCommunicationSettingId
| ApplicationDebugSettingId
| ApplicationPopupSettingId;

export type LandscapeColorSettings = Record<LandscapeColorSettingId, ColorSetting>;

export type LandscapeHoveringSettings = Record<LandscapeHoveringSettingId, FlagSetting>;

export type LandscapeDebugSettings = Record<LandscapeDebugSettingId, FlagSetting>;

export type ApplicationColorSettings = Record<ApplicationColorSettingId, ColorSetting>;

export type ApplicationHighlightingSettings = {
  keepHighlightingOnOpenOrClose: FlagSetting;
  transparencyIntensity: RangeSetting;
};

export type ApplicationHoveringSettings = Record<ApplicationHoveringSettingId, FlagSetting>;

export type ApplicationCommunicationSettings
= Record<ApplicationCommunicationSettingId, RangeSetting>;

export type ApplicationDebugSettings = Record<ApplicationDebugSettingId, FlagSetting>;

export type ApplicationPopupSettings = Record<ApplicationPopupSettingId, FlagSetting>;

export type ApplicationSettings
= ApplicationColorSettings
& ApplicationHighlightingSettings
& ApplicationHoveringSettings
& ApplicationDebugSettings
& ApplicationPopupSettings
& ApplicationCommunicationSettings;

export type LandscapeSettings = LandscapeColorSettings
& LandscapeHoveringSettings & LandscapeDebugSettings;

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
