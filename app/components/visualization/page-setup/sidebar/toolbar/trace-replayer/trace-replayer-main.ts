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
  TraceNodeVisitor,
  TraceTree,
  TraceTreeBuilder,
} from 'explorviz-frontend/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-tree';
import {
  Blob,
  PathAnimation,
} from 'explorviz-frontend/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-animation';

interface Args {
  selectedTrace: Trace;
  structureData: StructureLandscapeData;
  renderingLoop: RenderingLoop;

  callback: (() => void)[];

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

  constructor(owner: any, args: Args) {
    super(owner, args);
    const selectedTrace = this.args.selectedTrace;
    const trace = getSortedTraceSpans(selectedTrace);

    this.args.callback.push(this.stop);

    if (trace.length > 0) {
      const [firstStep] = trace;
      this.currentTraceStep = firstStep;
    }

    this.classMap = getHashCodeToClassMap(this.args.structureData);

    this.tree = new TraceTreeBuilder(
      trace,
      this.classMap,
      this.applicationRenderer
    ).build();

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
  private animations: PathAnimation[] = [];

  @tracked
  paused: boolean = true;

  @tracked
  stopped: boolean = true;

  @action
  next() {
    if (this.paused) {
      this.animations.forEach((animation: PathAnimation) => {
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
      this.animations.forEach((animation: PathAnimation) => {
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

    const classDistance = Math.hypot(end.x - start.x, end.z - start.z);
    const height =
      classDistance *
      0.2 *
      this.applicationRenderer.appSettings.curvyCommHeight.value;
    const middle = new THREE.Vector3(
      start.x + (end.x - start.x) / 2.0,
      height + start.y + (end.y - start.y) / 2.0,
      start.z + (end.z - start.z) / 2.0
    );
    return new THREE.QuadraticBezierCurve3(start, middle, end);
  }

  tick(delta: number) {
    this.animations.forEach((animation: PathAnimation) => {
      animation.delta += delta;
      const progress =
        animation.delta / (animation.duration / this.selectedSpeed);
      if (0.0 <= progress && progress <= 1.0) {
        animation.mesh.move(animation.path.getPoint(progress));
      } else if (!this.stopped && !this.paused) {
        animation.delta = 0;

        if (!animation.target.isLeaf) {
          animation.origin = animation.target;
          animation.target = animation.origin.children[0];

          animation.path = this.path(animation.origin, animation.target);
          animation.mesh.move(animation.path.getPoint(0));
          animation.mesh.show();
        } else {
          this.stop();
        }
      }
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

      {
        const blob = new Blob(0.02);
        blob.hide();
        this.args.renderingLoop.scene.add(blob);

        const origin = this.tree.root[0];
        const target = origin.children[0];
        const path = this.path(origin, target);
        this.animations.push(new PathAnimation(origin, target, path, blob));
      }
      {
        const blob = new Blob(0.02, new THREE.Color('blue'));
        blob.hide();
        this.args.renderingLoop.scene.add(blob);

        const origin = this.tree.root[0].children[0].children[0];
        const target = origin.children[0];
        const path = this.path(origin, target);
        this.animations.push(new PathAnimation(origin, target, path, blob));
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

    for (const node of this.animations) {
      this.args.renderingLoop.scene.remove(node.mesh);
    }
    this.animations.clear();
  }
}
