import React, { useState, useEffect } from 'react';
import {
  useHeatmapConfigurationStore,
  HeatmapMode as HeatmapMode2,
} from '../../../stores/heatmap/heatmap-configuration';
import HelpTooltip from '../../help-tooltip';
import Select from 'react-select';
import { Button, Col, Form, Row } from 'react-bootstrap';
import WideCheckbox from '../../visualization/page-setup/sidebar/customizationbar/settings/setting-type/wide-checkbox';

interface HeatmapMode {
  name: string;
  id: string;
}

const heatmapModes: HeatmapMode[] = [
  { name: 'Aggregated Heatmap', id: 'aggregatedHeatmap' },
  { name: 'Windowed Heatmap', id: 'windowedHeatmap' },
];

const descriptions = {
  heatmapMode:
    'Aggregated Heatmap: The values of previous heatmaps are aggregated and added to the' +
    ' current value. Windowed Heatmap: The metrics are shown as a difference to the previous heatmap.' +
    ' The windowsize can be configured in the backend.',
  helperLines:
    'Show the helper lines to determine which point on the heatmap belongs to which class.',
  shGradient:
    'Configure the simple heat gradient. Use either rgb, hex or css-style format.',
  ahGradient:
    'Configure the array heat gradient. Use either rgb, hex or css-style format.',
  opacityValue:
    'Set the opacity of the package boxes. Choose a value between 0 and 1.',
  showLegendValues:
    'Select wether the raw heatmap values or their abstractions should be shown as label.',
  heatmapRadius: 'The size of each color point.',
  blurRadius: 'The radius at which the colors blur together.',
};

export default function HeatmapSettings() {
  const [selectedMode, setSelectedMode] = useState<HeatmapMode | null>(null);
  const [showSimpleHeatSettings, setShowSimpleHeatSettings] =
    useState<boolean>(false);

  const selectedModeFromStore = useHeatmapConfigurationStore(
    (state) => state.selectedMode
  );
  const setSelectedModeFromStore = useHeatmapConfigurationStore(
    (state) => state.setSelectedMode
  );
  const heatmapRadius = useHeatmapConfigurationStore(
    (state) => state.heatmapRadius
  );
  const setHeatmapRadius = useHeatmapConfigurationStore(
    (state) => state.setHeatmapRadius
  );
  const blurRadius = useHeatmapConfigurationStore((state) => state.blurRadius);
  const setBlurRadius = useHeatmapConfigurationStore(
    (state) => state.setBlurRadius
  );
  const showLegendValues = useHeatmapConfigurationStore(
    (state) => state.showLegendValues
  );
  const setShowLegendValues = useHeatmapConfigurationStore(
    (state) => state.setShowLegendValues
  );
  const resetSimpleHeatGradientFromStore = useHeatmapConfigurationStore(
    (state) => state.resetSimpleHeatGradient
  );
  const useHelperLines = useHeatmapConfigurationStore(
    (state) => state.useHelperLines
  );
  const setUseHelperLines = useHeatmapConfigurationStore(
    (state) => state.setUseHelperLines
  );
  const simpleHeatGradient = useHeatmapConfigurationStore(
    (state) => state.simpleHeatGradient
  );
  const setSimpleHeatGradient = useHeatmapConfigurationStore(
    (state) => state.setSimpleHeatGradient
  );

  useEffect(() => {
    setSelectedMode(
      selectedModeFromStore === 'aggregatedHeatmap'
        ? heatmapModes[0]
        : heatmapModes[1]
    );
  }, []);

  const setHeatmapMode = (mapMode: HeatmapMode) => {
    setSelectedMode(mapMode);
    setSelectedModeFromStore(mapMode.id as HeatmapMode2);
  };

  const onHeatmapRadiusChange = (heatmapRadiusNew: number) => {
    setHeatmapRadius(heatmapRadiusNew);
  };

  const onBlurRadiusChange = (blurRadiusNew: number) => {
    setBlurRadius(blurRadiusNew);
  };

  const toggleLegendValues = () => {
    setShowLegendValues(!showLegendValues);
  };

  const toggleSimpleHeatSettings = () => {
    setShowSimpleHeatSettings(!showSimpleHeatSettings);
  };

  const resetSimpleHeatGradient = () => {
    resetSimpleHeatGradientFromStore();
  };

  const toggleHelperLines = () => {
    setUseHelperLines(!useHelperLines);
  };

  return (
    <>
      <div className="container" id="heatmap-config">
        <h4>Rendering configuration</h4>
        <div className="pl-3 py-2">
          <div className="d-flex justify-content-between pr-1">
            <div>
              Choose heatmap type
              <HelpTooltip title={descriptions.heatmapMode} placement="right" />
            </div>
            <div className="align-items-end">
              <Select
                options={heatmapModes}
                getOptionLabel={(option) => option.name}
                getOptionValue={(option) => option.id}
                value={selectedMode}
                onChange={(value) => setHeatmapMode(value as HeatmapMode)}
                placeholder="Select heatmap mode..."
                isSearchable={false}
              />
            </div>
          </div>
        </div>

        <div className="pl-3">
          <div className="d-flex justify-content-between">
            <div>
              Set heatmap point radius
              <HelpTooltip
                title={descriptions.heatmapRadius}
                placement="right"
              />
            </div>
            <Form.Group controlId="heatmapRadius" className="d-contents">
              <Form.Control
                type="number"
                step="1"
                value={heatmapRadius}
                onChange={(e) => onHeatmapRadiusChange(Number(e.target.value))}
              />
            </Form.Group>
          </div>
        </div>

        <div className="pl-3 py-2">
          <div className="d-flex justify-content-between">
            <div>
              Set heatmap blur radius
              <HelpTooltip title={descriptions.blurRadius} placement="right" />
            </div>
            <Form.Group controlId="blurRadius" className="d-contents">
              <Form.Control
                type="number"
                step="1"
                value={blurRadius}
                onChange={(e) => onBlurRadiusChange(Number(e.target.value))}
              />
            </Form.Group>
          </div>
        </div>

        <div className="pl-3">
          <div className="d-flex justify-content-between pr-3">
            <div>
              Show helper lines
              <HelpTooltip title={descriptions.helperLines} placement="right" />
            </div>
            <WideCheckbox value={useHelperLines} onToggle={toggleHelperLines} />
          </div>
        </div>

        <div className="pl-3">
          <div className="d-flex justify-content-between pr-3">
            <div>
              Show legend values
              <HelpTooltip
                title={descriptions.showLegendValues}
                placement="right"
              />
            </div>
            <WideCheckbox
              value={showLegendValues}
              onToggle={toggleLegendValues}
            />
          </div>
        </div>

        <div className="d-flex justify-content-between pr-3 mt-5">
          <div>
            <h4>
              Simpleheat gradient configuration
              <HelpTooltip title={descriptions.shGradient} placement="right" />
            </h4>
          </div>
          <WideCheckbox
            value={showSimpleHeatSettings}
            onToggle={toggleSimpleHeatSettings}
          />
        </div>

        {showSimpleHeatSettings && (
          <>
            <Row className="mb-1 pr-3">
              {Object.entries(simpleHeatGradient).length > 0 ? (
                Object.entries(simpleHeatGradient).map(([key, value]) => (
                  <Col md={4} lg={2} xl={2} className="mt-3" key={key}>
                    <div>Stop value: {key.replace('_', '.')}</div>
                    <Form.Group
                      controlId={`sh-gradient-${key}`}
                      className="input-group"
                    >
                      <Form.Control
                        type="text"
                        className="form-control input-lg"
                        value={value}
                        onChange={(e) =>
                          setSimpleHeatGradient((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                      />
                    </Form.Group>
                  </Col>
                ))
              ) : (
                <div>ERR: Gradient is empty.</div>
              )}
            </Row>
            <div className="d-flex justify-content-end pr-3">
              <Button variant="primary" onClick={resetSimpleHeatGradient}>
                Reset to default
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
