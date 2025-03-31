import React from 'react';

export default function WideCheckbox({
  value,
  onToggle,
}: {
  value: any;
  onToggle: (value: any) => void;
}) {
  return (
    <label className="wide-checkbox-container">
      <input
        type="checkbox"
        checked={value}
        onChange={() => onToggle(!value)}
      />
      <span className="wide-checkbox"></span>
    </label>
  );
}
