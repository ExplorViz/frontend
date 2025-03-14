import React, { useState } from 'react';

import Select, { MultiValueGenericProps } from 'react-select';
import Button from 'react-bootstrap/Button';
import { useApplicationRepositoryStore } from 'react-lib/src/stores/repos/application-repository';
import { useLocalUserStore } from 'react-lib/src/stores/collaboration/local-user';
import { useHighlightingStore } from 'react-lib/src/stores/highlighting';

interface ApplicationSearchProps {}

export default function ApplicationSearch({}: ApplicationSearchProps) {
  // useApplicationRepositoryStore((state) => state.applications); // For reactivity on application change
  // const pingByModelId = useLocalUserStore((state) => state.pingByModelId); // TODO finish tmp first
  // const highlightById = useHighlightingStore((state) => state.highlightById);

  const [searchString, setSearchString] = useState<string>('');
  const [selected, setSelected] = useState<any[]>([]);

  const entityNames = getAllPossibleEntityNames();

  const formatEntry = (entity: any) => {
    const fqnStr = entity?.fqn as string;

    if (!searchString) return fqnStr;

    // Highlight all occurences of the search string in the select options
    const parts = fqnStr.split(new RegExp(`(${searchString})`, 'gi'));

    return parts.map((part, index) =>
      part === searchString ? <strong key={index}>{part}</strong> : part
    );
  };

  const onSelect = (newSelectedOptions: any[]) => {
    // Handle case that entry was removed (user selected already selected class again)
    if (
      selected.length > newSelectedOptions.length ||
      newSelectedOptions.length < 1
    ) {
      return;
    }

    const newlySelectedItems = newSelectedOptions.filter(
      (newItem) =>
        !selected.some((existingItem) => existingItem.fqn === newItem.fqn)
    );

    setSelected([...newSelectedOptions]);

    newlySelectedItems.forEach((item) => {
      // TODO replace with hook use
      useLocalUserStore
        .getState()
        .pingByModelId(item.modelId, item.applicationModelId, {
          durationInMs: 3500,
          nonrestartable: true,
        });
    });
  };

  const highlightAllSelectedEntities = () => {
    selected.forEach((selectedEntity) => {
      useHighlightingStore // TODO replace with hook use
        .getState()
        .highlightById(selectedEntity.modelId, undefined, true);
    });
  };

  const pingAllSelectedEntities = () => {
    selected.forEach((selectedEntity) => {
      // TODO replace with hook use
      useLocalUserStore
        .getState()
        .pingByModelId(
          selectedEntity.modelId,
          selectedEntity.applicationModelId,
          { durationInMs: 3500, nonrestartable: true }
        );
    });
  };

  return (
    <>
      <Select
        isMulti
        isSearchable
        options={entityNames}
        formatOptionLabel={formatEntry}
        components={{ MultiValueLabel: CustomMultiValueLabel }}
        onChange={(newValue) => onSelect(Array.from(newValue))}
        onInputChange={(newValue) => setSearchString(newValue)}
        getOptionValue={(option) => option.fqn}
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

function getAllPossibleEntityNames() {
  let allEntities: Map<string, any> = new Map();

  const applications = useApplicationRepositoryStore.getState().getAll();

  for (const application of applications) {
    allEntities = new Map([
      ...allEntities,
      ...application.flatData.packageNameModelMap,
      ...application.flatData.hashCodeClassMap,
    ]);
  }

  const returnValue: any[] = [];
  const returnValueIncludedModelIds: any[] = [];

  const entriesArray = Array.from(allEntities.entries());

  for (let i = 0; i < entriesArray.length; i++) {
    const [, value] = entriesArray[i];

    if (returnValue.length === 10) {
      break;
    }

    if (!returnValueIncludedModelIds.includes(value.modelId)) {
      returnValueIncludedModelIds.push(value.modelId);
      returnValue.push(value);
    }
  }

  return returnValue;
}

// Show selected options as clickable links
function CustomMultiValueLabel(props: MultiValueGenericProps) {
  const { data, innerProps } = props;
  const onClick = () => {
    // TODO replace with hook use
    useLocalUserStore
      .getState()
      .pingByModelId(data.modelId, data.applicationModelId, {
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
