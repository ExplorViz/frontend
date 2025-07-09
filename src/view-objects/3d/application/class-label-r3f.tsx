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
  const { hoveredEntity } = useVisualizationStore(
    useShallow((state) => ({
      hoveredEntity: state.hoveredEntity,
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

  const { isVisible } = useVisualizationStore(
    useShallow((state) => ({
      isVisible: state.classData[dataModel.id]
        ? state.classData[dataModel.id].isVisible
        : true,
    }))
  );

  return showAllClassLabels ||
    hoveredEntity == dataModel.id ||
    hoveredEntity == dataModel.parent.id ? (
    <Text
      key={dataModel.id + '-label'}
      position={[
        layout.positionX,
        layout.positionY + layout.height / 2 + labelOffset,
        layout.positionZ,
      ]}
      color={classTextColor}
      visible={isVisible}
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
