import { Text } from '@react-three/drei';
import { ThreeElements, ThreeEvent } from '@react-three/fiber';
import { usePointerStop } from 'explorviz-frontend/src/hooks/pointer-stop';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { Class } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import ClazzMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-mesh';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import { useEffect } from 'react';
import { useMemo, useRef } from 'react';
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
        isHighlighted: state.classData[dataModel.id]?.isHighlighted,
        isHovered: state.classData[dataModel.id]?.isHovered,
        isVisible: state.classData[dataModel.id]?.isVisible,
        updateClassState: state.actions.updateClassState,
      }))
    );

  const meshRef = useRef<ClazzMesh | null>(null);

  const { addPopup } = usePopupHandlerStore(
    useShallow((state) => ({
      addPopup: state.addPopup,
    }))
  );

  const handlePointerStop = (event: ThreeEvent<PointerEvent>) => {
    addPopup({
      mesh: meshRef.current,
      position: {
        x: event.clientX,
        y: event.clientY,
      },
    });
  };

  const pointerStopHandlers = usePointerStop(handlePointerStop);

  const {
    classColor,
    classTextColor,
    highlightedEntityColor,
    labelOffset,
    labelRotation,
    maxLabelLength,
  } = useUserSettingsStore(
    useShallow((state) => ({
      classColor: state.colors?.classColor,
      classTextColor: state.colors?.classTextColor,
      highlightedEntityColor: state.colors?.highlightedEntityColor,
      maxLabelLength: state.visualizationSettings.classLabelLength.value,
      labelRotation: state.visualizationSettings.classLabelOrientation.value,
      labelOffset: state.visualizationSettings.classLabelOffset.value,
    }))
  );

  // TODO: Why is this necessary?
  useEffect(() => {
    if (meshRef.current && classColor && highlightedEntityColor) {
      meshRef.current.defaultColor = classColor;
      meshRef.current.highlightingColor = highlightedEntityColor;
    }
  }, [classColor, highlightedEntityColor]);

  const constructorArgs = useMemo<ThreeElements['clazzMesh']['args'][0]>(() => {
    return {
      dataModel: dataModel,
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
      ref={meshRef}
      {...pointerStopHandlers}
      args={[constructorArgs]}
    >
      <Text
        color={classTextColor}
        outlineColor={'black'}
        outlineWidth={0.0001}
        position={[0, 0.5 + labelOffset, 0]}
        rotation={[1.5 * Math.PI, 0, labelRotation]}
        fontSize={1.2}
        raycast={() => null}
      >
        {dataModel.name.length <= maxLabelLength
          ? dataModel.name
          : dataModel.name.substring(0, maxLabelLength) + '...'}
      </Text>
    </clazzMesh>
  );
}
