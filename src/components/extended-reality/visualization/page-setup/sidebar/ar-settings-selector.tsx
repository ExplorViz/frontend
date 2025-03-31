import { useState } from 'react';
import { useARSettingsStore } from 'explorviz-frontend/src/stores/extended-reality/ar-settings';
import { useApplicationRendererStore } from 'explorviz-frontend/src/stores/application-renderer';
import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import { Dropdown } from 'react-bootstrap';

interface ArSettingsSelectorArgs {
  updateCameraResolution(width: number, height: number): void;
  updateRendererResolution(multiplier: number): void;
}

export default function ArSettingsSelector(args: ArSettingsSelectorArgs) {
  const [buttonSize, setButtonSize] = useState<number>(() =>
    getCssVminSize('--ar-button-size')
  );
  const [buttonPadding, setButtonPadding] = useState<number>(() =>
    getCssVminSize('--ar-button-padding')
  );

  const renderCommunication = useARSettingsStore(
    (state) => state.renderCommunication
  );
  const applicationOpacity = useARSettingsStore(
    (state) => state.applicationOpacity
  );
  const zoomLevel = useARSettingsStore((state) => state.zoomLevel);
  const commWidthMutliplier = useConfigurationStore(
    (state) => state.commWidthMultiplier
  );
  const commCurveHeightMultiplier = useConfigurationStore(
    (state) => state.commCurveHeightMultiplier
  );
  const commCurveHeightDependsOnDistance = useConfigurationStore(
    (state) => state.commCurveHeightDependsOnDistance
  );

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

  const updateZoomLevel = (event: React.FormEvent<HTMLInputElement>) => {
    useARSettingsStore.setState({
      zoomLevel: Number.parseFloat(event.currentTarget.value),
    });
  };

  const updateCommunicationWidth = (
    event: React.FormEvent<HTMLInputElement>
  ) => {
    useConfigurationStore.setState({
      commWidthMultiplier: Number.parseFloat(event.currentTarget.value),
    });
    useApplicationRendererStore.getState().updateCommunication();
  };

  const updateCommunicationHeight = (
    event: React.FormEvent<HTMLInputElement>
  ) => {
    useConfigurationStore.setState({
      commCurveHeightMultiplier: Number.parseFloat(event.currentTarget.value),
    });
    useApplicationRendererStore.getState().updateCommunication();
  };

  const updateCameraResolution = (width: number, height: number) => {
    args.updateCameraResolution(width, height);
  };

  const updateRendererResolution = (multiplier: number) => {
    args.updateRendererResolution(multiplier);
  };

  const toggleApplicationDependsOnDistance = () => {
    const oldValue = commCurveHeightDependsOnDistance;
    useConfigurationStore.setState({
      commCurveHeightDependsOnDistance: !oldValue,
    });

    useApplicationRendererStore.getState().updateCommunication();
  };

  const toggleRenderClassCommunication = () => {
    const oldValue = useARSettingsStore.getState().renderCommunication;
    useARSettingsStore.setState({
      renderCommunication: !oldValue,
    });

    useApplicationRendererStore.getState().updateCommunication();
  };

  const updateApplicationOpacity = (
    event: React.FormEvent<HTMLInputElement>
  ) => {
    useARSettingsStore
      .getState()
      .setApplicationOpacity(Number.parseFloat(event.currentTarget.value));
  };

  const stackPopups = useARSettingsStore((state) => state.stackPopups);
  const setStackPopups = useARSettingsStore((state) => state.setStackPopups);

  const updateButtonSize = (event: any) => {
    const size = event.target.value;
    setButtonSize(size);

    setCssVariable('--ar-button-size', `${size}vmin`);
  };

  const updateButtonSpacing = (event: React.FormEvent<HTMLInputElement>) => {
    const padding = event.currentTarget.value;
    setButtonPadding(Number.parseFloat(padding));

    setCssVariable('--ar-button-padding', `${padding}vmin`);
  };

  return (
    <div id="ar-settings">
      <div className="arSettingsGridContainer">
        <div className="arSettingsGridItem arPresetGridItem">
          <form
            method="get"
            action="ar_data/marker_images/Marker_DINA4.pdf"
            className="center-horizontal"
            target="_blank"
          >
            <button type="submit" className="btn btn-primary autoMargin">
              Download Markers
            </button>
          </form>
        </div>

        <div
          id="cameraPresets"
          className="dropdown arSettingsGridItem arPresetGridItem"
        >
          <Dropdown data-bs-theme="dark">
            <Dropdown.Toggle
              variant="secondary"
              className="autoMargin"
              aria-haspopup="true"
              aria-expanded="false"
            >
              Camera Resolution
            </Dropdown.Toggle>

            <Dropdown.Menu>
              {cameraPresets.map((cameraPreset) => (
                <Dropdown.Item
                  key={cameraPreset.name}
                  onSelect={() =>
                    updateCameraResolution(
                      cameraPreset.width,
                      cameraPreset.height
                    )
                  }
                >
                  {cameraPreset.name}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </div>

        <div
          id="rendererPresets"
          className="dropdown arSettingsGridItem arPresetGridItem"
        >
          <Dropdown data-bs-theme="dark">
            <Dropdown.Toggle
              variant="secondary"
              className="autoMargin"
              aria-haspopup="true"
              aria-expanded="false"
            >
              Rendering Resolution
            </Dropdown.Toggle>

            <Dropdown.Menu>
              {renderResolutions.map((renderResolution) => (
                <Dropdown.Item
                  key={renderResolution.name}
                  onSelect={() =>
                    updateRendererResolution(renderResolution.multiplier)
                  }
                >
                  {renderResolution.name}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </div>

        <div id="communicationSettingsContainer" className="arSettingsGridItem">
          <div className="arSettingsPropertyContainer">
            <label htmlFor="renderCommunicationCheckbox" className="form-label">
              Render Communication
            </label>
            <div className="arSettingsSliderContainer">
              <input
                id="renderCommunicationCheckbox"
                type="checkbox"
                checked={renderCommunication}
                onChange={toggleRenderClassCommunication}
              />
            </div>
          </div>

          <div className="arSettingsPropertyContainer">
            <label htmlFor="communicationWidthRange" className="form-label">
              Communication Width
            </label>
            <div className="arSettingsSliderContainer">
              <input
                id="communicationWidthRange"
                type="range"
                value={commWidthMutliplier}
                className="form-range"
                min="0.1"
                max="2.0"
                step="0.1"
                onInput={updateCommunicationWidth}
              />
              <div className="arSliderLabel">{commWidthMutliplier}</div>
            </div>
          </div>

          <div className="arSettingsPropertyContainer">
            <label htmlFor="communicationHeightRange" className="form-label">
              Communication Height
            </label>
            <div className="arSettingsSliderContainer">
              <input
                id="communicationHeightRange"
                type="range"
                value={commCurveHeightMultiplier}
                className="form-range"
                min="0.0"
                max="3.0"
                step="0.2"
                onInput={updateCommunicationHeight}
              />
              <div className="arSliderLabel">{commCurveHeightMultiplier}</div>
            </div>
          </div>

          <div className="arSettingsPropertyContainer">
            <label
              htmlFor="communicationDistanceCheckbox"
              className="form-label"
            >
              Depends on Distance
            </label>
            <div className="arSettingsSliderContainer">
              <input
                id="communicationDistanceCheckbox"
                type="checkbox"
                checked={commCurveHeightDependsOnDistance}
                onChange={toggleApplicationDependsOnDistance}
              />
            </div>
          </div>
        </div>

        <div id="opacitySettingsContainer" className="arSettingsGridItem">
          <div className="arSettingsPropertyContainer">
            <label htmlFor="applicationOpacityRange" className="form-label">
              Application Opacity
            </label>
            <div className="arSettingsSliderContainer">
              <input
                id="applicationOpacityRange"
                type="range"
                value={applicationOpacity}
                className="form-range"
                min="0.1"
                max="1.0"
                step="0.1"
                onInput={updateApplicationOpacity}
              />
              <div className="arSliderLabel">{applicationOpacity}</div>
            </div>
          </div>
        </div>

        <div id="buttonSettingsContainer" className="arSettingsGridItem">
          <div className="arSettingsPropertyContainer">
            <label htmlFor="buttonSizeRange" className="form-label">
              Button Size
            </label>
            <div className="arSettingsSliderContainer">
              <input
                id="buttonSizeRange"
                type="range"
                value={buttonSize}
                className="form-range"
                min="1.0"
                max="16.0"
                step="1.5"
                onInput={updateButtonSize}
              />
              <div className="arSliderLabel">{buttonSize}</div>
            </div>
          </div>

          <div className="arSettingsPropertyContainer">
            <label htmlFor="buttonSpacingRange" className="form-label">
              Button Spacing
            </label>
            <div className="arSettingsSliderContainer">
              <input
                id="buttonSpacingRange"
                type="range"
                value={buttonPadding}
                className="form-range"
                min="0.0"
                max="10.0"
                step="1"
                onInput={updateButtonSpacing}
              />
              <div className="arSliderLabel">{buttonPadding}</div>
            </div>
          </div>
        </div>

        <div id="miscSettingsContainer" className="arSettingsGridItem">
          <div className="arSettingsPropertyContainer">
            <label htmlFor="zoomLevelRange" className="form-label">
              Zoom Level
            </label>
            <div className="arSettingsSliderContainer">
              <input
                id="zoomLevelRange"
                type="range"
                value={zoomLevel}
                className="form-range"
                min="2.0"
                max="5.0"
                step="0.25"
                onInput={updateZoomLevel}
              />
              <div className="arSliderLabel">{zoomLevel}</div>
            </div>
          </div>

          <div className="arSettingsPropertyContainer">
            <label htmlFor="stackPopupsCheckBox" className="form-label">
              Stack Popups
            </label>
            <div className="arSettingsSliderContainer">
              <input
                id="stackPopupsCheckBox"
                type="checkbox"
                checked={stackPopups}
                onChange={() => setStackPopups(!stackPopups)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getCssVminSize(variable: string) {
  const root = document.documentElement;

  const cssString = getComputedStyle(root).getPropertyValue(variable);
  const cssValue = Number.parseFloat(cssString.replace('vmin', ''));

  return cssValue;
}

function setCssVariable(variable: string, value: string) {
  const root = document.querySelector(':root');
  if (root) {
    (root as HTMLElement).style.setProperty(variable, value);
  }
}
