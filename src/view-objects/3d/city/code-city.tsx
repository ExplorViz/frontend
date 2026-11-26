import { InstancedMesh2 } from '@three.ez/instanced-mesh';
import { useEvolutionAnimationStore } from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-animation-store';
import { useEntityFilteringStore } from 'explorviz-frontend/src/stores/entity-filtering-store';
import { useLayoutStore } from 'explorviz-frontend/src/stores/layout-store';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useWebViewStore } from 'explorviz-frontend/src/stores/web-view-store';
import {
  filterBuildingIdsForCity,
  filterDistrictIdsForCity,
} from 'explorviz-frontend/src/utils/city-rendering/district-tree';
import {
  filterVisibleBuildingIds,
  filterVisibleDistrictIds,
} from 'explorviz-frontend/src/utils/city-rendering/entity-visibility';
import { useSharedEntityVisibilityContext } from 'explorviz-frontend/src/utils/city-rendering/entity-visibility-provider-store';
import CityDistrictLabel from 'explorviz-frontend/src/view-objects/3d/city/city-district-label';
import CityDistricts from 'explorviz-frontend/src/view-objects/3d/city/city-districts';
import CityFoundation from 'explorviz-frontend/src/view-objects/3d/city/city-foundation';
import CodeBuildingLabel from 'explorviz-frontend/src/view-objects/3d/city/code-building-label';
import CodeBuildings from 'explorviz-frontend/src/view-objects/3d/city/code-buildings';
import EmbeddedBrowser from 'explorviz-frontend/src/view-objects/3d/city/embedded-browser';
import gsap from 'gsap';
import { memo, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';

// Memoized: a city renders one label per building, so it must not re-render
// whenever the canvas wrapper does.
export default memo(CodeCity);

// Labels are rendered in groups of this many. To insert a new sibling, React
// looks through all siblings after it for one that is already mounted, so
// mounting n labels under one parent ("open all") takes n² steps; with a group
// per chunk it takes at most LABEL_CHUNK_SIZE steps per label.
const LABEL_CHUNK_SIZE = 256;

type LabelChunk = { key: string; ids: string[] };

/**
 * The visible ones of `allIds`, in chunks of LABEL_CHUNK_SIZE consecutive
 * `allIds`. An id stays in its chunk whatever else is visible, and every chunk
 * is listed, also an empty one, so its group stays mounted.
 */
function chunkVisibleIds(allIds: readonly string[], visibleIds: readonly string[]): LabelChunk[] {
  const visible = new Set(visibleIds);
  const chunks: LabelChunk[] = [];
  for (let start = 0; start < allIds.length; start += LABEL_CHUNK_SIZE) {
    chunks.push({
      key: allIds[start],
      ids: allIds.slice(start, start + LABEL_CHUNK_SIZE).filter((id) => visible.has(id)),
    });
  }
  return chunks;
}

/**
 * The group of one chunk of labels. A component of its own instead of a bare
 * <group> in the city, because React DevTools hides host elements like <group>
 * and, on every label update, searches through all labels of their parent
 * once per hidden sibling. With a group per chunk directly in the city, this
 * halved the frame rate while moving the camera with the extension installed.
 */
function LabelChunkGroup({ children }: { children: ReactNode }) {
  return <group>{children}</group>;
}

function CodeCity({ cityId }: { cityId: string }) {
  const city = useModelStore((state) => state.cities[cityId])!;
  const districtLayouts = useLayoutStore((state) => state.districtLayouts);
  const buildingLayouts = useLayoutStore((state) => state.buildingLayouts);
  const cityLayout = useLayoutStore((state) => state.cityLayouts.get(cityId));
  const visibilityContext = useSharedEntityVisibilityContext();
  const evolutionAnimation = useEvolutionAnimationStore(
    useShallow((state) => ({
      totalCount: state.totalCount,
      buildingVisualStates: state.buildingVisualStates,
    }))
  );

  const { animationDuration, enableAnimations, buildingLayoutAlgorithm } = useUserSettingsStore(
    useShallow((state) => ({
      animationDuration: state.visualizationSettings.animationDuration.value,
      enableAnimations: state.visualizationSettings.enableAnimations.value,
      buildingLayoutAlgorithm: state.visualizationSettings.buildingLayoutAlgorithm.value,
    }))
  );
  const isWebViewOpen = useWebViewStore((state) => state.openCityIds.has(cityId));

  const filterMode = useEntityFilteringStore((state) => state.filterMode);

  const showDistricts = buildingLayoutAlgorithm === 'None';
  const cityBuildingIds = useMemo(
    () => filterBuildingIdsForCity(city.id, city.allContainedBuildingIds),
    [city.id, city.allContainedBuildingIds]
  );
  const cityDistrictIds = useMemo(
    () => filterDistrictIdsForCity(city.id, city.allContainedDistrictIds),
    [city.id, city.allContainedDistrictIds]
  );
  const visibleBuildingIds = useMemo(
    () => filterVisibleBuildingIds(cityBuildingIds, visibilityContext, evolutionAnimation),
    [cityBuildingIds, visibilityContext, evolutionAnimation]
  );
  const visibleDistrictIds = useMemo(
    () => (showDistricts ? filterVisibleDistrictIds(cityDistrictIds, visibilityContext, evolutionAnimation) : []),
    [cityDistrictIds, showDistricts, visibilityContext, evolutionAnimation]
  );
  const districtMeshIds = useMemo(
    () =>
      cityDistrictIds.filter(
        (districtId) =>
          !visibilityContext.hiddenDistrictIds.has(districtId) && !visibilityContext.removedDistrictIds.has(districtId)
      ),
    [cityDistrictIds, visibilityContext.hiddenDistrictIds, visibilityContext.removedDistrictIds]
  );
  const districtRenderIds = useMemo(
    () => (filterMode === 'Hide' ? districtMeshIds : visibleDistrictIds),
    [filterMode, districtMeshIds, visibleDistrictIds]
  );

  // A label is only mounted once its building has a layout. The buildings of a
  // new landscape are known before they are laid out, and a label per building
  // that mounts first and renders again when the layout arrives doubles the
  // most expensive part of bringing a large landscape to the screen.
  const buildingLabelChunks = useMemo(
    () =>
      chunkVisibleIds(
        cityBuildingIds,
        visibleBuildingIds.filter((buildingId) => buildingLayouts.has(buildingId))
      ),
    [cityBuildingIds, visibleBuildingIds, buildingLayouts]
  );
  const districtLabelChunks = useMemo(
    () => chunkVisibleIds(cityDistrictIds, visibleDistrictIds),
    [cityDistrictIds, visibleDistrictIds]
  );

  const [cityPosition, setCityPosition] = useState<THREE.Vector3 | undefined>(cityLayout?.position);

  const componentInstanceMeshRef = useRef<InstancedMesh2>(null);

  useEffect(() => {
    const newPosition = cityLayout?.position;
    if (!newPosition) return;
    if (enableAnimations && cityPosition) {
      const gsapValues = {
        positionX: cityPosition.x,
        positionY: cityPosition.y,
        positionZ: cityPosition.z,
      };
      gsap.to(gsapValues, {
        positionX: newPosition.x,
        positionY: newPosition.y,
        positionZ: newPosition.z,
        duration: animationDuration,
        onUpdate: () => {
          setCityPosition(new THREE.Vector3(gsapValues.positionX, gsapValues.positionY, gsapValues.positionZ));
        },
      });
    } else {
      setCityPosition(newPosition);
    }
  }, [cityLayout]);

  if (!city) return null;

  return (
    <group position={cityPosition} userData={{ cityName: city.name }}>
      {isWebViewOpen && cityLayout && <EmbeddedBrowser city={city} layout={cityLayout} />}
      {cityLayout && <CityFoundation city={city} layout={cityLayout} />}
      <CodeBuildings buildingIds={visibleBuildingIds} city={city} />
      {buildingLabelChunks.map((chunk) => (
        <LabelChunkGroup key={'building-labels-' + chunk.key}>
          {chunk.ids.map((buildingId) => (
            <CodeBuildingLabel key={buildingId + '-label'} buildingId={buildingId} />
          ))}
        </LabelChunkGroup>
      ))}
      {showDistricts && districtRenderIds.length > 0 && (
        <CityDistricts
          districtIds={districtRenderIds}
          layoutMap={districtLayouts}
          ref={componentInstanceMeshRef}
          city={city}
        />
      )}
      {districtLabelChunks.map((chunk) => (
        <LabelChunkGroup key={'district-labels-' + chunk.key}>
          {chunk.ids.map((districtId) => {
            const district = useModelStore.getState().getDistrict(districtId);
            const layout = useLayoutStore.getState().getLayout(districtId);
            if (district && layout) {
              return <CityDistrictLabel key={districtId + '-label'} district={district} layout={layout} />;
            }
            return null;
          })}
        </LabelChunkGroup>
      ))}
    </group>
  );
}
