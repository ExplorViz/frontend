import React from 'react';
import { useSelect } from 'downshift';
import { Metric } from 'react-lib/src/utils/metric-schemes/metric-data';
import HelpTooltip from 'react-lib/src/components/help-tooltip.tsx';
import { useHeatmapConfigurationStore } from 'react-lib/src/stores/heatmap/heatmap-configuration';

interface Args {
  selectMetric(metric: Metric): void;
}

export default function MetricSelector() {
  const {
    isOpen,
    getToggleButtonProps,
    getMenuProps,
    getItemProps,
    highlightedIndex
  } = useSelect({
    items: useHeatmapConfigurationStore.getState().getLatestClazzMetricScores(),
    itemToString: (item) => (item ? item.name : ''),
    selectedItem: useHeatmapConfigurationStore.getState().getSelectedMetric(),
    onSelectedItemChange: ({ selectedItem }) => {
        useHeatmapConfigurationStore.getState().updateMetric(selectedItem);
    }
  });

  // TODO: TEST!!! Not tested yet, since at this time heatmap not available.
  //        CSS stuff is just placeholder. Adjust while testing.
  return (
    <div className="relative inline-block w-64">
        <button
            {...getToggleButtonProps()}
            className="metric-selector w-full px-4 py-2 text-left border rounded"
        >
            {useHeatmapConfigurationStore.getState().selectedMetricName}
        </button>
        <ul
            {...getMenuProps()}
            className={`absolute z-10 w-full mt-1 border rounded bg-white shadow-lg ${
                isOpen ? '' : 'hidden'
            }`}
        >
            {isOpen && useHeatmapConfigurationStore.getState().getLatestClazzMetricScores().map((metric, index) => (
                <li
                    key={metric.name}
                    {...getItemProps({ item: metric, index })}
                    className={`px-4 py-2 cursor-pointer flex justify-between items-center ${
                        highlightedIndex === index ? 'bg-gray-200' : ''
                    }`}
                >
                    <span>{metric.name}</span>
                    <HelpTooltip title={metric.description} />
                </li>
            ))}
        </ul>
    </div>
  );

//   return (
//     <Downshift
//         itemToString={item => (item ? item.title : '')}
//     >
//         {}
//     </Downshift>
    
//     <PowerSelect
//         @options={{this.metricNames}}
//         @triggerClass='metric-selector'
//         @selected={{this.heatmapConfiguration.selectedMetric}}
//         @onChange={{@selectMetric}}
//         @placeholder='Select metric...'
//         @searchEnabled={{false}}
//         @matchTriggerWidth={{false}}
//         as |metric|
//         >
//         {{metric.name}}
//         <div
//             {{react
//             this.helpTooltipComponent
//             title=metric.description
//             placement='right'
//             }}
//         />
//     </PowerSelect>
//   )
}
