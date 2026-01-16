import { useState } from 'react';
import { Container, Text } from '@react-three/uikit';
import { Label, Switch, Slider, Button, RadioGroup, RadioGroupItem } from '@react-three/uikit-default';

import { useUserSettingsStore } from "explorviz-frontend/src/stores/user-settings";
import { 
  isButtonSetting, 
  isColorSetting, 
  isFlagSetting, 
  isRangeSetting,
  isSelectSetting,
  VisualizationSettingId,
} from "../../settings/settings-schemas";

export default function SubsettingsMenu({ 
  settingId,
}: {
  settingId: VisualizationSettingId;
}) {
  const setting = useUserSettingsStore(
    (state) => state.visualizationSettings[settingId]
  );
  const updateUserSetting = useUserSettingsStore(
    (state) => state.updateSetting
  );
  const [sliderValue, setSliderValue] = useState<number>(isRangeSetting(setting) ? setting.value : 0);
  
  const updateFlagSetting = (value?: boolean) => {
    try {
      updateUserSetting(settingId, value);
    } catch (e: any) {
      console.log(e.message);
    }

    if (value === undefined) return;
  };

  const updateRangeSetting = (value: number) => {
    try {
      updateUserSetting(settingId, value);
    } catch (e: any) {
      console.log(e.message);
    }
  };

  const updateColorSetting = () => {};

  const updateButtonSetting = () => {};

  const updateSelectSetting = (value: unknown) => {
    try {
      updateUserSetting(settingId, value);
    } catch (e: any) {
      console.log(e.message);
    }
  };

  return (
    {isFlagSetting(setting) && (
      <Container 
        flexDirection="row"
        alignItems="center" 
        gap={8} 
      >
        <Switch 
          defaultChecked={!setting.value} 
          onClick={() => updateFlagSetting(!setting.value)}
        />
        <Label>
          <Text>{setting.displayName}</Text>
        </Label>
      </Container>
    )}
    {isRangeSetting(setting) && (
      <Container 
        flexDirection="row"
        alignItems="center" 
        gap={8} 
      >
        <Slider 
          min={setting.range.min}
          max={setting.range.max}
          step={setting.range.step}
          width={300}
          value={sliderValue}
          onValueChange={(v) =>
            setSliderValue(v)
            updateRangeSetting(v)
          }
        />
        <Label>
          <Text>{setting.displayName}</Text>
        </Label>
      </Container>
    )}
    {isColorSetting(setting) && (
      <Text>Text</Text>
    )}
    {isButtonSetting(setting) && (
      <Container 
        flexDirection="row"
        alignItems="center" 
        gap={8} 
      >
        <Button size="icon">
          <Text>{setting.buttonText}</Text>
        </Button>
        <Label>
          <Text>{setting.displayName}</Text>
        </Label>
      </Container>
    )}
    {isSelectSetting(setting) && (
      <Container
        flexDirection="row"
        alignItems="center"
        gap={8}
      >
        <RadioGroup>
          setting.options.map((option) => {
            return (
              <RadioGroupItem 
                onClick={() => updateSelectSetting(option)}
              >
                <Label>
                  <Text>{option}</Text>
                </Label>
              </RadioGroupItem>
            );
          })
        </RadioGroup>
        <Label>
          <Text>{setting.displayName}</Text>
        </Label>
      </Container>
    )}
  );
}