import { useState } from 'react';

import { useApplicationRepositoryStore } from 'explorviz-frontend/src/stores/repos/application-repository';
import { highlightById } from 'explorviz-frontend/src/utils/application-rendering/highlighting';
import getPossibleEntityNames from 'explorviz-frontend/src/utils/application-search-logic';
import { pingByModelId } from 'explorviz-frontend/src/view-objects/3d/application/animated-ping-r3f';
import Button from 'react-bootstrap/Button';
import Select, { MultiValue, MultiValueGenericProps } from 'react-select';

interface ApplicationSearchEntity {
  fqn: string;
  applicationName: string;
  modelId: string;
  applicationModelId: string;
  type: string;
}

export default function ApplicationSearch() {
  useApplicationRepositoryStore((state) => state.applications);

  const [searchString, setSearchString] = useState<string>('');
  const [selected, setSelected] = useState<any[]>([]);
  const [entityNames, setEntityNames] = useState<any[]>([]);

  const formatEntry = (selectOption: ApplicationSearchEntity) => {
    const fqnStr = selectOption.fqn;

    if (!searchString) {
      return fqnStr;
    }

    // Highlight all occurrences of the search string in the suggested options
    const parts = fqnStr.split(new RegExp(`(${searchString})`, 'gi'));

    return parts.map((part, index) =>
      part === searchString ? <strong key={index}>{part}</strong> : part
    );
  };

  const onChange = (
    newSelectedOptions: MultiValue<ApplicationSearchEntity>
  ) => {
    const newlySelectedItems = newSelectedOptions.filter(
      (newItem) =>
        !selected.some(
          (existingItem) =>
            existingItem.applicationName === newItem.applicationName &&
            existingItem.fqn === newItem.fqn
        )
    );

    // Ping all newly selected items
    newlySelectedItems.forEach((item) => {
      pingByModelId(item.modelId);
    });

    setSelected(Array.from(newSelectedOptions));
  };

  const highlightAllSelectedEntities = () => {
    selected.forEach((selectedEntity) => {
      highlightById(selectedEntity.modelId);
    });
  };

  const pingAllSelectedEntities = () => {
    selected.forEach((selectedEntity) => {
      pingByModelId(selectedEntity.modelId);
    });
  };

  const onInputChange = (newValue: string) => {
    setSearchString(newValue);
    setEntityNames(isBlank(newValue) ? [] : getPossibleEntityNames(newValue));
  };

  return (
    <>
      <Select
        isMulti
        isSearchable
        options={entityNames}
        getOptionLabel={(entity) => entity.fqn}
        getOptionValue={(entity) => entity.applicationName + '-' + entity.fqn}
        formatOptionLabel={formatEntry}
        onChange={onChange}
        onInputChange={onInputChange}
        components={{ MultiValueLabel: CustomMultiValueLabel }}
        hideSelectedOptions={false}
      />
      <div className="mt-3 col text-center">
        <Button
          variant="outline-secondary"
          onClick={highlightAllSelectedEntities}
        >
          Hightlight All
        </Button>
        <Button
          className="mx-2"
          variant="outline-secondary"
          onClick={pingAllSelectedEntities}
        >
          Ping All
        </Button>
      </div>
    </>
  );
}

// Show selected options as clickable links
function CustomMultiValueLabel(
  props: MultiValueGenericProps<ApplicationSearchEntity>
) {
  const { data, innerProps } = props;
  const onClick = () => {
    pingByModelId(data.modelId);
  };

  return (
    <div
      {...innerProps}
      onClick={onClick}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <a href="#" style={{ padding: '0px 4px 0px 8px' }}>
        {data.className ?? data.fqn ?? ''}
      </a>
    </div>
  );
}

function isBlank(testString: string) {
  return /^\s*$/.test(testString);
}
