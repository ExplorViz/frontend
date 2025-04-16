import { ThreeElements } from '@react-three/fiber';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { useHighlightingStore } from 'explorviz-frontend/src/stores/highlighting';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { Class } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import ComponentMesh from 'explorviz-frontend/src/view-objects/3d/application/component-mesh';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import { useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

export default function ClassR3F({
  dataModel,
  layout,
}: {
  dataModel: Class;
  layout: BoxLayout;
}) {
  const highlightingActions = useHighlightingStore(
    useShallow((state) => ({
      toggleHighlight: state.toggleHighlight,
      updateHighlightingOnHover: state.updateHighlightingOnHover,
    }))
  );

  const { classColor, highlightedEntityColor } = useUserSettingsStore(
    useShallow((state) => ({
      classColor: state.colors?.clazzColor,
      highlightedEntityColor: state.colors?.highlightedEntityColor,
    }))
  );

  const opts = useMemo<ThreeElements['clazzMesh']['args'][0]>(() => {
    return {
      clazz: dataModel,
    };
  }, []);

  const ref = useRef<ComponentMesh>(null!);

  const handleOnPointerOver = (event: any) => {
    event.stopPropagation();
    ref.current.applyHoverEffect();
  };

  const handleOnPointerOut = (event: any) => {
    event.stopPropagation();
    ref.current.resetHoverEffect();
  };

  const handleClick = (/*event: any*/) => {
    highlightingActions.toggleHighlight(ref.current, { sendMessage: true });
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
      onClick={handleClickWithPrevent}
      onDoubleClick={handleDoubleClickWithPrevent}
      onPointerOver={handleOnPointerOver}
      onPointerOut={handleOnPointerOut}
      args={[opts]}
      ref={ref}
    >
      {/* <LabelMeshWrapper /> */}
    </clazzMesh>
  );
}
