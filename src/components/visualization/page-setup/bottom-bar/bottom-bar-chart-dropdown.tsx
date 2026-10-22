import { use, useEffect, useRef, useState } from 'react';
import { BottomBarChartView, BottomBarContext } from './bottom-bar-context';

function getChartViewLabel(chartView: BottomBarChartView): string {
  switch (chartView) {
    case 'commit-chart':
      return 'Commit Chart';
    case 'runtime-chart':
      return 'Runtime Chart';
    case 'runtime-metrics':
      return 'Runtime Metrics';
    case 'social-metrics':
      return 'Social Metrics';
  }
}

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

  const bottomBarContext = use(BottomBarContext);

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

  const selectableCharts: BottomBarChartView[] = [
    'commit-chart',
    'runtime-chart',
    ...(bottomBarContext.selectedMetric ? (['runtime-metrics'] as const) : []),
    'social-metrics',
  ];

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
        {getChartViewLabel(selectedView) ?? selectedView}
      </button>
      <div
        className={`dropdown-menu bottom-bar-chart-dropdown-menu${
          isOpen ? ' show' : ''
        }`}
      >
        {selectableCharts.map((chart) => (
          <button
            key={chart}
            type="button"
            className={`dropdown-item${
              chart === selectedView ? ' active' : ''
            }`}
            onClick={() => handleSelect(chart)}
          >
            {getChartViewLabel(chart) ?? chart}
          </button>
        ))}
      </div>
    </div>
  );
}
