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
import {
  Class,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { getAllClassesInApplication } from 'explorviz-frontend/src/utils/application-helpers';
import { NEW_SELECTED_TIMESTAMP_EVENT } from 'explorviz-frontend/src/stores/timestamp';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';

interface StructureFilteringProps {
  readonly landscapeData: LandscapeData;
}

export type StructureFilteringHandle = {
  setMinMethodCount: (value: number) => void;
  reset: () => void;
};

const StructureFiltering = forwardRef<
  StructureFilteringHandle,
  StructureFilteringProps
>(function StructureFiltering({ landscapeData }: StructureFilteringProps, ref) {
  const triggerRenderingForGivenLandscapeData = useRenderingServiceStore(
    (state) => state.triggerRenderingForGivenLandscapeData
  );

  const classes: Class[] = landscapeData.structureLandscapeData.nodes.flatMap(
    (node) =>
      node.applications.flatMap((app) => getAllClassesInApplication(app))
  );

  const classCount = classes.length;

  const [initialClasses, setInitialClasses] = useState<Class[]>(classes);
  const [
    numRemainingClassesAfterFilteredByMethodCount,
    setNumRemainingClassesAfterFilteredByMethodCount,
  ] = useState<number>(initialClasses.length);

  const initialLandscapeData = useRef<LandscapeData>(landscapeData);
  const selectedMinMethodCount = useRef<number>(0);
  const initialClassCount = initialClasses.length;
  const classMethodRef = useRef<ClassMethodFilteringHandle>(null);

  const updateMinMethodCount = (newMinMethodCount: number) => {
    selectedMinMethodCount.current = newMinMethodCount;
    _triggerRenderingForGivenLandscapeData();
  };

  const resetState = () => {
    // reset state, since new timestamp has been loaded
    let classes: Class[] = [];

    for (const node of landscapeData.structureLandscapeData.nodes) {
      for (const app of node.applications) {
        classes = [...classes, ...getAllClassesInApplication(app)];
      }
    }
    setInitialClasses(classes);
    initialLandscapeData.current = landscapeData;
    setNumRemainingClassesAfterFilteredByMethodCount(initialClasses.length);
  };

  const removeFilteredClassesOfNestedPackages = (
    pack: Package,
    classesToRemove: Class[]
  ) => {
    if (classesToRemove.length == 0) {
      return;
    }

    for (let i = pack.classes.length - 1; i >= 0; i--) {
      if (classesToRemove.find((clazz) => clazz.id == pack.classes[i].id)) {
        pack.classes.splice(i, 1);
      }
    }

    for (const subPack of pack.subPackages) {
      removeFilteredClassesOfNestedPackages(subPack, classesToRemove);
    }
  };

  const _triggerRenderingForGivenLandscapeData = () => {
    let numFilter = 0;

    // hide all classes that have a strict lower method count than selected
    const classesToRemove = initialClasses.filter((t) => {
      if (t.methods.length < selectedMinMethodCount.current!) {
        return true;
      }
      numFilter++;
      return false;
    });

    setNumRemainingClassesAfterFilteredByMethodCount(numFilter);
    numFilter = 0;

    const deepCopyStructure = structuredClone(
      initialLandscapeData.current.structureLandscapeData
    );

    let classes: Class[] = [];

    for (const node of deepCopyStructure.nodes) {
      for (const app of node.applications) {
        classes = [...classes, ...getAllClassesInApplication(app)];
      }
    }

    classes = [];

    for (const node of deepCopyStructure.nodes) {
      for (const app of node.applications) {
        for (const pack of app.packages) {
          removeFilteredClassesOfNestedPackages(pack, classesToRemove);
        }
      }
    }

    for (const node of deepCopyStructure.nodes) {
      for (const app of node.applications) {
        classes = [...classes, ...getAllClassesInApplication(app)];
      }
    }

    classes = [];

    triggerRenderingForGivenLandscapeData(
      deepCopyStructure,
      landscapeData.dynamicLandscapeData
    );
  };

  useEffect(() => {
    eventEmitter.on(NEW_SELECTED_TIMESTAMP_EVENT, resetState);
    return () => {
      triggerRenderingForGivenLandscapeData(
        initialLandscapeData.current.structureLandscapeData,
        initialLandscapeData.current.dynamicLandscapeData
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
