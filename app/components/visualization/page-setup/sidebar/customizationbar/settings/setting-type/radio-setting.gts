import { on } from '@ember/modifier';
import { fn } from '@ember/helper';
import HelpTooltip from 'explorviz-frontend/components/help-tooltip';
import stringComparison from 'explorviz-frontend/helpers/string-comparison';

<template>
  <HelpTooltip @title={{@setting.description}} />
  <span>{{@setting.displayName}}:</span>
  <div style='margin-left: 1.5rem'>
    {{#each @setting.values as |value|}}
      <div class='form-check'>
        <input
          class='form-check-input'
          type='radio'
          name='flexRadioDefault'
          id={{value}}
          {{on 'change' (fn @onChange value)}}
          checked={{stringComparison @setting.value value}}
        />
        <label class='form-check-label' for={{value}}>
          {{value}}
        </label>
      </div>
    {{/each}}
  </div>
</template>
