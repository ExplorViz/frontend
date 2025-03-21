import { useEffect, useState, useRef } from 'react';
import { useARSettingsStore } from 'react-lib/src/stores/extended-reality/ar-settings';
import { useApplicationRendererStore } from 'react-lib/src/stores/application-renderer';
import { useConfigurationStore } from 'react-lib/src/stores/configuration';
import { Button } from 'react-bootstrap';

interface ArSettingsSelectorArgs {
  updateCameraResolution(width: number, height: number): void;
  updateRendererResolution(multiplier: number): void;
}

export default function ArSettingsSelector(args: ArSettingsSelectorArgs) { 
  const [buttonSize, setButtonSize] = useState<number>();
  const [buttonPadding, setButtonPadding] = useState<number>();

  const commWidthMutliplier = useConfigurationStore((state) => state.commWidthMultiplier);
  const commCurveHeightMultiplier = useConfigurationStore((state) => state.commCurveHeightMultiplier);
  const commCurveHeightDependsOnDistance = useConfigurationStore((state) => state.commCurveHeightDependsOnDistance);

  const cameraPresets = [
    { name: '640 x 480', width: 640, height: 480 },
    { name: '1280 x 720', width: 1280, height: 720 },
    { name: '1920 x 1080', width: 1920, height: 1080 },
  ];

  const renderResolutions = [
    { name: 'default', multiplier: 2 },
    { name: 'low', multiplier: 1 },
    { name: 'very low', multiplier: 0.5 },
  ];

  constructor(owner: any, args: ArSettingsSelectorArgs) {
    super(owner, args);

    buttonSize = ArSettingsSelector.getCssVminSize('--ar-button-size');
    buttonPadding = ArSettingsSelector.getCssVminSize(
      '--ar-button-padding'
    );
  }

  const updateZoomLevel = (event: any) => {
    useARSettingsStore.setState({
      zoomLevel: Number.parseFloat(event.target.value),
    });
  }

  const updateCommunicationWidth = (event: any) => {
    useConfigurationStore.setState({
      commWidthMultiplier: Number.parseFloat(event.target.value),
    });
    useApplicationRendererStore.getState().updateCommunication();
  }

  const updateCommunicationHeight = (event: any) => {
    useConfigurationStore.setState({
      commCurveHeightMultiplier: Number.parseFloat(event.target.value),
    });
    useApplicationRendererStore.getState().updateCommunication();
  }

  const updateCameraResoltion = (width: number, height: number) => {
    args.updateCameraResolution(width, height);
  }

  const updateRendererResoltion = (multiplier: number) => {
    args.updateRendererResolution(multiplier);
  }

  const toggleApplicationDependsOnDistance= () => {
    const oldValue = useConfigurationStore.getState().commCurveHeightDependsOnDistance;
    useConfigurationStore.setState({
      commCurveHeightDependsOnDistance: !oldValue,
    });

    useApplicationRendererStore.getState().updateCommunication();
  }

  const toggleRenderClassCommunication= () => {
    const oldValue = useARSettingsStore.getState().renderCommunication;
    useARSettingsStore.setState({
      renderCommunication: !oldValue,
    });

    useApplicationRendererStore.getState().updateCommunication();
  }

  const updateApplicationOpacity = (event: any) => {
    useARSettingsStore.getState().setApplicationOpacity(event.target.value);
  }

  const updateButtonSize=(event: any) => {
    const size = event.target.value;
    setButtonSize(size);

    ArSettingsSelector.setCssVariable('--ar-button-size', `${size}vmin`);
  }

  const updateButtonSpacing = (event: any) => {
    const padding = event.target.value;
    setButtonPadding(padding);

    ArSettingsSelector.setCssVariable('--ar-button-padding', `${padding}vmin`);
  }

  const setCssVariable = (variable: string, value: string) => {
    const root = document.querySelector(':root');
    if (root) {
      // TODO: Fin
      // <HTMLElement>root.style.setProperty(variable, value);
    }
  }

  const getCssVminSize = (variable: string) => {
    const root = document.querySelector(':root')!;

    const cssString = getComputedStyle(root).getPropertyValue(variable);
    const cssValue = Number.parseFloat(cssString.replace('vmin', ''));

    return cssValue;
  }

  return (
    <div id='ar-settings'>

      <div class='arSettingsGridContainer'>
        <div class='arSettingsGridItem arPresetGridItem'>
          <form
            method='get'
            action='ar_data/marker_images/Marker_DINA4.pdf'
            class='center-horizontal'
            target='_blank'
          >
            <button type='submit' class='btn btn-primary autoMargin'>Download
              Markers</button>
          </form>
        </div>

        <div
          id='cameraPresets'
          class='dropdown arSettingsGridItem arPresetGridItem'
        >
          <button
            class='btn btn-outline-dark dropdown-toggle autoMargin'
            type='button'
            data-toggle='dropdown'
            aria-haspopup='true'
            aria-expanded='false'
          >
            Camera Resolution
          </button>

          <div class='dropdown-menu'>
            {{#each this.cameraPresets as |cameraPreset|}}
              <div
                class='dropdown-item pointer-cursor'
                {{on
                  'click'
                  (fn
                    this.updateCameraResoltion
                    cameraPreset.width
                    cameraPreset.height
                  )
                }}
              >
                {{cameraPreset.name}}
              </div>
            {{/each}}
          </div>
        </div>

        <div
          id='rendererPresets'
          class='dropdown arSettingsGridItem arPresetGridItem'
        >
          <button
            class='btn btn-outline-dark dropdown-toggle autoMargin'
            type='button'
            data-toggle='dropdown'
            aria-haspopup='true'
            aria-expanded='false'
          >
            Rendering Resolution
          </button>

          <div class='dropdown-menu'>
            {{#each this.renderResolutions as |renderResolution|}}
              <div
                class='dropdown-item pointer-cursor'
                {{on
                  'click'
                  (fn this.updateRendererResoltion renderResolution.multiplier)
                }}
              >
                {{renderResolution.name}}
              </div>
            {{/each}}
          </div>
        </div>

        <div id='communicationSettingsContainer' class='arSettingsGridItem'>
          <div class='arSettingsPropertyContainer'>
            <label for='renderCommunicationCheckbox' class='form-label'>Render
              Communication</label>
            <div class='arSettingsSliderContainer'>
              <Input
                id='renderCommunicationCheckbox'
                @type='checkbox'
                @checked={{this.arSettings.renderCommunication}}
                {{on 'input' this.toggleRenderClassCommunication}}
              />
            </div>
          </div>

          <div class='arSettingsPropertyContainer'>
            <label for='communicationWidthRange' class='form-label'>Communication
              Width</label>
            <div class='arSettingsSliderContainer'>
              <Input
                id='communicationWidthRange'
                @type='range'
                @value={{this.configuration.commWidthMultiplier}}
                class='form-range'
                min='0.1'
                max='2.0'
                step='0.1'
                {{on 'input' this.updateCommunicationWidth}}
              />
              <div
                class='arSliderLabel'
              >{{this.configuration.commWidthMultiplier}}</div>
            </div>
          </div>

          <div class='arSettingsPropertyContainer'>
            <label for='communicationHeightRange' class='form-label'>Communication
              Height</label>
            <div class='arSettingsSliderContainer'>
              <Input
                id='communicationHeightRange'
                @type='range'
                @value={{this.configuration.commCurveHeightMultiplier}}
                class='form-range'
                min='0.0'
                max='3.0'
                step='0.2'
                {{on 'input' this.updateCommunicationHeight}}
              />
              <div
                class='arSliderLabel'
              >{{this.configuration.commCurveHeightMultiplier}}</div>
            </div>
          </div>

          <div class='arSettingsPropertyContainer'>
            <label for='communicationDistanceCheckbox' class='form-label'>Depends on
              Distance</label>
            <div class='arSettingsSliderContainer'>
              <Input
                id='communicationDistanceCheckbox'
                @type='checkbox'
                @checked={{this.configuration.commCurveHeightDependsOnDistance}}
                {{on 'input' this.toggleApplicationDependsOnDistance}}
              />
            </div>
          </div>
        </div>

        <div id='opacitySettingsContainer' class='arSettingsGridItem'>

          <div class='arSettingsPropertyContainer'>
            <label for='applicationOpacityRange' class='form-label'>Application
              Opacity</label>
            <div class='arSettingsSliderContainer'>
              <Input
                id='applicationOpacityRange'
                @type='range'
                @value={{this.arSettings.applicationOpacity}}
                class='form-range'
                min='0.1'
                max='1.0'
                step='0.1'
                {{on 'input' this.updateApplicationOpacity}}
              />
              <div
                class='arSliderLabel'
              >{{this.arSettings.applicationOpacity}}</div>
            </div>
          </div>
        </div>

        <div id='buttonSettingsContainer' class='arSettingsGridItem'>
          <div class='arSettingsPropertyContainer'>
            <label for='buttonSizeRange' class='form-label'>Button Size</label>
            <div class='arSettingsSliderContainer'>
              <Input
                id='buttonSizeRange'
                @type='range'
                @value={{this.buttonSize}}
                class='form-range'
                min='1.0'
                max='16.0'
                step='1.5'
                {{on 'input' this.updateButtonSize}}
              />
              <div class='arSliderLabel'>{{this.buttonSize}}</div>
            </div>
          </div>

          <div class='arSettingsPropertyContainer'>
            <label for='buttonSpacingRange' class='form-label'>Button Spacing</label>
            <div class='arSettingsSliderContainer'>
              <Input
                id='buttonSpacingRange'
                @type='range'
                @value={{this.buttonPadding}}
                class='form-range'
                min='0.0'
                max='10.0'
                step='1'
                {{on 'input' this.updateButtonSpacing}}
              />
              <div class='arSliderLabel'>{{this.buttonPadding}}</div>
            </div>
          </div>
        </div>

        <div id='miscSettingsContainer' class='arSettingsGridItem'>
          <div class='arSettingsPropertyContainer'>
            <label for='zoomLevelRange' class='form-label'>Zoom Level</label>
            <div class='arSettingsSliderContainer'>
              <Input
                id='zoomLevelRange'
                @type='range'
                @value={{this.arSettings.zoomLevel}}
                class='form-range'
                min='2.0'
                max='5.0'
                step='0.25'
                {{on 'input' this.updateZoomLevel}}
              />
              <div class='arSliderLabel'>{{this.arSettings.zoomLevel}}</div>
            </div>
          </div>

          <div class='arSettingsPropertyContainer'>
            <label for='stackPopupsCheckBox' class='form-label'>Stack Popups</label>
            <div class='arSettingsSliderContainer'>
              <Input
                id='stackPopupsCheckBox'
                @type='checkbox'
                @checked={{this.arSettings.stackPopups}}
              />
            </div>
          </div>
        </div>

      </div>

    </div>
  )
}