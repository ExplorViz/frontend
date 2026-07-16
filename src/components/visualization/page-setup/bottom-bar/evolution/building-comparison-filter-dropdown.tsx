import { useEffect, useRef, useState } from 'react';

import {
  BUILDING_COMPARISON_CATEGORIES,
  BuildingComparisonVisibility,
  isBuildingComparisonFilterActive,
  setBuildingComparisonVisibility,
} from 'explorviz-frontend/src/utils/city-rendering/building-comparison-visibility';
import { CommitComparison } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import Form from 'react-bootstrap/Form';

interface BuildingComparisonFilterDropdownProps {
  readonly visibility: BuildingComparisonVisibility;
  readonly disabled: boolean;
  readonly onVisibilityChange: (
    visibility: BuildingComparisonVisibility
  ) => void;
}

export default function BuildingComparisonFilterDropdown({
  visibility,
  disabled,
  onVisibilityChange,
}: BuildingComparisonFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isFilterActive = isBuildingComparisonFilterActive(visibility);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  useEffect(() => {
    const handleClickOutside = ({ target }: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target as HTMLElement)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleCategory = (
    comparison: CommitComparison,
    checked: boolean
  ): void => {
    onVisibilityChange(
      setBuildingComparisonVisibility(visibility, comparison, checked)
    );
  };

  return (
    <div
      ref={dropdownRef}
      className="commit-tree-building-filter-dropdown dropdown"
    >
      <button
        type="button"
        className={`btn btn-outline-secondary btn-sm dropdown-toggle commit-tree-building-filter-toggle${
          isFilterActive && !disabled
            ? ' commit-tree-building-filter-toggle--active'
            : ''
        }`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        disabled={disabled}
        title={
          disabled
            ? 'Select two commits to filter buildings by comparison category'
            : 'Show or hide buildings by comparison category'
        }
        onClick={() => {
          if (!disabled) {
            setIsOpen((open) => !open);
          }
        }}
      >
        Filter Buildings
      </button>
      <div
        className={`dropdown-menu commit-tree-building-filter-menu${
          isOpen && !disabled ? ' show' : ''
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        {BUILDING_COMPARISON_CATEGORIES.map(({ key, label }) => (
          <Form.Check
            key={key}
            type="checkbox"
            id={`commit-tree-building-filter-${key.toLowerCase()}`}
            className="commit-tree-building-filter-option dropdown-item"
            label={label}
            checked={visibility[key]}
            disabled={disabled}
            onChange={(event) => toggleCategory(key, event.target.checked)}
          />
        ))}
      </div>
    </div>
  );
}
