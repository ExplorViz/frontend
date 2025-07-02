import { Helper, Instance, Text } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import { usePointerStop } from 'explorviz-frontend/src/hooks/pointer-stop';
import useClickPreventionOnDoubleClick from 'explorviz-frontend/src/hooks/useClickPreventionOnDoubleClick';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useEvolutionDataRepositoryStore } from 'explorviz-frontend/src/stores/repos/evolution-data-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import calculateColorBrightness from 'explorviz-frontend/src/utils/helpers/threejs-helpers';
import {
  Application,
  Class,
  TypeOfAnalysis,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import BoxLayout from 'explorviz-frontend/src/view-objects/layout-models/box-layout';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';

export default function ClassR3F({
  dataModel,
  layout,
  application,
}: {
  dataModel: Class;
  layout: BoxLayout;
  application: Application;
}) {
  const { isHighlighted, isHovered, isVisible, updateClassState } =
    useVisualizationStore(
      useShallow((state) => ({
        isHighlighted: state.classData[dataModel.id]
          ? state.classData[dataModel.id].isHighlighted
          : false,
        isHovered: state.classData[dataModel.id]
          ? state.classData[dataModel.id].isHovered
          : false,
        isVisible: state.classData[dataModel.id]
          ? state.classData[dataModel.id].isVisible
          : true,
        updateClassState: state.actions.updateClassState,
      }))
    );

  const { evoConfig } = useVisibilityServiceStore(
    useShallow((state) => ({
      evoConfig: state._evolutionModeRenderingConfiguration,
    }))
  );

  const commitComparison = useEvolutionDataRepositoryStore
    .getState()
    .getCommitComparisonByAppName(application.name);

  const { addPopup } = usePopupHandlerStore(
    useShallow((state) => ({
      addPopup: state.addPopup,
    }))
  );

  const handlePointerStop = (event: ThreeEvent<PointerEvent>) => {
    addPopup({
      position: {
        x: event.clientX,
        y: event.clientY,
      },
      model: dataModel,
    });
  };

  const pointerStopHandlers = usePointerStop(handlePointerStop);

  const {
    castShadows,
    classColor,
    classLabelFontSize,
    classLabelLength,
    classTextColor,
    enableHoverEffects,
    highlightedEntityColor,
    labelOffset,
    labelRotation,
    maxLabelLength,
    showOutlines,
  } = useUserSettingsStore(
    useShallow((state) => ({
      castShadows: state.visualizationSettings.castShadows.value,
      classColor: state.visualizationSettings.classColor.value,
      classLabelFontSize: state.visualizationSettings.classLabelFontSize.value,
      classLabelLength: state.visualizationSettings.classLabelLength.value,
      classTextColor: state.visualizationSettings.classTextColor.value,
      enableHoverEffects: state.visualizationSettings.enableHoverEffects.value,
      highlightedEntityColor: state.colors?.highlightedEntityColor,
      labelOffset: state.visualizationSettings.classLabelOffset.value,
      labelRotation: state.visualizationSettings.classLabelOrientation.value,
      maxLabelLength: state.visualizationSettings.classLabelLength.value,
      showOutlines: state.visualizationSettings.showOutlines.value,
    }))
  );

  const computeColor = () => {
    if (evoConfig.renderOnlyDifferences && commitComparison && dataModel.fqn) {
      if (commitComparison.added.includes(dataModel.fqn)) {
        return new THREE.Color('green');
      } else if (commitComparison.deletedPackages.includes(dataModel.fqn)) {
        return new THREE.Color('red');
      } else if (commitComparison.modified.includes(dataModel.fqn)) {
        return new THREE.Color('blue');
      } else {
        return new THREE.Color('white');
      }
    }

    const baseColor = isHighlighted
      ? new THREE.Color(highlightedEntityColor)
      : new THREE.Color(classColor);

    if (enableHoverEffects && isHovered) {
      return calculateColorBrightness(baseColor, 1.1);
    } else {
      return baseColor;
    }
  };

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

  // Check if class should be displayed
  if (
    (dataModel.originOfData === TypeOfAnalysis.Static &&
      !evoConfig.renderStatic) ||
    (dataModel.originOfData === TypeOfAnalysis.Dynamic &&
      !evoConfig.renderDynamic)
  ) {
    return null;
  }

  return (
    <>
      {isVisible && (
        <Instance
          color={computeColor()}
          castShadow={castShadows}
          scale={[layout.width, layout.height, layout.depth]}
          position={layout.position}
          rotation={[0, 0, 0]}
          onClick={handleClickWithPrevent}
          onDoubleClick={handleDoubleClickWithPrevent}
          onPointerOver={handleOnPointerOver}
          onPointerOut={handleOnPointerOut}
          {...pointerStopHandlers}
          visible={isVisible}
        >
          {classLabelFontSize > 0 && classLabelLength > 0 && (
            <Text
              color={classTextColor}
              // outlineColor={'black'}
              // outlineWidth={classLabelFontSize * 0.05}
              position={[0, 0.51 + labelOffset / layout.height, 0]}
              rotation={[1.5 * Math.PI, 0, labelRotation]}
              fontSize={classLabelFontSize}
              raycast={() => null}
            >
              {dataModel.name.length <= maxLabelLength
                ? dataModel.name
                : dataModel.name.substring(0, maxLabelLength) + '...'}
            </Text>
          )}
          {showOutlines && <Helper type={THREE.BoxHelper} args={['black']} />}
        </Instance>
      )}
    </>
  );
}
