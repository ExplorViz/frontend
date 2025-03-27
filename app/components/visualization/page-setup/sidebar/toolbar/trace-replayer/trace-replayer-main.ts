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
import {
  getApplicationFromClass,
  getHashCodeToClassMap,
} from 'explorviz-frontend/utils/landscape-structure-helpers';
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
import {
  AnimationEntity,
  GeometryFactory,
  HueSpace,
  Partition,
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

  private readonly tree: TraceTree;

  private readonly scene: THREE.Scene;

  @tracked
  timeline: TraceNode[];

  trace: Span[];

  builder: (() => TraceTree)[] = [];

  @tracked
  ready: boolean = false;

  callbackReady = () => {
    const timeline: TraceNode[] = [];

    const visitor = new TraceTreeVisitor((node: TraceNode): void => {
      timeline.push(node);
      if (node.end - node.start < 1) {
        this.ready = false;
      }
    });
    this.tree.accept(visitor);

    if (timeline.length > 100) {
      this.ready = false;
    }

    this.cursor = 0;

    this.timeline = timeline;
    this.ready = true;
  };

  geometry: GeometryFactory;

  constructor(owner: any, args: Args) {
    super(owner, args);
    this.isCommRendered = this.configuration.isCommRendered;

    const selectedTrace = this.args.selectedTrace;
    this.trace = getSortedTraceSpans(selectedTrace);

    this.geometry = new GeometryFactory(this.renderer);

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
  paused: boolean = true;

  @tracked
  stopped: boolean = true;

  opacity: number = 0.3;

  private turnTransparent(opacity: number = this.opacity) {
    this.classMap.forEach((clazz) => {
      const mesh = this.renderer.getMeshById(clazz.id);
      if (mesh instanceof BaseMesh) {
        mesh.turnTransparent(opacity);
        mesh.unhighlight();
        this.turnAncestorsTransparent(clazz.parent, opacity);
      }
    });
  }

  private turnAncestorsTransparent(
    component: Package,
    opacity: number,
    step: number = 0
  ) {
    if (component && opacity >= this.opacity) {
      const mesh = this.renderer.getMeshById(component.id);
      if (mesh instanceof BaseMesh) {
        mesh.turnTransparent(opacity);
        mesh.unhighlight();
        this.turnAncestorsTransparent(component.parent, opacity - step, step);
      }
    }
  }

  @tracked
  cursor: number;

  callbackSelection = () => {};

  callbackCursor = (cursor: number) => {
    const paused = this.paused;
    this.stop();
    this.cursor = cursor;
    this.start();
    this.tick(0);
    if (paused) {
      this.pause();
    }
  };

  observer: ((cursor: number) => void)[] = [];

  @tracked
  afterimage = true;

  toggleAfterimage = (): void => {
    this.afterimage = !this.afterimage;
  };

  @tracked
  eager = true;

  toggleEager = (): void => {
    this.eager = !this.eager;
  };

  tick(delta: number) {
    if (!this.stopped && !this.paused) {
      this.turnTransparent();

      this.cursor += delta * this.speed;

      this.observer.forEach((notify) => {
        notify(this.cursor);
      });

      if (this.entities.size > 0) {
        this.entities.forEach((entity: AnimationEntity, id: string) => {
          // move entity
          {
            const start = entity.callee.start;
            const end = this.eager
              ? entity.callee.children.reduce(
                  (end, node) => Math.min(node.start, end),
                  entity.callee.end
                )
              : entity.callee.end;

            const progress = (this.cursor - start) / (end - start);

            if (0.0 <= progress && progress <= 1.0) {
              entity.move(progress);
            } else {
              entity.afterimage();
            }
          }

          // spawn children
          const colors = entity.colorSpace.partition(
            entity.callee.children.length
          );
          const heights = entity.heightSpace.partition(
            entity.callee.children.length
          );
          entity.callee.children.forEach((node, idx: number) => {
            if (
              node.start <= this.cursor &&
              node.end >= this.cursor &&
              !this.entities.has(node.id)
            ) {
              const spawn = new AnimationEntity(
                this.scene,
                this.geometry,
                entity.callee,
                node,
                heights[idx],
                colors[idx]
              );
              const origin = getApplicationFromClass(
                this.args.structureData,
                entity.callee.clazz
              );
              const target = getApplicationFromClass(
                this.args.structureData,
                node.clazz
              );

              this.entities.set(node.id, spawn);

              this.tabs.forEach((tab) => {
                tab.active = false;
              });
              const tab = new Tab(
                entity.callee,
                node,
                origin,
                target,
                spawn.colorSpace.color,
                () => {
                  this.tabs.forEach((tab) => {
                    tab.active = false;
                  });
                }
              );
              tab.active = true;
              this.tabs = [...this.tabs, tab];
            }
          });

          // destroy entity
          if (this.afterimage && entity.callee.end <= this.cursor) {
            entity.destroy();
            this.entities.delete(id);

            this.tabs = this.tabs.filter((tab) => entity.callee.id !== tab.id);
            if (this.tabs.length > 0) {
              this.tabs.at(-1)!.active = true;
            }
          }

          entity.caller.mesh.highlight();
          entity.caller.mesh.turnOpaque();
          this.turnAncestorsTransparent(entity.caller.clazz.parent, 1, 0.1);

          entity.callee.mesh.highlight();
          entity.callee.mesh.turnOpaque();
          this.turnAncestorsTransparent(entity.callee.clazz.parent, 1, 0.1);
        });
      } else {
        this.stop();
      }
    }
  }

  private isCommRendered = false;

  @action
  start() {
    if (this.stopped) {
      this.stopped = false;
      this.args.renderingLoop.updatables.push(this);

      this.isCommRendered = this.configuration.isCommRendered;
      this.configuration.isCommRendered = false;
      this.renderer.openAllComponentsOfAllApplications();
      this.renderer.removeCommunicationForAllApplications();

      // find alive entities
      const nodes: TraceNode[] = this.timeline.filter((node) => {
        return node.start <= this.cursor && node.end >= this.cursor;
      });
      nodes.sort((a: TraceNode, b: TraceNode): number => {
        return a.start === b.start
          ? a.end === b.end
            ? a.id < b.id
              ? -1
              : 1
            : a.end - b.end
          : a.start - b.start;
      });

      // spawn initial set of entities
      const colors = HueSpace.default.partition(nodes.length);
      const heights = new Partition(0.5, 1.5).partition(nodes.length);
      nodes.forEach((caller: TraceNode, idx: number): void => {
        const spawn = new AnimationEntity(
          this.scene,
          this.geometry,
          caller,
          caller,
          heights[idx],
          colors[idx]
        );
        const origin = getApplicationFromClass(
          this.args.structureData,
          caller.clazz
        );

        this.entities.set(caller.id, spawn);

        this.tabs.forEach((tab) => {
          tab.active = false;
        });
        const tab = new Tab(
          caller,
          caller,
          origin,
          origin,
          spawn.colorSpace.color,
          () => {
            this.tabs.forEach((tab) => {
              tab.active = false;
            });
          }
        );
        tab.active = true;
        this.tabs = [...this.tabs, tab];
      });
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

    this.turnTransparent(1);

    this.entities.forEach((entity) => {
      entity.destroy();
    });
    this.entities.clear();
    this.tabs.clear();
    this.cursor = 0;
    this.observer.forEach((observer) => {
      observer(this.cursor);
    });

    if (
      this.args.selectedTrace &&
      this.args.selectedTrace.spanList.length > 0
    ) {
      this.args.highlightTrace(
        this.args.selectedTrace,
        this.args.selectedTrace.spanList[0].spanId
      );
    }
  }

  willDestroy() {
    super.willDestroy();
    this.stop();
  }
}
