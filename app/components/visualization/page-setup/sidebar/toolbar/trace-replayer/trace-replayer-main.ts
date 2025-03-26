import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import * as THREE from 'three';
import { Vector3 } from 'three';
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
  Arc,
  ColorSpace,
  HueSpace,
  Partition,
  Sphere,
  Tab,
} from 'explorviz-frontend/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-animation';
import Ember from 'ember';
import observer = Ember.observer;

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
  applicationRenderer!: ApplicationRenderer;

  @service('collaboration/local-user')
  localUser!: LocalUser;

  @service('configuration')
  private configuration!: Configuration;

  private classMap: Map<string, Class>;

  private tree: TraceTree;

  private scene;

  public timeline: TraceNode[];

  constructor(owner: any, args: Args) {
    super(owner, args);
    const selectedTrace = this.args.selectedTrace;
    const trace = getSortedTraceSpans(selectedTrace);

    if (trace.length > 0) {
      const [firstStep] = trace;
      this.currentTraceStep = firstStep;
    }

    this.classMap = getHashCodeToClassMap(this.args.structureData);
    this.scene = this.args.renderingLoop.scene;

    this.tree = new TraceTreeBuilder(
      trace,
      this.classMap,
      this.applicationRenderer
    ).build();

    this.timeline = [];

    const visitor = new TraceTreeVisitor((node: TraceNode): void => {
      this.timeline.push(node);
    });
    this.tree.accept(visitor);

    const start = this.timeline.reduce((acc: number, node: TraceNode) => {
      return Math.min(acc, node.start);
    }, Infinity);

    this.cursor = start;

    console.log(this.timeline);
  }

  public minSpeed = 1;
  public maxSpeed = 20;
  @tracked
  public sliderSpeed = 5;

  @action
  inputSpeed(_: any, htmlInputElement: any) {
    const newValue = htmlInputElement.target.value;
    if (newValue) {
      this.sliderSpeed = Number(newValue);
    }
  }

  @action
  changeSpeed(event: any) {
    this.sliderSpeed = Number(event.target.value);
  }

  @tracked
  public sliderDelay: number = 1;

  @action
  inputDelay(_: any, htmlInputElement: any) {
    const newValue = htmlInputElement.target.value;
    if (newValue) {
      this.sliderDelay = Number(newValue);
    }
  }

  @action
  changeDelay(event: any) {
    this.sliderDelay = Number(event.target.value);
  }

  @tracked
  public entities: Map<string, AnimationEntity> = new Map();

  @tracked
  public tabs: Tab[] = [];

  @tracked
  public tab: Tab;

  @tracked
  paused: boolean = true;

  @tracked
  stopped: boolean = true;

  @action
  next() {
    if (this.paused) {
      this.entities.forEach((animation: AnimationEntity) => {
        if (!animation.target.isLeaf) {
          animation.origin = animation.target;
          animation.target = animation.origin.children[0];

          animation.path = this.path(
            animation.origin,
            animation.target,
            animation.height.value
          );
          animation.mesh.move(animation.path.getPoint(0));
          animation.mesh.show();
        }
      });
    }
  }

  @action
  previous() {
    if (this.paused) {
      this.entities.forEach((animation: AnimationEntity) => {
        if (!animation.origin.isRoot) {
          animation.target = animation.origin;
          animation.origin = animation.target.parents[0];

          animation.path = this.path(
            animation.origin,
            animation.target,
            animation.height.value
          );
          animation.mesh.move(animation.path.getPoint(0));
          animation.mesh.show();
        }
      });
    }
  }

  path(origin: TraceNode, target: TraceNode, height: number) {
    const scale = this.applicationRenderer.landscape3D.scale;
    const support = this.applicationRenderer.landscape3D.position;
    const start = this.applicationRenderer
      .getPositionInLandscape(origin.mesh)
      .multiply(scale)
      .add(support);
    const end = this.applicationRenderer
      .getPositionInLandscape(target.mesh)
      .multiply(scale)
      .add(support);

    return new Arc(start, end, height);
  }

  trail(start: Vector3, end: Vector3, radius: number, height: number) {
    const shape = new THREE.Shape().ellipse(
      0.0,
      0.0,
      radius,
      radius,
      0.0,
      2.0 * Math.PI
    );

    const spline = new Arc(start, end, height);

    return new THREE.ExtrudeGeometry(shape, {
      steps: 16,
      extrudePath: spline,
    });
  }

  turnComponentAndAncestorsTransparent(component: Package, opacity: number) {
    if (component) {
      const mesh = this.applicationRenderer.getMeshById(component.id);
      if (mesh instanceof BaseMesh) {
        mesh.turnTransparent(opacity);
        this.turnComponentAndAncestorsTransparent(component.parent, opacity);
      }
    }
  }

  @tracked
  public cursor: number;

  public callback = [
    (cursor: number) => {
      this.cursor = cursor;
    },
  ];

  public observer: ((cursor: number) => void)[] = [];

  tick(delta: number) {
    if (!this.stopped && !this.paused) {
      this.cursor += delta * this.sliderSpeed;

      this.observer.forEach((notify) => {
        notify(this.cursor);
      });

      if (this.entities.size > 0) {
        this.entities.forEach((entity: AnimationEntity, id: string) => {
          // move entity
          {
            const start =
              entity.origin.start + this.sliderDelay * entity.origin.startDelay;
            const end = start + this.sliderDelay;

            console.log(
              `${start} + ${entity.origin.startDelay} ${end} + ${entity.target.startDelay}`
            );

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

          const colors = entity.color.partition(entity.target.children.length);
          const heights = entity.height.partition(
            entity.target.children.length
          );
          entity.target.children.forEach((node, idx: number) => {
            if (
              node.start + this.sliderDelay * node.startDelay <= this.cursor &&
              node.end + this.sliderDelay * node.endDelay >= this.cursor &&
              !this.entities.has(node.id)
            ) {
              this.spawnEntity(entity.target, node, heights[idx], colors[idx]);
              console.log(this.cursor);
              console.log(this.entities);
            }
          });

          entity.origin.mesh.highlight();
          entity.origin.mesh.turnOpaque();
          this.turnComponentAndAncestorsTransparent(
            entity.origin.clazz.parent,
            1
          );

          entity.target.mesh.highlight();
          entity.target.mesh.turnOpaque();
          this.turnComponentAndAncestorsTransparent(
            entity.target.clazz.parent,
            1
          );

          // delete entity if lifetime exceeded
          if (
            entity.origin.end + this.sliderDelay * entity.origin.endDelay <
              this.cursor &&
            this.entities.has(entity.target.id)
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
    const path = this.path(origin, target, height.value);

    const material = new THREE.LineBasicMaterial({
      color: color.color,
    });
    const trail = new THREE.Mesh(
      this.trail(path.start, path.end, 0.015, height.value),
      material
    );
    this.scene.add(trail);

    const line = new THREE.Mesh(
      this.trail(path.start, path.end, 0.005, height.value),
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
      this.applicationRenderer.openAllComponentsOfAllApplications();
      this.applicationRenderer.removeCommunicationForAllApplications();

      this.classMap.forEach((clazz) => {
        const mesh = this.applicationRenderer.getMeshById(clazz.id);
        mesh?.turnTransparent();
        this.turnComponentAndAncestorsTransparent(clazz.parent, 0.3);
      });

      // find alive entities
      const nodes: TraceNode[] = this.timeline.filter((node) => {
        return (
          node.start + this.sliderDelay * node.startDelay <= this.cursor &&
          node.end + this.sliderDelay * node.endDelay >= this.cursor
        );
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
      this.applicationRenderer.addCommunicationForAllApplications();
    }

    this.classMap.forEach((clazz) => {
      const mesh = this.applicationRenderer.getMeshById(clazz.id);
      mesh?.turnOpaque();
      this.turnComponentAndAncestorsTransparent(clazz.parent, 1);
    });

    this.entities.forEach((animation) => {
      animation.origin.mesh.unhighlight();
      animation.target.mesh.unhighlight();

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
