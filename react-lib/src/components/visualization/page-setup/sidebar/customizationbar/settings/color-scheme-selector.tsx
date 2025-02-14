import React, { useState, useRef, useEffect } from 'react';
import { ColorSchemeId } from 'react-lib/src/utils/settings/color-schemes';

export default function ColorSchemeSelector({
  colorSchemes,
  applyColorScheme,
}: ColorSchemeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef: React.MutableRefObject<any> = useRef(null);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleApplyColorScheme = (colorSchemeId: string) => {
    applyColorScheme(colorSchemeId);
    setIsOpen(false); // Close the dropdown after selection
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
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
        Color Presets
      </button>

      <div
        className={`dropdown-menu dropdown-menu-right ${isOpen ? 'show' : ''}`}
        aria-labelledby="dropdownMenuButton"
      >
        {colorSchemes.map((colorScheme) => (
          <div
            key={colorScheme.id}
            className="dropdown-item pointer-cursor"
            onClick={() => handleApplyColorScheme(colorScheme.id)}
          >
            {colorScheme.name}
          </div>
        ))}
      </div>
    </div>
  );
}

type ColorSchemeProps = {
  colorSchemes: { name: string; id: ColorSchemeId }[];
  applyColorScheme: (colorSchemeId: string) => void;
};
