import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import ClassMethodFiltering, {
  ClassMethodFilteringHandle,
} from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/entity-filtering/structure-filtering/class-method-filtering';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { NEW_SELECTED_TIMESTAMP_EVENT } from 'explorviz-frontend/src/stores/timestamp';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import {
  Building,
  FlatLandscape,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { Class } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';

interface StructureFilteringProps {
  readonly landscapeData: LandscapeData;
  readonly flatLandscapeData: FlatLandscape;
}

export type StructureFilteringHandle = {
  setMinMethodCount: (value: number) => void;
  reset: () => void;
};

const StructureFiltering = forwardRef<
  StructureFilteringHandle,
  StructureFilteringProps
>(function StructureFiltering(
  { landscapeData, flatLandscapeData }: StructureFilteringProps,
  ref
) {
  const triggerRenderingForGivenLandscapeData = useRenderingServiceStore(
    (state) => state.triggerRenderingForGivenLandscapeData
  );

  const getMethodCount = (building: Building): number =>
    building.metrics?.functionCount?.current ?? 0;

  const toMethodCountClass = (building: Building): Class =>
    ({
      methods: Array.from({ length: getMethodCount(building) }),
    }) as Class;

  const classes: Class[] = Object.values(flatLandscapeData.buildings).map(
    toMethodCountClass
  );

  const classCount = classes.length;

  const [initialClasses, setInitialClasses] = useState<Class[]>(classes);
  const [
    numRemainingClassesAfterFilteredByMethodCount,
    setNumRemainingClassesAfterFilteredByMethodCount,
  ] = useState<number>(initialClasses.length);

  const initialLandscapeData = useRef<LandscapeData>(landscapeData);
  const initialFlatLandscapeData = useRef<FlatLandscape>(flatLandscapeData);
  const selectedMinMethodCount = useRef<number>(0);
  const initialClassCount = initialClasses.length;
  const classMethodRef = useRef<ClassMethodFilteringHandle>(null);

  const updateMinMethodCount = (newMinMethodCount: number) => {
    selectedMinMethodCount.current = newMinMethodCount;
    _triggerRenderingForGivenLandscapeData();
  };

  const resetState = () => {
    // reset state, since new timestamp has been loaded
    const classes: Class[] = Object.values(flatLandscapeData.buildings).map(
      toMethodCountClass
    );
    setInitialClasses(classes);
    initialLandscapeData.current = landscapeData;
    initialFlatLandscapeData.current = flatLandscapeData;
    setNumRemainingClassesAfterFilteredByMethodCount(classes.length);
  };

  const _triggerRenderingForGivenLandscapeData = () => {
    const deepCopyFlatLandscape = structuredClone(
      initialFlatLandscapeData.current
    );
    const classesToRemove = Object.values(
      deepCopyFlatLandscape.buildings
    ).filter(
      (building) => getMethodCount(building) < selectedMinMethodCount.current
    );

    setNumRemainingClassesAfterFilteredByMethodCount(
      Object.keys(deepCopyFlatLandscape.buildings).length -
        classesToRemove.length
    );

    for (const building of classesToRemove) {
      delete deepCopyFlatLandscape.buildings[building.id];
    }

    const remainingBuildingIds = new Set(
      Object.keys(deepCopyFlatLandscape.buildings)
    );

    for (const district of Object.values(deepCopyFlatLandscape.districts)) {
      district.buildingIds = district.buildingIds.filter((id) =>
        remainingBuildingIds.has(id)
      );
    }

    for (const city of Object.values(deepCopyFlatLandscape.cities)) {
      city.buildingIds = city.buildingIds.filter((id) =>
        remainingBuildingIds.has(id)
      );
      city.allContainedBuildingIds = city.allContainedBuildingIds.filter((id) =>
        remainingBuildingIds.has(id)
      );
    }

    triggerRenderingForGivenLandscapeData(
      deepCopyFlatLandscape,
      initialLandscapeData.current.dynamicLandscapeData,
      initialLandscapeData.current.aggregatedFileCommunication
    );
  };

  useEffect(() => {
    eventEmitter.on(NEW_SELECTED_TIMESTAMP_EVENT, resetState);
    return () => {
      triggerRenderingForGivenLandscapeData(
        initialFlatLandscapeData.current,
        initialLandscapeData.current.dynamicLandscapeData,
        initialLandscapeData.current.aggregatedFileCommunication
      );
      eventEmitter.off(NEW_SELECTED_TIMESTAMP_EVENT, resetState);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    setMinMethodCount: (value: number) => {
      classMethodRef.current?.setValue(value);
    },
    reset: () => {
      classMethodRef.current?.reset();
      resetState();
    },
  }));

  return (
    <>
      <h6 className="mb-3 mt-3">
        <strong>
          Classes (# shown:
          {classCount}/{initialClassCount})
        </strong>
      </h6>

      <ClassMethodFiltering
        ref={classMethodRef}
        classes={classes}
        updateMinMethodCount={updateMinMethodCount}
        remainingEntityCountAfterFiltering={
          numRemainingClassesAfterFilteredByMethodCount
        }
        initialEntityCount={initialClassCount}
      />
    </>
  );
});

export default StructureFiltering;
