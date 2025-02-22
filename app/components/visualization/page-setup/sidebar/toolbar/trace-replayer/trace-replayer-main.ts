import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { htmlSafe } from '@ember/template';
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
  TraceNodeVisitor,
  TraceTree,
  TraceTreeBuilder,
} from 'explorviz-frontend/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-tree';
import Details, {
  AnimationEntity,
  Arc,
  HueSpace,
  Sphere,
  Tab,
} from 'explorviz-frontend/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-animation';
import Ember from 'ember';
import SafeString = Ember.Handlebars.SafeString;
import TraceStepDetails from 'explorviz-frontend/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-step-details';

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

    {
      const node =
        this.tree.root[0].children[0].children[0].children[0].children[0]
          .children[0].children[0].children[0].children[0];
      this.tree.root[0].children[0].children.push(node);
      this.tree.root[0].children[0].children[0].children.push(node);
      this.tree.root[0].children[0].children[0].children[0].children[0].children.push(
        node
      );
    }

    const visitor = new TraceNodeVisitor((node: TraceNode): void => {
      console.log(node);
    });
    this.tree.accept(visitor);
  }

  public minSpeed = 1;
  public maxSpeed = 20;
  @tracked
  public selectedSpeed = 5;

  @action
  inputSpeed(_: any, htmlInputElement: any) {
    const newValue = htmlInputElement.target.value;
    if (newValue) {
      this.selectedSpeed = Number(newValue);
    }
  }

  @action
  changeSpeed(event: any) {
    this.selectedSpeed = Number(event.target.value);
  }

  @tracked
  public entities: AnimationEntity[] = [];

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
        animation.delta = 0;

        if (!animation.target.isLeaf) {
          animation.origin = animation.target;
          animation.target = animation.origin.children[0];

          animation.path = this.path(animation.origin, animation.target);
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
        animation.delta = 0;

        if (!animation.origin.isRoot) {
          animation.target = animation.origin;
          animation.origin = animation.target.parents[0];

          animation.path = this.path(animation.origin, animation.target);
          animation.mesh.move(animation.path.getPoint(0));
          animation.mesh.show();
        }
      });
    }
  }

  path(origin: TraceNode, target: TraceNode) {
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

    return new Arc(start, end);
  }

  trail(start: Vector3, end: Vector3, radius: number) {
    const shape = new THREE.Shape().ellipse(
      0.0,
      0.0,
      radius,
      radius,
      0.0,
      2.0 * Math.PI
    );

    const spline = new Arc(start, end);

    return new THREE.ExtrudeGeometry(shape, {
      steps: 32,
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

  tick(delta: number) {
    if (this.entities.length > 0) {
      const entities: AnimationEntity[] = [];
      this.entities.forEach((entity: AnimationEntity) => {
        entity.delta += delta;
        const progress = entity.delta / (entity.duration / this.selectedSpeed);
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
        } else if (!this.stopped && !this.paused) {
          entity.delta = 0;

          if (!entity.target.isLeaf) {
            entity.origin.mesh.unhighlight();
            entity.origin.mesh.turnTransparent(0.3);
            this.turnComponentAndAncestorsTransparent(
              entity.origin.clazz.parent,
              0.3
            );

            entity.origin = entity.target;

            if (entity.origin.children.length > 1) {
              const tabs: Tab[] = [];

              // spawn new entities for all children
              const colors = entity.color.partition(
                entity.target.children.length
              );

              for (const child of entity.origin.children) {
                const path = this.path(entity.origin, child);

                const color = colors.pop();

                const mesh = new Sphere(0.02, color!.color);
                mesh.show();
                this.scene.add(mesh);

                const trail = new THREE.Mesh(
                  this.trail(path.start, path.end, 0.015),
                  mesh.material
                );

                const tab = new Tab(
                  child.clazz.name,
                  () => {
                    this.tabs.forEach((tab) => {
                      tab.active = false;
                    });
                  },
                  color!.color,
                  new Details(
                    'blubb',
                    entity.origin.clazz,
                    child.clazz,
                    undefined,
                    undefined,
                    0,
                    1
                  )
                );
                tabs.push(tab);
                entities.push(
                  new AnimationEntity(
                    entity.origin,
                    child,
                    path,
                    mesh,
                    [],
                    trail,
                    [tab],
                    color
                  )
                );
              }

              this.scene.remove(entity.mesh);
              entity.alive = false;
              entity.tab.__alive = [false];

              tabs[0].active = entity.tab.active;
              this.tabs = [...this.tabs, ...tabs];
              console.log(this.tabs);
            } else {
              entity.target = entity.origin.children[0];

              entity.path = this.path(entity.origin, entity.target);
              entity.mesh.move(entity.path.getPoint(0));
              entity.mesh.show();

              const details = entity.tab.details;
              details.origin = entity.origin.clazz;
              details.target = entity.target.clazz;
            }

            // animation.line.forEach((line) => {
            //   if (line.material instanceof THREE.LineBasicMaterial) {
            //     line.material = new THREE.LineBasicMaterial({
            //       color: line.material.color,
            //       opacity: line.material.opacity - 0.3,
            //     });
            //   }
            // });

            const line = new THREE.Mesh(
              this.trail(
                entity.path.getPoint(0),
                entity.path.getPoint(1),
                0.005
              ),
              entity.trail.material
            );
            this.scene.add(line);
            entity.line.push(line);
          } else {
            this.stop();
          }
        }

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
      });
      this.entities = this.entities.filter((entity) => {
        return entity.alive;
      });
      this.tabs = this.tabs.filter((tab) => {
        return tab.alive;
      });
      const tab = this.tabs.find((tab) => {
        return tab.active;
      });
      if (tab) {
        this.tab = tab;
      }
      this.entities.push(...entities);
    } else {
      this.stop();
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
      this.applicationRenderer.openAllComponentsOfAllApplications();
      this.applicationRenderer.removeCommunicationForAllApplications();

      this.classMap.forEach((clazz) => {
        const mesh = this.applicationRenderer.getMeshById(clazz.id);
        mesh?.turnTransparent();
        this.turnComponentAndAncestorsTransparent(clazz.parent, 0.3);
      });

      let colors = HueSpace.default;

      if (this.tree.root.length > 0) {
        {
          const origin = this.tree.root[0];

          const target = !origin.isLeaf ? origin.children[0] : origin;

          const path = this.path(origin, target);

          const material = new THREE.LineBasicMaterial({
            color: colors.color,
          });
          const trail = new THREE.Mesh(
            this.trail(path.start, path.end, 0.015),
            material
          );
          this.scene.add(trail);

          const line = new THREE.Mesh(
            this.trail(path.start, path.end, 0.005),
            material
          );
          this.scene.add(line);

          const blob = new Sphere(0.02, colors.color);
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
            colors.color,
            new Details(
              'blubb',
              origin.clazz,
              target.clazz,
              undefined,
              undefined,
              0,
              1
            )
          );
          this.entities.push(
            new AnimationEntity(origin, target, path, blob, [line], trail, [
              tab,
            ])
          );
          this.tabs = [...this.tabs, tab];
          this.tabs[0].active = true;
        }
      }
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
