import { defaultApplicationColors, defaultLandscapeColors } from './color-schemes';
import { ApplicationSettings, LandscapeSettings } from './settings-schemas';

export const defaultApplicationSettings: ApplicationSettings = {
  // Color Settings
  foundationColor: {
    value: defaultApplicationColors.foundationColor,
    orderNumber: 1,
    group: 'Colors',
    displayName: 'Foundation',
    isColorSetting: true,
  },
  componentOddColor: {
    value: defaultApplicationColors.componentOddColor,
    orderNumber: 2,
    group: 'Colors',
    displayName: 'Component Odd',
    isColorSetting: true,
  },
  componentEvenColor: {
    value: defaultApplicationColors.componentEvenColor,
    orderNumber: 3,
    group: 'Colors',
    displayName: 'Component Even',
    isColorSetting: true,
  },
  clazzColor: {
    value: defaultApplicationColors.clazzColor,
    orderNumber: 4,
    group: 'Colors',
    displayName: 'Class',
    isColorSetting: true,
  },
  highlightedEntityColor: {
    value: defaultApplicationColors.highlightedEntityColor,
    orderNumber: 5,
    group: 'Colors',
    displayName: 'Highlighted Entity',
    isColorSetting: true,
  },
  componentTextColor: {
    value: defaultApplicationColors.componentTextColor,
    orderNumber: 6,
    group: 'Colors',
    displayName: 'Component Label',
    isColorSetting: true,
  },
  clazzTextColor: {
    value: defaultApplicationColors.clazzTextColor,
    orderNumber: 7,
    group: 'Colors',
    displayName: 'Class Label',
    isColorSetting: true,
  },
  foundationTextColor: {
    value: defaultApplicationColors.foundationTextColor,
    orderNumber: 8,
    group: 'Colors',
    displayName: 'Foundation Label',
    isColorSetting: true,
  },
  communicationColor: {
    value: defaultApplicationColors.communicationColor,
    orderNumber: 9,
    group: 'Colors',
    displayName: 'Communication',
    isColorSetting: true,
  },
  communicationArrowColor: {
    value: defaultApplicationColors.communicationArrowColor,
    orderNumber: 10,
    group: 'Colors',
    displayName: 'Communication Arrow',
    isColorSetting: true,
  },
  backgroundColor: {
    value: defaultApplicationColors.backgroundColor,
    orderNumber: 11,
    group: 'Colors',
    displayName: 'Background',
    isColorSetting: true,
  },
  // Highlighting Settings
  keepHighlightingOnOpenOrClose: {
    value: true,
    orderNumber: 1,
    group: 'Highlighting',
    displayName: 'Keep Highlighting On Open Or Close',
    description: 'Toggle if highlighting should be reset on double click in application visualization',
    isFlagSetting: true,
  },
  transparencyIntensity: {
    value: 0.1,
    range: {
      min: 0.1,
      max: 1.0,
    },
    orderNumber: 2,
    group: 'Highlighting',
    displayName: 'Transparency Intensity in Application Visualization',
    description: 'Transparency effect intensity (\'Enable Transparent Components\' must be enabled)',
    isRangeSetting: true,
  },
  // Hover Effect Settings
  enableHoverEffects: {
    value: true,
    orderNumber: 1,
    group: 'Hover Effects',
    displayName: 'Enable Hover Effects',
    description: 'Hover effect (flashing entities) for mouse cursor',
    isFlagSetting: true,
  },
  // Communication Settings
  commArrowSize: {
    value: 1.0,
    range: {
      min: 0.0,
      max: 5.0,
    },
    orderNumber: 1,
    group: 'Communication',
    displayName: 'Arrow Size in Application Visualization',
    description: 'Arrow Size for selected communications in application visualization',
    isRangeSetting: true,
  },
  curvyCommHeight: {
    value: 0.0,
    range: {
      min: 0.0,
      max: 1.5,
    },
    orderNumber: 2,
    group: 'Communication',
    displayName: 'Curviness factor of the Communication Lines',
    description: 'If greater 0.0, communication lines are rendered arc-shaped (Straight lines: 0.0)',
    isRangeSetting: true,
  },
  enableCustomPopupPosition: {
    value: true,
    orderNumber: 1,
    group: 'Popup',
    displayName: 'Enable Custom Popup Positioning',
    description: 'If enabled, popups can be dragged to a prefered, fixed position',
    isFlagSetting: true,
  },
  // Debug Settings
  showFpsCounter: {
    value: false,
    orderNumber: 1,
    group: 'Debugging',
    displayName: 'Show FPS Counter',
    description: '\'Frames Per Second\' metrics in visualizations',
    isFlagSetting: true,
  },
};

export const defaultLanscapeSettings: LandscapeSettings = {
  // Color Settings
  nodeColor: {
    value: defaultLandscapeColors.nodeColor,
    orderNumber: 1,
    group: 'Colors',
    displayName: 'Node',
    isColorSetting: true,
  },
  applicationColor: {
    value: defaultLandscapeColors.applicationColor,
    orderNumber: 2,
    group: 'Colors',
    displayName: 'Application',
    isColorSetting: true,
  },
  communicationColor: {
    value: defaultLandscapeColors.communicationColor,
    orderNumber: 3,
    group: 'Colors',
    displayName: 'Communication',
    isColorSetting: true,
  },
  nodeTextColor: {
    value: defaultLandscapeColors.nodeTextColor,
    orderNumber: 4,
    group: 'Colors',
    displayName: 'Node Label',
    isColorSetting: true,
  },
  applicationTextColor: {
    value: defaultLandscapeColors.applicationTextColor,
    orderNumber: 5,
    group: 'Colors',
    displayName: 'Application Label',
    isColorSetting: true,
  },
  backgroundColor: {
    value: defaultLandscapeColors.backgroundColor,
    orderNumber: 6,
    group: 'Colors',
    displayName: 'Background',
    isColorSetting: true,
  },
  // Hover Effect Settings
  enableHoverEffects: {
    value: true,
    orderNumber: 1,
    group: 'Hover Effects',
    displayName: 'Enable Hover Effects',
    description: 'Hover effect (flashing entities) for mouse cursor',
    isFlagSetting: true,
  },
  showFpsCounter: {
    value: false,
    orderNumber: 1,
    group: 'Debugging',
    displayName: 'Show FPS Counter',
    description: '\'Frames Per Second\' metrics in visualizations',
    isFlagSetting: true,
  },
};
