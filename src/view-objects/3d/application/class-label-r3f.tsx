import { Text } from '@react-three/drei';
import { useEvolutionDataRepositoryStore } from 'explorviz-frontend/src/stores/repos/evolution-data-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import {
  Application,
  Class,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import {
  MetricKey,
  metricMappingMultipliers,
} from 'explorviz-frontend/src/utils/settings/default-settings';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import { useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

export default function ClassLabelR3F({
  dataModel,
  layout,
  application,
}: {
  dataModel: Class;
  layout: BoxLayout;
  application: Application;
}) {
  const {
    isClassHovered,
    isParentHovered,
    isClassHighlighted,
    isParentHighlighted,
    isClassVisible,
  } = useVisualizationStore(
    useShallow((state) => ({
      isClassHovered: state.hoveredEntity === dataModel.id,
      isClassVisible: state.classData[dataModel.id]
        ? state.classData[dataModel.id].isVisible
        : true,
      isParentHovered: state.hoveredEntity === dataModel.parent.id,
      isClassHighlighted: state.highlightedEntityIds.includes(dataModel.id),
      isParentHighlighted: state.highlightedEntityIds.includes(
        dataModel.parent.id
      ),
    }))
  );

  const labelRef = useRef(null);

  const getMetricForClass = useEvolutionDataRepositoryStore(
    (state) => state.getMetricForClass
  );

  const { evoConfig } = useVisibilityServiceStore(
    useShallow((state) => ({
      evoConfig: state._evolutionModeRenderingConfiguration,
    }))
  );

  const {
    classFootprint,
    classHeightMultiplier,
    classLabelFontSize,
    classLabelLength,
    classTextColor,
    heightMetric,
    labelOffset,
    labelRotation,
    showAllClassLabels,
  } = useUserSettingsStore(
    useShallow((state) => ({
      classFootprint: state.visualizationSettings.classFootprint.value,
      classHeightMultiplier:
        state.visualizationSettings.classHeightMultiplier.value,
      classLabelFontSize: state.visualizationSettings.classLabelFontSize.value,
      classLabelLength: state.visualizationSettings.classLabelLength.value,
      classTextColor: state.visualizationSettings.classTextColor.value,
      heightMetric: state.visualizationSettings.classHeightMetric.value,
      labelOffset: state.visualizationSettings.labelOffset.value,
      labelRotation: state.visualizationSettings.classLabelOrientation.value,
      showAllClassLabels: state.visualizationSettings.showAllClassLabels.value,
    }))
  );

  const getClassHeight = () => {
    return (
      classFootprint +
      metricMappingMultipliers[heightMetric as MetricKey] *
        classHeightMultiplier *
        getMetricForClass(
          dataModel,
          application.name,
          heightMetric,
          evoConfig.renderOnlyDifferences
        )
    );
  };

  const getPositionY = () => {
    return layout.positionY + getClassHeight() + labelOffset;
  };

  return showAllClassLabels ||
    isClassHovered ||
    isParentHovered ||
    isClassHighlighted ||
    isParentHighlighted ? (
    <Text
      key={dataModel.id + '-label'}
      position={[layout.positionX, getPositionY(), layout.positionZ]}
      color={classTextColor}
      visible={isClassVisible}
      ref={labelRef}
      // outlineColor={'black'}
      // outlineWidth={classLabelFontSize * 0.05}
      rotation={[1.5 * Math.PI, 0, labelRotation]}
      fontSize={classLabelFontSize * Math.min(layout.width, layout.depth) * 0.5}
      raycast={() => null}
    >
      {dataModel.name.length <= classLabelLength
        ? dataModel.name
        : dataModel.name.substring(0, classLabelLength) + '...'}
    </Text>
  ) : null;
}
