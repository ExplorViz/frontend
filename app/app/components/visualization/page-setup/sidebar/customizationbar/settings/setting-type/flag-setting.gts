import Component from '@glimmer/component';
import { FlagSetting as FlagSettingObject } from 'react-lib/src/utils/settings/settings-schemas';
import HelpTooltip from 'react-lib/src/components/help-tooltip.tsx';
import WideCheckbox from 'explorviz-frontend/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/wide-checkbox';
import ResetButton from 'explorviz-frontend/components/visualization/page-setup/sidebar/customizationbar/settings/setting-type/reset-button';
import react from 'explorviz-frontend/modifiers/react';

<template>
  <div class='setting-container d-flex justify-content-between'>
    <div>
      <div {{react HelpTooltip title=@setting.description}} />
      {{@setting.displayName}}
    </div>
    <div class='d-flex align-self-center'>
      <WideCheckbox @value={{@setting.value}} @onToggle={{@onChange}} />

      <ResetButton @onClick={{@onChange}} />
    </div>
  </div>
</template>
