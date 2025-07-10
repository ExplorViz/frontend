import { Text } from '@react-three/drei';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { Class } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import { useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

export default function ClassLabelR3F({
  dataModel,
  layout,
}: {
  dataModel: Class;
  layout: BoxLayout;
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

  const {
    classLabelFontSize,
    classLabelLength,
    classTextColor,
    labelOffset,
    labelRotation,
    showAllClassLabels,
  } = useUserSettingsStore(
    useShallow((state) => ({
      classLabelFontSize: state.visualizationSettings.classLabelFontSize.value,
      classLabelLength: state.visualizationSettings.classLabelLength.value,
      classTextColor: state.visualizationSettings.classTextColor.value,
      labelOffset: state.visualizationSettings.classLabelOffset.value,
      labelRotation: state.visualizationSettings.classLabelOrientation.value,
      maxLabelLength: state.visualizationSettings.classLabelLength.value,
      showAllClassLabels: state.visualizationSettings.showAllClassLabels.value,
    }))
  );

  return showAllClassLabels ||
    isClassHovered ||
    isParentHovered ||
    isClassHighlighted ||
    isParentHighlighted ? (
    <Text
      key={dataModel.id + '-label'}
      position={[
        layout.positionX,
        layout.positionY + layout.height / 2 + labelOffset,
        layout.positionZ,
      ]}
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
