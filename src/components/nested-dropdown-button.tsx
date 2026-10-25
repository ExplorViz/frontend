import { ChevronRightIcon } from '@primer/octicons-react';
import { CSSProperties, useState } from 'react';
import { DropdownButton } from 'react-bootstrap';
import Dropdown from 'react-bootstrap/Dropdown';

export interface NestedDropdownOption {
  /**
   * Identifier for this option. Must be unique
   * among all selectable options in the dropdown.
   */
  id: string;

  /** Text to display for this option. */
  label: string;

  /** Sub-options to display when hovering this option. */
  children?: NestedDropdownOption[];
}

function findOptionById(
  options: NestedDropdownOption[],
  id: string
): NestedDropdownOption | undefined {
  for (const option of options) {
    if (option.id === id) {
      return option;
    }

    if (option.children) {
      const childrenResult = findOptionById(option.children, id);
      if (childrenResult) {
        return childrenResult;
      }
    }
  }
  return undefined;
}

interface NestedDropdownProps {
  /**
   * The options that can be selected from the dropdown.
   * @see {@link NestedDropdownOption}
   */
  options: NestedDropdownOption[];

  /**
   * The currently selected option. If set to null,
   * then the dropdown is explicitly set to unselected state.
   */
  selectedOptionId?: string | null;

  /** Text to show for the option representing the unselected state. */
  placeholder?: string;

  /**
   * Whether to allow the dropdown to be in unselected state.
   * If set to false, the first option is selected by default.
   */
  allowUnselected?: boolean;

  className?: string;
  style?: CSSProperties;

  /** Callback that is fired whenever the user selects a new option. */
  onSelect?(selectedOptionId: string | null): void;
}

/**
 * A dropdown button based on that from react-bootstrap, but where
 * each option can have sub-options that are revealed on hover.
 */
export default function NestedDropdownButton({
  options,
  selectedOptionId,
  placeholder,
  allowUnselected = true,
  className,
  style,
  onSelect,
}: NestedDropdownProps) {
  const [hovered, setHovered] = useState<string | null | undefined>(undefined);
  const [internalSelectedOption, setInternalSelectedOption] =
    useState<NestedDropdownOption | null>(allowUnselected ? null : options[0]);

  function handleSelect(option: NestedDropdownOption | null): void {
    setInternalSelectedOption(option);
    setHovered(null);
    onSelect?.(option?.id ?? null);
  }

  const providedOption =
    selectedOptionId !== undefined
      ? selectedOptionId !== null
        ? findOptionById(options, selectedOptionId)
        : null
      : undefined;

  const selectedOption = providedOption ?? internalSelectedOption;

  return (
    <DropdownButton
      title={selectedOption?.label ?? placeholder ?? 'Select an option'}
      className={className}
      style={style}
    >
      {allowUnselected && (
        <NestedDropdownItem
          option={null}
          onSelect={handleSelect}
          hoveredOptionId={hovered}
          placeholder={placeholder}
          onMouseEnter={() => setHovered(null)}
          onMouseLeave={() => setHovered(undefined)}
        />
      )}

      {options.map((option) => (
        <NestedDropdownItem
          key={option.id}
          option={option}
          hoveredOptionId={hovered}
          placeholder={placeholder}
          onSelect={handleSelect}
          onMouseEnter={() => setHovered(option.id)}
          onMouseLeave={() => setHovered(null)}
        />
      ))}
    </DropdownButton>
  );
}

interface NestedDropdownItemProps {
  option: NestedDropdownOption | null;
  hoveredOptionId: string | null | undefined;
  placeholder: string | undefined;
  onSelect(selectedOption: NestedDropdownOption | null): void;
  onMouseEnter(): void;
  onMouseLeave(): void;
}

function NestedDropdownItem({
  option,
  hoveredOptionId,
  placeholder = 'None',
  onSelect,
  onMouseEnter,
  onMouseLeave,
}: NestedDropdownItemProps) {
  return (
    <div
      className="position-relative"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Dropdown.Item as="button" onClick={() => onSelect(option)}>
        {option?.label ?? placeholder}
        {option?.children && (
          <span className="float-end">
            <ChevronRightIcon />
          </span>
        )}
      </Dropdown.Item>

      {option?.children && option?.id === hoveredOptionId && (
        <div
          className="position-absolute top-0 start-100"
          style={{
            background: 'var(--bs-dropdown-bg)',
            border:
              'var(--bs-dropdown-border-width) solid var(--bs-dropdown-border-color)',
            borderRadius: 'var(--bs-dropdown-border-radius)',
            boxShadow: 'var(--bs-dropdown-box-shadow)',
            padding: 'var(--bs-dropdown-padding-y) 0',
            zIndex: 1,
          }}
        >
          {option.children.map((child) => (
            <NestedDropdownItem
              key={child.id}
              option={child}
              hoveredOptionId={hoveredOptionId}
              placeholder={placeholder}
              onSelect={onSelect}
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
            />
          ))}
        </div>
      )}
    </div>
  );
}
