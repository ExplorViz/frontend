import { useEffect, useRef, useState } from 'react';

interface Item {
  id: string;
  name: string;
}

interface DropdownProps<T extends Item> {
  items: T[];
  selectedItem?: T;
  onSelect: (item: T) => void;
  fallbackLabel: string;
}

export function Dropdown<T extends Item>({
  items,
  selectedItem,
  onSelect,
  fallbackLabel,
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function handleSelect(item: T) {
    setIsOpen(false);
    if (item.id !== selectedItem?.id) {
      onSelect(item);
    }
  }

  // Close dropdown on outside click
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
  }, [dropdownRef]);

  return (
    <div id="colorPresets" className="dropdown" ref={dropdownRef}>
      <button
        className="btn btn-outline-dark dropdown-toggle autoMargin"
        type="button"
        onClick={toggleDropdown}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {selectedItem?.id || fallbackLabel}
      </button>
      <div
        className={`dropdown-menu dropdown-menu-right ${isOpen ? 'show' : ''}`}
        aria-labelledby="dropdownMenuButton"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="dropdown-item pointer-cursor"
            onClick={() => handleSelect(item)}
          >
            {item.id}
          </div>
        ))}
      </div>
    </div>
  );
}
