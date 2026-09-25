import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  getLabelForModelType,
  sortModelTypes,
} from 'explorviz-frontend/src/utils/model-type-utils';
import Form from 'react-bootstrap/Form';
import { useShallow } from 'zustand/react/shallow';
import ColorSwatch from '../color-swatch';

export default function ModelTypeFiltering() {
  const { hiddenModelTypes, toggleModelTypeVisibility } = useVisualizationStore(
    useShallow((state) => ({
      hiddenModelTypes: state.hiddenModelTypes,
      toggleModelTypeVisibility: state.actions.toggleModelTypeVisibility,
    }))
  );
  const buildingColorOverrides = useUserSettingsStore(
    (state) => state.visualizationSettings.buildingColorOverrides
  );
  const buildingColor = useUserSettingsStore(
    (state) => state.visualizationSettings.buildingColor
  );
  const buildings = useModelStore((state) => state.buildings);

  const buildingTypesInLandscape = sortModelTypes(
    Array.from(
      new Set([
        ...Object.values(buildings)
          .map((m) => m.type)
          .filter((t) => !!t),
        ...hiddenModelTypes,
      ])
    )
  );

  return (
    <div>
      {buildingTypesInLandscape.map((type) => {
        const color =
          buildingColorOverrides.value.modelType[type] ?? buildingColor.value;
        const isVisible = !hiddenModelTypes.has(type);

        return (
          <div key={type} className="d-flex align-items-center gap-2 mb-2">
            <ColorSwatch color={color} />
            <Form.Check
              type="checkbox"
              id={`model-type-filter-${type}`}
              className="mb-0 flex-grow-1"
              label={
                <span className="d-flex align-items-center gap-2">
                  <span>{getLabelForModelType(type) ?? type}</span>
                </span>
              }
              checked={isVisible}
              onChange={() => toggleModelTypeVisibility(type)}
            />
          </div>
        );
      })}
    </div>
  );
}
