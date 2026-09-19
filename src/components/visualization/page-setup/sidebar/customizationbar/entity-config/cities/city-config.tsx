import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import {
  getLabelForModelType,
  sortModelTypes,
} from 'explorviz-frontend/src/utils/model-type-utils';
import CityModelConfig from './city-model-config';

export default function CityConfig() {
  const cities = useModelStore((state) => state.cities);

  const cityTypesInLandscape = sortModelTypes(
    Array.from(
      new Set(
        Object.values(cities)
          .map((m) => m.type)
          .filter((t) => !!t)
      )
    )
  );

  return (
    <div className="building-config">
      {cityTypesInLandscape.length > 0 ? (
        <section>
          <h6 className="fw-bold">Model types</h6>
          <p className="small mb-2">
            Set the color and geometry for cities from different analysis types.
            Model types of cities found in the current landscape are shown by
            default.
          </p>

          <CityModelConfig
            overrideGroupKey="modelType"
            values={cityTypesInLandscape}
            formatValueLabel={getLabelForModelType}
          />
        </section>
      ) : (
        'No configuration options available'
      )}
    </div>
  );
}
