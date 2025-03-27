import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import * as THREE from 'three';
import {
  Span,
  Trace,
} from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import {
  Class,
  Package,
  StructureLandscapeData,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { getSortedTraceSpans } from 'explorviz-frontend/utils/trace-helpers';
import { getHashCodeToClassMap } from 'explorviz-frontend/utils/landscape-structure-helpers';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import LocalUser from 'explorviz-frontend/services/collaboration/local-user';
import RenderingLoop from 'explorviz-frontend/rendering/application/rendering-loop';
import { LandscapeData } from 'explorviz-frontend/utils/landscape-schemes/landscape-data';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import Configuration from 'explorviz-frontend/services/configuration';
import {
  TraceNode,
  TraceTree,
  TraceTreeBuilder,
  TraceTreeVisitor,
} from 'explorviz-frontend/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-tree';
import Details, {
  AnimationEntity,
  ColorSpace,
  Geometry,
  HueSpace,
  Partition,
  Sphere,
  Tab,
} from 'explorviz-frontend/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-animation';

interface Args {
  selectedTrace: Trace;
  structureData: StructureLandscapeData;
  renderingLoop: RenderingLoop;

  highlightTrace(trace: Trace, traceStep: string): void;

  readonly landscapeData: LandscapeData;
}

export default class TraceReplayerMain extends Component<Args> {
  @tracked
  currentTraceStep: Span | null = null;

  @service('application-renderer')
  renderer!: ApplicationRenderer;

  @service('collaboration/local-user')
  localUser!: LocalUser;

  @service('configuration')
  private configuration!: Configuration;

  private classMap: Map<string, Class>;

  private tree: TraceTree;

  private scene;

  timeline: TraceNode[];

  trace: Span[];

  builder: (() => TraceTree)[] = [];

  @tracked
  ready: boolean = false;

  callbackReady = () => {
    this.ready = true;
  };

  geometry: Geometry;

  constructor(owner: any, args: Args) {
    super(owner, args);
    const selectedTrace = this.args.selectedTrace;
    this.trace = getSortedTraceSpans(selectedTrace);

    this.geometry = new Geometry(this.renderer);

    if (this.trace.length > 0) {
      const [firstStep] = this.trace;
      this.currentTraceStep = firstStep;
    }

    this.classMap = getHashCodeToClassMap(this.args.structureData);
    this.scene = this.args.renderingLoop.scene;

    this.tree = new TraceTreeBuilder(
      this.trace,
      this.classMap,
      this.renderer
    ).build();

    this.timeline = [];

    const visitor = new TraceTreeVisitor((node: TraceNode): void => {
      this.timeline.push(node);
      if (node.end - node.start < 1) {
        this.ready = false;
      }
    });
    this.tree.accept(visitor);

    this.cursor = 0;

    console.log(this.timeline);
  }

  @tracked
  speed = 5;

  callbackSpeed = (speed: number) => {
    this.speed = speed;
  };

  @tracked
  entities: Map<string, AnimationEntity> = new Map();

  @tracked
  tabs: Tab[] = [];

  @tracked
  tab: Tab;

  @tracked
  paused: boolean = true;

  @tracked
  stopped: boolean = true;

  // @action
  // next() {
  //   if (this.paused) {
  //     this.entities.forEach((animation: AnimationEntity) => {
  //       if (!animation.callee.isLeaf) {
  //         animation.caller = animation.callee;
  //         animation.callee = animation.caller.children[0];
  //
  //         animation.path = this.path(
  //           animation.caller,
  //           animation.callee,
  //           animation.height.value
  //         );
  //         animation.mesh.move(animation.path.getPoint(0));
  //         animation.mesh.show();
  //       }
  //     });
  //   }
  // }
  //
  // @action
  // previous() {
  //   if (this.paused) {
  //     this.entities.forEach((animation: AnimationEntity) => {
  //       if (!animation.caller.isRoot) {
  //         animation.callee = animation.caller;
  //         animation.caller = animation.callee.parents[0];
  //
  //         animation.path = this.path(
  //           animation.caller,
  //           animation.callee,
  //           animation.height.value
  //         );
  //         animation.mesh.move(animation.path.getPoint(0));
  //         animation.mesh.show();
  //       }
  //     });
  //   }
  // }

  turnComponentAndAncestorsTransparent(component: Package, opacity: number) {
    if (component) {
      const mesh = this.renderer.getMeshById(component.id);
      if (mesh instanceof BaseMesh) {
        mesh.turnTransparent(opacity);
        this.turnComponentAndAncestorsTransparent(component.parent, opacity);
      }
    }
  }

  @tracked
  cursor: number;

  callbackCursor = (cursor: number) => {
    this.cursor = cursor;
  };

  observer: ((cursor: number) => void)[] = [];

  tick(delta: number) {
    if (!this.stopped && !this.paused) {
      this.cursor += delta * this.speed;

      this.observer.forEach((notify) => {
        notify(this.cursor);
      });

      if (this.entities.size > 0) {
        this.entities.forEach((entity: AnimationEntity, id: string) => {
          // move entity
          {
            const start = entity.caller.start;
            const end = start;

            console.log(`${start} -> ${end}`);

            const progress = (this.cursor - start) / (end - start);

            if (0.0 <= progress && progress <= 1.0) {
              entity.mesh.move(entity.path.getPoint(progress));

              const shape = new THREE.Shape().ellipse(
                0.0,
                0.0,
                0.02,
                0.02,
                0.0,
                2.0 * Math.PI
              );

              if (progress > 0.2) {
                const spline = new THREE.QuadraticBezierCurve3(
                  entity.path.getPoint(progress - 0.2),
                  entity.path.getPoint(progress - 0.1),
                  entity.path.getPoint(progress)
                );
                const geometry = new THREE.ExtrudeGeometry(shape, {
                  steps: 12,
                  extrudePath: spline,
                });
                entity.trail.geometry.copy(geometry);
              } else {
                const spline = new THREE.QuadraticBezierCurve3(
                  entity.path.getPoint(0),
                  entity.path.getPoint(progress / 2),
                  entity.path.getPoint(progress)
                );
                const geometry = new THREE.ExtrudeGeometry(shape, {
                  steps: 12,
                  extrudePath: spline,
                });
                entity.trail.geometry.copy(geometry);

                entity.prune(3).forEach((mesh) => this.scene.remove(mesh));
              }
            }
          }

          // spawn children
          const colors = entity.color.partition(entity.callee.children.length);
          const heights = entity.height.partition(
            entity.callee.children.length
          );
          entity.callee.children.forEach((node, idx: number) => {
            if (
              node.start <= this.cursor &&
              node.end >= this.cursor &&
              !this.entities.has(node.id)
            ) {
              this.spawnEntity(entity.callee, node, heights[idx], colors[idx]);
              console.log(this.cursor);
              console.log(this.entities);
            }
          });

          entity.caller.mesh.highlight();
          entity.caller.mesh.turnOpaque();
          this.turnComponentAndAncestorsTransparent(
            entity.caller.clazz.parent,
            1
          );

          entity.callee.mesh.highlight();
          entity.callee.mesh.turnOpaque();
          this.turnComponentAndAncestorsTransparent(
            entity.callee.clazz.parent,
            1
          );

          // delete entity if lifetime exceeded
          if (
            entity.caller.end < this.cursor &&
            this.entities.has(entity.callee.id)
          ) {
            this.entities.delete(id);
          }
        });
      } else {
        this.stop();
      }
    }
  }

  private isCommRendered = false;

  private spawnEntity(
    origin: TraceNode,
    target: TraceNode,
    height: Partition,
    color: ColorSpace
  ) {
    const path = this.geometry.path(origin, target, height.value);

    const material = new THREE.LineBasicMaterial({
      color: color.color,
    });
    const trail = new THREE.Mesh(
      this.geometry.trail(path.start, path.end, 0.015, height.value),
      material
    );
    this.scene.add(trail);

    const line = new THREE.Mesh(
      this.geometry.trail(path.start, path.end, 0.005, height.value),
      material
    );
    this.scene.add(line);

    const blob = new Sphere(0.02, color.color);
    blob.hide();
    this.scene.add(blob);

    const tab = new Tab(
      '0',
      () => {
        this.tabs.forEach((tab) => {
          tab.active = false;
        });
        console.log('1');
      },
      color.color,
      new Details('foo', origin.clazz, target.clazz, undefined, undefined, 0, 1)
    );
    this.entities.set(
      target.id,
      new AnimationEntity(
        origin,
        target,
        path,
        blob,
        [line],
        trail,
        [tab],
        height,
        color
      )
    );
    this.tabs = [...this.tabs, tab];
    this.tabs[0].active = true;
  }

  @action
  start() {
    if (this.stopped) {
      this.stopped = false;
      this.args.renderingLoop.updatables.push(this);

      this.isCommRendered = this.configuration.isCommRendered;
      this.configuration.isCommRendered = false;
      this.renderer.openAllComponentsOfAllApplications();
      this.renderer.removeCommunicationForAllApplications();

      this.classMap.forEach((clazz) => {
        const mesh = this.renderer.getMeshById(clazz.id);
        mesh?.turnTransparent();
        this.turnComponentAndAncestorsTransparent(clazz.parent, 0.3);
      });

      // find alive entities
      const nodes: TraceNode[] = this.timeline.filter((node) => {
        return node.start <= this.cursor && node.end >= this.cursor;
      });

      console.log(nodes);

      // spawn initial set of entities
      const colors = HueSpace.default.partition(nodes.length);
      const heights = new Partition(0.5, 1.5).partition(nodes.length);
      nodes.forEach((origin: TraceNode, idx: number): void => {
        this.spawnEntity(origin, origin, heights[idx], colors[idx]);
      });

      console.log(this.entities);
    }
    this.paused = false;
  }

  @action
  pause() {
    this.paused = true;
  }

  @action
  stop() {
    this.paused = true;
    this.stopped = true;
    this.args.renderingLoop.updatables.removeObject(this);

    this.configuration.isCommRendered = this.isCommRendered;
    if (this.configuration.isCommRendered) {
      this.renderer.addCommunicationForAllApplications();
    }

    this.classMap.forEach((clazz) => {
      const mesh = this.renderer.getMeshById(clazz.id);
      mesh?.turnOpaque();
      this.turnComponentAndAncestorsTransparent(clazz.parent, 1);
    });

    this.entities.forEach((animation) => {
      animation.caller.mesh.unhighlight();
      animation.callee.mesh.unhighlight();

      this.scene.remove(animation.mesh);
      this.scene.remove(animation.trail);
      animation.line.forEach((line) => {
        this.scene.remove(line);
      });
    });
    this.entities.clear();
    this.tabs.clear();

    // if (
    //   this.args.selectedTrace &&
    //   this.args.selectedTrace.spanList.length > 0
    // ) {
    //   this.args.highlightTrace(
    //     this.args.selectedTrace,
    //     this.args.selectedTrace.spanList[0].spanId
    //   );
    // }
  }

  willDestroy() {
    super.willDestroy();
    this.stop();
  }
}
