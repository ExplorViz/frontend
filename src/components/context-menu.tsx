import React, {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { Position2D } from 'explorviz-frontend/src/hooks/interaction-modifier';
import useLongPress, {
  type LongPressPosition,
} from 'explorviz-frontend/src/hooks/useLongPress';
import { useAnnotationHandlerStore } from 'explorviz-frontend/src/stores/annotation-handler';
import { useCameraControlsStore } from 'explorviz-frontend/src/stores/camera-controls-store';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import * as EntityManipulation from 'explorviz-frontend/src/utils/city-rendering/entity-manipulation';
import {
  highlightById,
  removeAllHighlighting,
  unhighlightById,
} from 'explorviz-frontend/src/utils/city-rendering/highlighting';
import { subscribeContextMenuFromWorld } from 'explorviz-frontend/src/utils/context-menu-bridge';
import {
  type ContextMenuHitEntity,
  contextMenuPickAt,
} from 'explorviz-frontend/src/utils/context-menu-world-pick';
import { pingByModelId } from 'explorviz-frontend/src/view-objects/3d/city/animated-ping-r3f';

export type ContextMenuItem = {
  id: string;
  title: string;
  action: () => void;
};

interface ContextMenuProps {
  children: ReactNode;
}

export default function ContextMenu({ children }: ContextMenuProps) {
  const [visible, setVisible] = useState<boolean>(false);
  const [position, setPosition] = useState<Position2D | null>(null);
  const [hitEntity, setHitEntity] = useState<ContextMenuHitEntity>({
    kind: 'empty',
  });

  const closedDistrictIds = useVisualizationStore(
    (state) => state.closedDistrictIds
  );
  const isCommRendered = useConfigurationStore((state) => state.isCommRendered);

  const hide = useCallback(() => {
    setVisible(false);
    setHitEntity({ kind: 'empty' });
  }, []);

  const reveal = () => setVisible(true);

  const pingAnnotations = useCallback(() => {
    const annotationHandlerStore = useAnnotationHandlerStore.getState();
    const allAnnotations = [
      ...annotationHandlerStore.annotationData,
      ...annotationHandlerStore.minimizedAnnotations,
    ];

    const annotatedEntityIds = new Set<string>();
    allAnnotations.forEach((annotation) => {
      if (annotation.entityId) {
        annotatedEntityIds.add(annotation.entityId);
      }
    });

    annotatedEntityIds.forEach((entityId) => {
      pingByModelId(entityId, true, {
        color: 0x00ff00,
        durationMs: 3000,
        replay: false,
        removeOldPings: false,
      });
    });
  }, []);

  const resetView = useCallback(async () => {
    useCameraControlsStore.getState().resetCamera();
  }, []);

  const setVisualizationMode = useLocalUserStore(
    (state) => state.setVisualizationMode
  );

  const backgroundMenuItems: ContextMenuItem[] = useMemo(
    () => [
      { id: 'bg-reset-view', title: 'Reset View', action: resetView },
      {
        id: 'bg-open-close-all-districts',
        title:
          closedDistrictIds.size > 0
            ? 'Open All Districts'
            : 'Close All Districts',
        action: () => {
          if (closedDistrictIds.size > 0) {
            EntityManipulation.openAllDistrictsInLandscape();
          } else {
            EntityManipulation.closeAllDistrictsInLandscape();
          }
        },
      },
      {
        id: 'bg-hide-add-comm',
        title: isCommRendered ? 'Hide Communication' : 'Add Communication',
        action: () =>
          useConfigurationStore
            .getState()
            .setIsCommRendered(
              !useConfigurationStore.getState().isCommRendered
            ),
      },
      {
        id: 'bg-clear-highlight',
        title: 'Clear Highlighting',
        action: () => removeAllHighlighting(),
      },
      {
        id: 'bg-ping-annotations',
        title: 'Ping Annotations',
        action: pingAnnotations,
      },
      {
        id: 'bg-enter-vr',
        title: 'Enter VR',
        action: () => {
          setVisualizationMode('vr');
        },
      },
    ],
    [
      closedDistrictIds,
      resetView,
      isCommRendered,
      pingAnnotations,
      setVisualizationMode,
    ]
  );

  const getFoundationMenuItems = (cityId: string) => {
    const city = useModelStore.getState().getCity(cityId);
    if (!city) {
      return backgroundMenuItems;
    }
    const cityHasClosedDistrict = city.allContainedDistrictIds.some(
      (districtId) => closedDistrictIds.has(districtId)
    );
    const foundationIsHighlighted = useVisualizationStore
      .getState()
      .highlightedEntityIds.has(city.id);
    return [
      {
        id: `city-open-close-districts-${cityId}`,
        title: cityHasClosedDistrict
          ? 'Open All Districts in City'
          : 'Close All Districts in City',
        action: () => {
          if (cityHasClosedDistrict) {
            EntityManipulation.openAllDistrictsInCity(city);
          } else {
            EntityManipulation.closeAllDistrictsInCity(city);
          }
        },
      },
      {
        id: `city-highlight-foundation-${cityId}`,
        title: foundationIsHighlighted
          ? 'Unhighlight Foundation'
          : 'Highlight Foundation',
        action: () => {
          if (foundationIsHighlighted) {
            unhighlightById(city.id);
          } else {
            highlightById(city.id);
          }
        },
      },
    ];
  };

  const getDistrictMenuItems = (districtId: string) => {
    const district = useModelStore.getState().getDistrict(districtId);
    if (!district) {
      return backgroundMenuItems;
    }
    const isClosed = closedDistrictIds.has(districtId);
    const districtIsHighlighted = useVisualizationStore
      .getState()
      .highlightedEntityIds.has(districtId);
    return [
      {
        id: `district-open-close-${districtId}`,
        title: isClosed ? 'Open District' : 'Close District',
        action: () => {
          if (isClosed) {
            EntityManipulation.openDistrict(districtId);
          } else {
            EntityManipulation.closeDistrict(districtId);
          }
        },
      },
      ...(closedDistrictIds.has(districtId) && district.districtIds.length > 0
        ? [
            {
              id: `district-open-all-${districtId}`,
              title: 'Open All Districts',
              action: () => {
                EntityManipulation.openDistrictAndChildren(districtId);
              },
            },
          ]
        : []),
      {
        id: `district-highlight-${districtId}`,
        title: districtIsHighlighted
          ? 'Unhighlight District'
          : 'Highlight District',
        action: () => {
          if (districtIsHighlighted) {
            unhighlightById(districtId);
          } else {
            highlightById(districtId);
          }
        },
      },
    ];
  };

  const getBuildingMenuItems = (buildingId: string) => {
    const isBuildingHighlighted = useVisualizationStore
      .getState()
      .highlightedEntityIds.has(buildingId);
    return [
      {
        id: `building-highlight-${buildingId}`,
        title: isBuildingHighlighted
          ? 'Unhighlight Building'
          : 'Highlight Building',
        action: () => {
          if (isBuildingHighlighted) {
            unhighlightById(buildingId);
          } else {
            highlightById(buildingId);
          }
        },
      },
    ];
  };

  const menuItems: ContextMenuItem[] = useMemo(() => {
    let menuItems: ContextMenuItem[] = [];
    if (hitEntity.kind === 'empty') {
      menuItems = backgroundMenuItems;
    } else if (hitEntity.kind === 'city') {
      menuItems = getFoundationMenuItems(hitEntity.cityId);
    } else if (hitEntity.kind === 'district') {
      menuItems = getDistrictMenuItems(hitEntity.districtId);
    } else if (hitEntity.kind === 'building') {
      menuItems = getBuildingMenuItems(hitEntity.buildingId);
    }

    return menuItems;
  }, [hitEntity, backgroundMenuItems, closedDistrictIds]);

  const handleLongPress = (pos: LongPressPosition) => {
    setHitEntity(contextMenuPickAt(pos.clientX, pos.clientY));
    setPosition({ x: pos.x, y: pos.y });
    reveal();
  };

  const { onTouchStart, onTouchMove, onTouchEnd } =
    useLongPress(handleLongPress);

  const onContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
  };

  useEffect(() => {
    subscribeContextMenuFromWorld(({ hit, pointer }) => {
      setHitEntity(hit);
      setPosition({ x: pointer.pageX, y: pointer.pageY });
      reveal();
    });
    return () => subscribeContextMenuFromWorld(null);
  }, []);

  useEffect(() => {
    document.addEventListener('click', hide);
    return () => {
      document.removeEventListener('click', hide);
    };
  }, [hide]);

  return (
    <div
      onContextMenu={onContextMenu}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ width: '100%' }}
    >
      {visible && position && (
        <ul
          className="bg-white shadow border rounded-md w-40 select-none"
          style={{
            position: 'absolute',
            top: position.y,
            left: position.x,
            listStyle: 'none',
            padding: 0,
            zIndex: '2000',
          }}
        >
          {menuItems.map((item) => (
            <ContextMenuRow
              key={item.id}
              title={item.title}
              onSelect={item.action}
            />
          ))}
        </ul>
      )}
      {children}
    </div>
  );
}

interface ContextMenuRowProps {
  title: string;
  onSelect: () => void;
}

function ContextMenuRow({ title, onSelect }: ContextMenuRowProps) {
  return (
    <li
      className="context-menu-item select-none"
      style={{ cursor: 'pointer' }}
      onClick={onSelect}
    >
      {title}
    </li>
  );
}
