import { useImperativeHandle, useMemo, useState } from 'react';

import { highlightById } from 'explorviz-frontend/src/utils/city-rendering/highlighting';
import getPossibleEntityNames from 'explorviz-frontend/src/utils/search-logic';
import { pingByModelId } from 'explorviz-frontend/src/view-objects/3d/city/animated-ping-r3f';
import Button from 'react-bootstrap/Button';
import Select, { MultiValue, MultiValueGenericProps } from 'react-select';

interface EntitySearchEntry {
  modelId: string;
  fqn: string;
}

const EntitySearch = function EntitySearch({ ref, ..._ }) {
  const [searchString, setSearchString] = useState<string>('');
  const [selected, setSelected] = useState<any[]>([]);
  const [entityNames, setEntityNames] = useState<any[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const formatEntry = (selectOption: EntitySearchEntry) => {
    const fqnStr = selectOption?.fqn;

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
    newSelectedOptions: MultiValue<EntitySearchEntry>
  ) => {
    const newlySelectedItems = newSelectedOptions.filter(
      (newItem: EntitySearchEntry) =>
        !selected.some(
          (existingItem) =>
            existingItem.fqn === newItem.fqn
        )
    );

    // Ping all newly selected items
    newlySelectedItems.forEach((item: EntitySearchEntry) => {
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

  const optionLookup = useMemo(
    () =>
      new Map(
        entityNames.map((entry: EntitySearchEntry) => [
          entry.modelId,
          entry,
        ])
      ),
    [entityNames]
  );

  useImperativeHandle(ref, () => ({
    search: ({ query, selectAll }: {query: string, selectAll: boolean}) => {
      setSearchString(query);
      const names = isBlank(query) ? [] : getPossibleEntityNames(query);
      setEntityNames(names);
      setMenuOpen(!selectAll);
      if (selectAll) {
        const newlySelectedItems = names.filter(
          (newItem) =>
            !selected.some(
              (existingItem: EntitySearchEntry) =>
                existingItem.fqn === newItem.fqn
            )
        );
        newlySelectedItems.forEach((item) => pingByModelId(item.modelId));
        setSelected(names);
      }
    },
    selectEntities: (ids: string[]) => {
      const matches =
        optionLookup.size > 0
          ? (ids
              .map((id) => optionLookup.get(id))
              .filter(Boolean) as EntitySearchEntry[])
          : [];
      const newlySelectedItems = matches.filter(
        (item) =>
          !selected.some(
            (existingItem: EntitySearchEntry) =>
              existingItem.fqn === item.fqn
          )
      );
      newlySelectedItems.forEach((item) => pingByModelId(item.modelId));
      if (matches.length > 0) {
        setSelected(matches);
      }
    },
    reset: () => {
      setSearchString('');
      setEntityNames([]);
      setSelected([]);
      setMenuOpen(false);
    },
  }));

  return (
    <>
      <Select
        isMulti
        isSearchable
        inputValue={searchString}
        value={selected}
        options={entityNames}
        getOptionLabel={(entity: EntitySearchEntry) => entity.fqn}
        getOptionValue={(entity: EntitySearchEntry) => entity.modelId}
        formatOptionLabel={formatEntry}
        onChange={onChange}
        onInputChange={onInputChange}
        onMenuOpen={() => setMenuOpen(true)}
        onMenuClose={() => setMenuOpen(false)}
        menuIsOpen={menuOpen}
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
};

// Show selected options as clickable links
function CustomMultiValueLabel(
  props: MultiValueGenericProps<EntitySearchEntry>
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

export default EntitySearch;
