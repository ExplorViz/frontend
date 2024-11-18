export const gamepadMappings: GamepadMapping[] = [
  {
    gamepadId: 'Standard',
    axis: {
      StickLeftH: 0,
      StickLeftV: 1,
      StickRightH: 2,
      StickRightV: 3,
      TriggerLeft: 4,
      TriggerRight: 5,
      DPadH: 6,
      DPadV: 7,
    },
    buttons: {
      FaceDown: 0,
      FaceRight: 1,
      FaceUp: 2,
      FaceLeft: 3,
      ShoulderLeft: 4,
      ShoulderRight: 5,
      TriggerLeft: 6,
      TriggerRight: 7,
      Select: 8,
      Start: 9,
      Home: 10,
      StickLeftPress: 11,
      StickRightPress: 12,
    },
  },
];

export type GamepadMapping = {
  gamepadId: string;
  axis: AxisMapping;
  buttons: ButtonMapping;
};

export type ButtonMapping = {
  FaceDown: number;
  FaceRight: number;
  FaceUp: number;
  FaceLeft: number;
  ShoulderLeft: number;
  ShoulderRight: number;
  TriggerLeft: number;
  TriggerRight: number;
  Select: number;
  Start: number;
  Home: number;
  StickLeftPress: number;
  StickRightPress: number;
};

export type AxisMapping = {
  StickLeftH: number;
  StickLeftV: number;
  TriggerLeft: number;
  StickRightH: number;
  StickRightV: number;
  TriggerRight: number;
  DPadH: number;
  DPadV: number;
};
