import React from 'react';

import Select from 'react-select';
import { useApplicationRepositoryStore } from 'react-lib/src/stores/repos/application-repository';

interface ApplicationSearchProps {}

export default function ApplicationSearch({}: ApplicationSearchProps) {
  const entityNames = getAllPossibleEntityNames();

  const formatOptionLabel = (option: any) => {
    return <a href="#">{option.className ?? option.fqn ?? ''}</a>;
  };

  return (
    <Select
      options={entityNames}
      formatOptionLabel={formatOptionLabel}
      isMulti
      isSearchable
      // components={{ MultiValueLabel: CustomMultiValueLabel }}
    />
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

// const CustomMultiValueLabel = ({ data, removeProps }: any) => <a>data.label</a>;
