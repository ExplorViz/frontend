import { Text } from '@react-three/drei';
import { ThreeElements } from '@react-three/fiber';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { useHighlightingStore } from 'explorviz-frontend/src/stores/highlighting';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { Class } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

export default function ClassR3F({
  dataModel,
  layout,
}: {
  dataModel: Class;
  layout: BoxLayout;
}) {
  const { isHighlighted, isHovered, isVisible, updateClassState } =
    useVisualizationStore(
      useShallow((state) => ({
        isHighlighted: state.classData[dataModel.id].isHighlighted,
        isHovered: state.classData[dataModel.id].isHovered,
        isVisible: state.classData[dataModel.id].isVisible,
        updateClassState: state.actions.updateClassState,
      }))
    );

  const highlightingActions = useHighlightingStore(
    useShallow((state) => ({
      toggleHighlight: state.toggleHighlight,
      updateHighlightingOnHover: state.updateHighlightingOnHover,
    }))
  );

  const { classColor, classTextColor, highlightedEntityColor } =
    useUserSettingsStore(
      useShallow((state) => ({
        classColor: state.colors?.clazzColor,
        classTextColor: state.colors?.clazzTextColor,
        highlightedEntityColor: state.colors?.highlightedEntityColor,
      }))
    );

  const constructorArgs = useMemo<ThreeElements['clazzMesh']['args'][0]>(() => {
    return {
      clazz: dataModel,
    };
  }, []);

  const handleOnPointerOver = (event: any) => {
    event.stopPropagation();
    updateClassState(dataModel.id, { isHovered: true });
  };

  const handleOnPointerOut = (event: any) => {
    event.stopPropagation();
    updateClassState(dataModel.id, { isHovered: false });
  };

  const handleClick = (/*event: any*/) => {
    updateClassState(dataModel.id, { isHighlighted: !isHighlighted });
    // highlightingActions.toggleHighlight(event.object, { sendMessage: true });
  };

  const handleDoubleClick = (/*event: any*/) => {};

  const [handleClickWithPrevent, handleDoubleClickWithPrevent] =
    useClickPreventionOnDoubleClick(handleClick, handleDoubleClick);

  return (
    <clazzMesh
      position={layout.position}
      defaultColor={classColor}
      highlightingColor={highlightedEntityColor}
      layout={layout}
      visible={isVisible}
      isHovered={isHovered}
      highlighted={isHighlighted}
      onClick={handleClickWithPrevent}
      onDoubleClick={handleDoubleClickWithPrevent}
      onPointerOver={handleOnPointerOver}
      onPointerOut={handleOnPointerOut}
      args={[constructorArgs]}
    >
      <Text
        color={classTextColor}
        outlineColor={'black'}
        outlineWidth={0.0001}
        position={[0, 0.51, 0]}
        rotation={[1.5 * Math.PI, 0, 0.55]}
        fontSize={1.2}
        raycast={() => null}
      >
        {dataModel.name}
      </Text>
    </clazzMesh>
  );
}
