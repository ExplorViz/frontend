import {
  DeviceCameraIcon,
  LocationIcon,
  PaintbrushIcon,
} from '@primer/octicons-react';
import { useLiveBuildings } from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/use-live-flat-entity';
import { useCameraControlsStore } from 'explorviz-frontend/src/stores/camera-controls-store';
import { useLocalHighlightStore } from 'explorviz-frontend/src/stores/collaboration/local-highlight-store';
import { getFileExtensionGroupsFromBuildings } from 'explorviz-frontend/src/stores/entity-filtering-store';
import {
  highlightById,
  unhighlightById,
} from 'explorviz-frontend/src/utils/city-rendering/highlighting';
import { pingByModelId } from 'explorviz-frontend/src/view-objects/3d/city/animated-ping-r3f';
import { useMemo } from 'react';
import Button from 'react-bootstrap/Button';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

interface FilesTabProps {
  readonly buildingIds: readonly string[];
}

function areAllBuildingsHighlighted(
  buildingIds: readonly string[],
  localHighlightedIds: ReadonlySet<string>
): boolean {
  return (
    buildingIds.length > 0 &&
    buildingIds.every((buildingId) => localHighlightedIds.has(buildingId))
  );
}

function toggleHighlightBuildings(buildingIds: readonly string[]) {
  const localHighlightedIds =
    useLocalHighlightStore.getState().localHighlightedIds;
  const allHighlighted = areAllBuildingsHighlighted(
    buildingIds,
    localHighlightedIds
  );

  buildingIds.forEach((buildingId) => {
    if (allHighlighted) {
      unhighlightById(buildingId);
    } else {
      highlightById(buildingId);
    }
  });
}

function pingBuildings(buildingIds: readonly string[]) {
  buildingIds.forEach((buildingId) => {
    pingByModelId(buildingId);
  });
}

function focusBuilding(buildingId: string) {
  pingByModelId(buildingId);
  useCameraControlsStore.getState().lookAtEntity(buildingId);
}

interface FileExtensionListItemProps {
  readonly extension: string;
  readonly count: number;
  readonly buildingIds: readonly string[];
}

function FileExtensionListItem({
  extension,
  count,
  buildingIds,
}: FileExtensionListItemProps) {
  const localHighlightedIds = useLocalHighlightStore(
    (state) => state.localHighlightedIds
  );
  const allHighlighted = areAllBuildingsHighlighted(
    buildingIds,
    localHighlightedIds
  );
  const highlightTooltip = allHighlighted ? 'Unhighlight all' : 'Highlight all';
  const highlightAriaLabel = allHighlighted
    ? `Unhighlight all ${extension} files`
    : `Highlight all ${extension} files`;

  return (
    <li className="entity-files-list-item d-flex align-items-center gap-2">
      <span className="entity-files-list-label flex-grow-1 text-break">
        {extension}
        <span className="text-muted ms-1">({count})</span>
      </span>
      <span className="entity-files-list-actions d-flex align-items-center gap-1">
        {count === 1 && (
          <OverlayTrigger
            placement="top"
            trigger={['hover', 'focus']}
            overlay={<Tooltip>Move camera to file</Tooltip>}
          >
            <Button
              variant="primary"
              size="sm"
              className="entity-files-action-button"
              aria-label={`Move camera to ${extension} file`}
              onClick={(event) => {
                event.stopPropagation();
                focusBuilding(buildingIds[0]!);
              }}
            >
              <DeviceCameraIcon className="align-middle" size="small" />
            </Button>
          </OverlayTrigger>
        )}
        <OverlayTrigger
          placement="top"
          trigger={['hover', 'focus']}
          overlay={<Tooltip>{highlightTooltip}</Tooltip>}
        >
          <Button
            variant={allHighlighted ? 'success' : 'primary'}
            size="sm"
            className="entity-files-action-button"
            aria-label={highlightAriaLabel}
            aria-pressed={allHighlighted}
            onClick={(event) => {
              event.stopPropagation();
              toggleHighlightBuildings(buildingIds);
            }}
          >
            <PaintbrushIcon className="align-middle" size="small" />
          </Button>
        </OverlayTrigger>
        <OverlayTrigger
          placement="top"
          trigger={['hover', 'focus']}
          overlay={<Tooltip>Ping all</Tooltip>}
        >
          <Button
            variant="primary"
            size="sm"
            className="entity-files-action-button"
            aria-label={`Ping all ${extension} files`}
            onClick={(event) => {
              event.stopPropagation();
              pingBuildings(buildingIds);
            }}
          >
            <LocationIcon className="align-middle" size="small" />
          </Button>
        </OverlayTrigger>
      </span>
    </li>
  );
}

export default function FilesTab({ buildingIds }: FilesTabProps) {
  const buildings = useLiveBuildings();
  const buildingIdsKey = buildingIds.join(',');

  const extensionGroups = useMemo(() => {
    const scopedBuildings = buildingIds
      .map((buildingId) => buildings[buildingId])
      .filter((building) => building !== undefined);

    return getFileExtensionGroupsFromBuildings(scopedBuildings);
  }, [buildingIds, buildingIdsKey, buildings]);

  if (buildingIds.length === 0) {
    return (
      <div className="text-center text-muted py-3">No contained buildings</div>
    );
  }

  if (extensionGroups.length === 0) {
    return (
      <div className="text-center text-muted py-3">No files available</div>
    );
  }

  return (
    <ul className="entity-files-list list-unstyled mb-0 mt-2">
      {extensionGroups.map(({ extension, count, buildingIds: groupIds }) => (
        <FileExtensionListItem
          key={extension}
          extension={extension}
          count={count}
          buildingIds={groupIds}
        />
      ))}
    </ul>
  );
}
