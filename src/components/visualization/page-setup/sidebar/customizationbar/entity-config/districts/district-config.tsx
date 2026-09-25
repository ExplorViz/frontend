import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import {
  getLabelForModelType,
  sortModelTypes,
} from 'explorviz-frontend/src/utils/model-type-utils';
import DistrictModelConfig from './district-model-config';

export default function DistrictConfig() {
  const districts = useModelStore((state) => state.districts);

  const districtTypesInLandscape = sortModelTypes(
    Array.from(
      new Set(
        Object.values(districts)
          .map((m) => m.type)
          .filter((t) => !!t)
      )
    )
  );

  return (
    <div className="building-config">
      {districtTypesInLandscape.length > 0 ? (
        <section>
          <h6 className="fw-bold">Model types</h6>
          <p className="small mb-2">
            Set the color and geometry for districts from different analysis
            types. Model types of districts found in the current landscape are
            shown by default.
          </p>

          <DistrictModelConfig
            overrideGroupKey="modelType"
            values={districtTypesInLandscape}
            formatValueLabel={getLabelForModelType}
          />
        </section>
      ) : (
        'No configuration options available'
      )}
    </div>
  );
}
