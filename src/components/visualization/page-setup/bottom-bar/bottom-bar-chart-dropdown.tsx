import { useEffect, useRef, useState } from 'react';

export type BottomBarChartView =
  | 'commit-chart'
  | 'runtime-chart'
  | 'social-metrics';

const CHART_VIEWS: { id: BottomBarChartView; label: string }[] = [
  { id: 'commit-chart', label: 'Commit Chart' },
  { id: 'runtime-chart', label: 'Runtime Chart' },
  { id: 'social-metrics', label: 'Social Metrics' },
];

interface BottomBarChartDropdownProps {
  selectedView: BottomBarChartView;
  onSelectView: (view: BottomBarChartView) => void;
}

export default function BottomBarChartDropdown({
  selectedView,
  onSelectView,
}: BottomBarChartDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLabel =
    CHART_VIEWS.find((view) => view.id === selectedView)?.label ??
    'Commit Chart';

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

  const handleSelect = (view: BottomBarChartView) => {
    setIsOpen(false);
    if (view !== selectedView) {
      onSelectView(view);
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="bottom-bar-chart-dropdown dropdown"
      id="bottom-bar-chart-button-div"
    >
      <button
        type="button"
        className="btn dropdown-toggle bottom-bar-chart-button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        {selectedLabel}
      </button>
      <div
        className={`dropdown-menu bottom-bar-chart-dropdown-menu${
          isOpen ? ' show' : ''
        }`}
      >
        {CHART_VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            className={`dropdown-item${
              view.id === selectedView ? ' active' : ''
            }`}
            onClick={() => handleSelect(view.id)}
          >
            {view.label}
          </button>
        ))}
      </div>
    </div>
  );
}
