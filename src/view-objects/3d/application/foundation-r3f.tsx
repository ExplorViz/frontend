import { Text } from '@react-three/drei';
import { ThreeElements, ThreeEvent } from '@react-three/fiber';
import { usePointerStop } from 'explorviz-frontend/src/hooks/pointer-stop';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { useHighlightingStore } from 'explorviz-frontend/src/stores/highlighting';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { openAllComponents } from 'explorviz-frontend/src/utils/application-rendering/entity-manipulation';
import { Application } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

export default function FoundationR3F({
  application,
  boxLayout,
}: {
  application: Application;
  boxLayout: BoxLayout;
}) {
  const { addPopup } = usePopupHandlerStore(
    useShallow((state) => ({
      addPopup: state.addPopup,
    }))
  );

  const handlePointerStop = (event: ThreeEvent<PointerEvent>) => {
    addPopup({
      model: application,
      position: {
        x: event.clientX,
        y: event.clientY,
      },
    });
  };

  const pointerStopHandlers = usePointerStop(handlePointerStop);

  const highlightingActions = useHighlightingStore(
    useShallow((state) => ({
      toggleHighlight: state.toggleHighlight,
      updateHighlightingOnHover: state.updateHighlightingOnHover,
    }))
  );

  const {
    appLabelMargin,
    foundationColor,
    foundationTextColor,
    highlightedEntityColor,
  } = useUserSettingsStore(
    useShallow((state) => ({
      appLabelMargin: state.visualizationSettings.appLabelMargin.value,
      foundationColor: state.visualizationSettings.foundationColor.value,
      highlightedEntityColor:
        state.visualizationSettings.highlightedEntityColor.value,
      foundationTextColor:
        state.visualizationSettings.foundationTextColor.value,
    }))
  );

  const constructorArgs = useMemo<
    ThreeElements['foundationMesh']['args'][0]
  >(() => {
    return {
      foundation: application,
    };
  }, []);

  const handleOnPointerOver = (event: any) => {
    event.stopPropagation();
    event.object.applyHoverEffect();
  };

  const handleOnPointerOut = (event: any) => {
    event.stopPropagation();
    event.object.resetHoverEffect();
  };

  const handleClick = (event: any) => {
    // TODO: Select active application for heatmap
    highlightingActions.toggleHighlight(event.object, { sendMessage: true });
  };

  const handleDoubleClick = (event: any) => {
    openAllComponents(event.object.dataModel);
    // highlightingActions.toggleHighlight(ref.current, { sendMessage: true });
  };

  const [handleClickWithPrevent, handleDoubleClickWithPrevent] =
    useClickPreventionOnDoubleClick(handleClick, handleDoubleClick);

  return (
    <foundationMesh
      position={boxLayout.position}
      defaultColor={foundationColor}
      highlightingColor={highlightedEntityColor}
      layout={boxLayout}
      onClick={handleClickWithPrevent}
      onDoubleClick={handleDoubleClickWithPrevent}
      onPointerOver={handleOnPointerOver}
      onPointerOut={handleOnPointerOut}
      {...pointerStopHandlers}
      args={[constructorArgs]}
    >
      {appLabelMargin > 1.5 && (
        <Text
          color={foundationTextColor}
          outlineColor={'white'}
          position={[0, 0.51, 0.5 - appLabelMargin / boxLayout.depth / 2]}
          rotation={[1.5 * Math.PI, 0, 0]}
          fontSize={(appLabelMargin * 0.9) / boxLayout.depth}
          raycast={() => null}
        >
          {application.name}
        </Text>
      )}
    </foundationMesh>
  );
}
