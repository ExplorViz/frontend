import React, { useRef, useEffect } from 'react';
import Select, { MenuPlacement } from 'react-select';

interface PageSizeSelectorArgs {
  label: string | undefined;
  pageSizes: number[];
  size: number;
  position: 'below' | 'above' | 'auto' | 'top' | 'bottom';
  changePageSize(size: number): void;
}

export default function PageSizeSelector({
  label,
  pageSizes,
  size,
  position,
  changePageSize,
}: PageSizeSelectorArgs) {
  const menuPlacement = useRef<MenuPlacement>('auto');

  useEffect(() => {
    if (position === 'above') {
      menuPlacement.current = 'top';
    } else if (position === 'below') {
      menuPlacement.current = 'bottom';
    } else if (
      position === 'top' ||
      position === 'bottom' ||
      position === 'auto'
    ) {
      menuPlacement.current = position;
    }
  }, []);

  return (
    <div className="d-flex flex-row">
      {label && <div className="mr-2 align-self-center">{label}</div>}
      <div className="page-size-select">
        <Select
          menuPlacement={menuPlacement.current}
          isSearchable={false}
          options={pageSizes}
          value={size}
          onChange={(newValue) => changePageSize(newValue!)}
        />
      </div>
    </div>
  );
}
