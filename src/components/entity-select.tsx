import React, { useState } from 'react';
import Select, { FormatOptionLabelMeta, SelectInstance } from 'react-select';
import { useModelStore } from '../stores/repos/model-repository';
import {
  Building,
  City,
  District,
} from '../utils/landscape-schemes/flat-landscape';

type Entity = City | District | Building;

interface EntitySelectProps {
  /**
   * When using within a form, the entity's identifier will be reported under this name.
   * If no value is provided, then no value will be reported on form submission.
   */
  name?: string;

  /**
   * Value of the select; setting this prop makes the select a controlled component.
   * Set to null if no entity should be selected.
   */
  value?: Entity | null;

  /** Whether to exclude cities from the selectable options */
  excludeCities?: boolean;

  /** Whether to exclude districts from the selectable options */
  excludeDistricts?: boolean;

  /** Whether to exclude buildings from the selectable options */
  excludeBuildings?: boolean;

  /**
   * Function that selects the entity's property to report as value when using within a form.
   * Any entity for which this property is undefined will be filtered out of the options list.
   * By default, the entity's id is used.
   */
  getFormValue?(entity: Entity): string | undefined;

  /** Callback that is fired whenever a new entity is selected */
  onChange?(entity: Entity | null): void;

  /** Ref that allows referencing the underlying react-select component */
  ref?: React.Ref<SelectInstance<Entity>>;
}

/**
 * A searchable select component that allows selecting a single entity from the current visualization.
 * Can be used within a form to report a property of the selected entity as a value (e.g. the entity ID).
 */
export default function EntitySelect({
  name,
  value = null,
  excludeCities = false,
  excludeDistricts = false,
  excludeBuildings = false,
  getFormValue = (e) => e.id,
  onChange,
  ref,
}: EntitySelectProps) {
  const buildings = useModelStore((state) => state.buildings);
  const districts = useModelStore((state) => state.districts);
  const cities = useModelStore((state) => state.cities);

  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);

  let options: Entity[] = [
    ...(excludeCities ? [] : Object.values(cities)),
    ...(excludeDistricts ? [] : Object.values(districts)),
    ...(excludeBuildings ? [] : Object.values(buildings)),
  ];

  // Only display entities where the reported value is actually present
  options = options.filter((e) => getFormValue(e) !== undefined);

  const formatOptionLabel = (
    entity: Entity | null,
    { inputValue }: FormatOptionLabelMeta<Entity>
  ) => {
    if (!entity) {
      return <></>;
    }

    const label = entity.fqn ?? entity.name;

    let withHighlights: React.JSX.Element;

    if (!inputValue) {
      withHighlights = <>{label}</>;
    } else {
      // Highlight all occurrences of the search string in the suggested options
      const parts = label.split(new RegExp(`(${inputValue})`, 'gi'));
      withHighlights = (
        <>
          {parts.map((part, index) =>
            part.toLowerCase() === inputValue.toLowerCase() ? (
              <strong key={index}>{part}</strong>
            ) : (
              part
            )
          )}
        </>
      );
    }

    return (
      <small>
        <samp>{withHighlights}</samp>
      </small>
    );
  };

  const handleChange = (value: Entity | null) => {
    setSelectedEntity(value);
    onChange?.(value);
  };

  return (
    <Select
      name={name}
      value={value ?? selectedEntity}
      options={options}
      placeholder={'Select or type to search'}
      ref={ref}
      getOptionLabel={(e) => e.fqn ?? e.id}
      getOptionValue={(e) => getFormValue(e)!}
      formatOptionLabel={formatOptionLabel}
      onChange={handleChange}
      isSearchable
      isClearable
    />
  );
}
