import React, { useState } from 'react';

import getPossibleEntityNames from 'explorviz-frontend/src/utils/application-search-logic';
import Select, { MultiValue, MultiValueGenericProps } from 'react-select';
import Button from 'react-bootstrap/Button';
import { useApplicationRepositoryStore } from 'explorviz-frontend/src/stores/repos/application-repository';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { useHighlightingStore } from 'explorviz-frontend/src/stores/highlighting';

interface ApplicationSearchEntity {
  fqn: string;
  applicationName: string;
  modelId: string;
  applicationModelId: string;
}

interface ApplicationSearchProps {}

export default function ApplicationSearch() {
  useApplicationRepositoryStore((state) => state.applications);
  const pingByModelId = useLocalUserStore((state) => state.pingByModelId);
  const highlightById = useHighlightingStore((state) => state.highlightById);

  const [searchString, setSearchString] = useState<string>('');
  const [selected, setSelected] = useState<any[]>([]);
  const [entityNames, setEntityNames] = useState<any[]>([]);

  const formatEntry = (selectOption: ApplicationSearchEntity) => {
    const fqnStr = selectOption.fqn;

    if (!searchString) {
      return fqnStr;
    }

    // Highlight all occurences of the search string in the suggested options
    const parts = fqnStr.split(new RegExp(`(${searchString})`, 'gi'));

    return parts.map((part, index) =>
      part === searchString ? <strong key={index}>{part}</strong> : part
    );
  };

  const onChange = (
    newSelectedOptions: MultiValue<ApplicationSearchEntity>
  ) => {
    // Highlight all newly selected items

    const newlySelectedItems = newSelectedOptions.filter(
      (newItem) =>
        !selected.some(
          (existingItem) =>
            existingItem.applicationName === newItem.applicationName &&
            existingItem.fqn === newItem.fqn
        )
    );

    newlySelectedItems.forEach((item) => {
      pingByModelId(item.modelId, item.applicationModelId, {
        durationInMs: 3500,
        nonrestartable: true,
      });
    });

    setSelected(Array.from(newSelectedOptions));
  };

  const highlightAllSelectedEntities = () => {
    selected.forEach((selectedEntity) => {
      highlightById(selectedEntity.modelId, true);
    });
  };

  const pingAllSelectedEntities = () => {
    selected.forEach((selectedEntity) => {
      pingByModelId(selectedEntity.modelId, selectedEntity.applicationModelId, {
        durationInMs: 3500,
        nonrestartable: true,
      });
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
        <Button variant="outline-secondary" onClick={pingAllSelectedEntities}>
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
  const pingByModelId = useLocalUserStore((state) => state.pingByModelId);

  const { data, innerProps } = props;
  const onClick = () => {
    pingByModelId(data.modelId, data.applicationModelId, {
      durationInMs: 3500,
      nonrestartable: true,
    });
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
