import { defaultApplicationColors } from './color-schemes';
import { ApplicationSettings } from './settings-schemas';

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
    description:
      'Toggle if highlighting should be reset on double click in application visualization',
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
    description:
      "Transparency effect intensity ('Enable Transparent Components' must be enabled)",
    isRangeSetting: true,
  },
  enableMultipleHighlighting: {
    value: true,
    orderNumber: 3,
    group: 'Highlighting',
    displayName: 'Enable Multiple Highlighting',
    description:
      'Toggle if highlighting should be kept on highlighting an unhighlighted component within the same application',
    isFlagSetting: true,
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
    description:
      'Arrow Size for selected communications in application visualization',
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
    description:
      'If greater 0.0, communication lines are rendered arc-shaped (Straight lines: 0.0)',
    isRangeSetting: true,
  },
  // Popup Settings
  enableCustomPopupPosition: {
    value: true,
    orderNumber: 1,
    group: 'Popup',
    displayName: 'Enable Custom Popup Positioning',
    description:
      'If enabled, popups can be dragged to a prefered, fixed position',
    isFlagSetting: true,
  },
  // Camera Settings
  useOrthographicCamera: {
    value: false,
    orderNumber: 1,
    group: 'Camera',
    displayName: 'Use orthographic camera instead of perspective',
    description: 'Switch between orthographic and perspective camera',
    isFlagSetting: true,
  },
  // XR Settings
  showXRButton: {
    value: true,
    orderNumber: 1,
    group: 'Extended Reality',
    displayName: 'Show XR Button',
    description: 'Toggle visibility of XR button',
    isFlagSetting: true,
  },
  // Debug Settings
  showFpsCounter: {
    value: false,
    orderNumber: 1,
    group: 'Debugging',
    displayName: 'Show FPS Counter',
    description: "'Frames Per Second' metrics in visualizations",
    isFlagSetting: true,
  },
  showAxesHelper: {
    value: false,
    orderNumber: 1,
    group: 'Debugging',
    displayName: 'Show Axes Helper',
    description: 'Visualizes the three dimensional Cartesian coordinate system',
    isFlagSetting: true,
  },
  showLightHelper: {
    value: false,
    orderNumber: 1,
    group: 'Debugging',
    displayName: 'Show Light Helper',
    description: 'Visualizes the directional light',
    isFlagSetting: true,
  },
  showVrOnClick: {
    value: false,
    orderNumber: 1,
    group: 'Debugging',
    displayName: 'Show VR in browser',
    description: 'Shows the VR room in the browser after joining',
    isFlagSetting: true,
  },
};
