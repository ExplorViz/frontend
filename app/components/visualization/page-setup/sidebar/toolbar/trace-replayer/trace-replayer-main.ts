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
import {
  calculateDuration,
  getSortedTraceSpans,
} from 'explorviz-frontend/utils/trace-helpers';
import { getHashCodeToClassMap } from 'explorviz-frontend/utils/landscape-structure-helpers';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import LocalUser from 'explorviz-frontend/services/collaboration/local-user';
import RenderingLoop from 'explorviz-frontend/rendering/application/rendering-loop';
import { LandscapeData } from 'explorviz-frontend/utils/landscape-schemes/landscape-data';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import Configuration from 'explorviz-frontend/services/configuration';
import { getAllAncestorComponents } from 'explorviz-frontend/utils/application-rendering/entity-manipulation';

const DEFAULT_OPACITY = 1;

export class HighlightedClass {
  private mesh: BaseMesh;

  private opacity: number = DEFAULT_OPACITY;

  constructor(mesh: BaseMesh) {
    this.mesh = mesh;
    this.mesh.highlight();
    this.mesh.turnTransparent(this.opacity);
  }

  delete() {
    this.mesh.turnOpaque();
    this.mesh.unhighlight();
    this.opacity = -1;
  }

  tick(): boolean {
    if (this.opacity >= 0.3) {
      this.mesh.highlight();
      this.mesh.turnTransparent(this.opacity);
    } else {
      this.mesh.unhighlight();
    }
    this.opacity -= 0.01;
    return this.opacity < 0;
  }

  reset() {
    this.opacity = DEFAULT_OPACITY;
    this.mesh.highlight();
    this.mesh.turnTransparent(this.opacity);
  }
}

interface Args {
  selectedTrace: Trace;
  structureData: StructureLandscapeData;
  renderingLoop: RenderingLoop;

  highlightTrace(trace: Trace, traceStep: string): void;

  readonly landscapeData: LandscapeData;
}

export default class TraceReplayerMain extends Component<Args> {
  @tracked
  isReplayAnimated: boolean = false;

  @tracked
  currentTraceStep: Span | null = null;

  @tracked
  trace: Span[] = [];

  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('collaboration/local-user')
  localUser!: LocalUser;

  @service('configuration')
  private configuration!: Configuration;

  private classMap: Map<string, Class>;

  constructor(owner: any, args: Args) {
    super(owner, args);
    const { selectedTrace } = this.args;
    this.trace = getSortedTraceSpans(selectedTrace);

    if (this.trace.length > 0) {
      const [firstStep] = this.trace;
      this.currentTraceStep = firstStep;
    }

    this.classMap = getHashCodeToClassMap(this.args.structureData);
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

  private delta: number = 0;
  private steps: Span[] = [];

  private cloud: THREE.Mesh[] = [];
  private curve: THREE.QuadraticBezierCurve3 | undefined = undefined;
  private duration = 0;

  @tracked
  progress = 0;

  private originClass: Class | undefined = undefined;
  private targetClass: Class | undefined = undefined;
  private highlights = new Map<string, HighlightedClass>();

  tick(delta: number) {
    this.delta += delta;

    if (this.curve) {
      const progress = this.delta / this.duration;
      if (0.0 <= progress && progress <= 1.0) {
        this.cloud[0].position.copy(this.curve.getPoint(progress));
      }
    }
    this.progress = Math.ceil(
      ((this.trace.length - this.steps.length) / this.trace.length) * 100
    );

    if (this.delta > this.duration) {
      this.delta = 0;

      if (this.steps.length > 1) {
        const origin = this.steps.shift();
        const target = this.steps[0];

        if (origin && target) {
          this.duration =
            (1 + calculateDuration(origin) / 1000.0) / this.selectedSpeed;

          this.originClass = this.classMap.get(origin.methodHash);
          this.targetClass = this.classMap.get(target.methodHash);
          // let method = clazz?.methods.find(
          //   (method) => method.methodHash === current?.methodHash
          // );

          if (this.originClass && this.targetClass) {
            getAllAncestorComponents(this.originClass).forEach((component) => {
              this.applicationRenderer.getMeshById(component.id);
            });

            let originMesh = this.applicationRenderer.getMeshById(
              this.originClass.id
            );
            let targetMesh = this.applicationRenderer.getMeshById(
              this.targetClass.id
            );
            if (originMesh && targetMesh) {
              if (this.highlights.has(this.originClass.id)) {
                this.highlights.get(this.originClass.id)?.reset();
              } else {
                this.highlights.set(
                  this.originClass.id,
                  new HighlightedClass(originMesh)
                );
              }

              if (this.highlights.has(this.targetClass.id)) {
                this.highlights.get(this.targetClass.id)?.reset();
              } else {
                this.highlights.set(
                  this.targetClass.id,
                  new HighlightedClass(targetMesh)
                );
              }

              let scale = this.applicationRenderer.forceGraph.scale;
              let start = this.applicationRenderer
                .getGraphPosition(originMesh)
                .multiply(scale);
              let end = this.applicationRenderer
                .getGraphPosition(targetMesh)
                .multiply(scale);

              const classDistance = Math.hypot(
                end.x - start.x,
                end.z - start.z
              );
              const height =
                classDistance *
                0.2 *
                this.applicationRenderer.appSettings.curvyCommHeight.value;
              const middle = new THREE.Vector3(
                start.x + (end.x - start.x) / 2.0,
                height + start.y + (end.y - start.y) / 2.0,
                start.z + (end.z - start.z) / 2.0
              );

              this.curve = new THREE.QuadraticBezierCurve3(start, middle, end);

              this.cloud[0].position.copy(start);
              this.cloud[0].visible = true;
            }
          }

          // this.args.highlightTrace(this.args.selectedTrace, current.spanId);
        }
      } else {
        this.stop();
      }
    }

    const prune = new Set<string>();
    this.highlights.forEach((clazz, id) => {
      if (
        (!this.originClass || id !== this.originClass.id) &&
        (!this.targetClass || id !== this.targetClass.id)
      ) {
        if (clazz.tick()) {
          prune.add(id);
        }
      }
    });
    prune.forEach((id) => this.highlights.delete(id));
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
    this.isReplayAnimated = true;
    this.steps = [...this.trace];
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

    const geometry = new THREE.SphereGeometry(0.02, 8, 8);

    const colors = ['red', 'green', 'blue'];

    for (let i = 0; i < 3; ++i) {
      const material = new THREE.MeshBasicMaterial({ color: colors[i] });
      let mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      this.args.renderingLoop.scene.add(mesh);
      this.cloud.push(mesh);
    }
  }

  @action
  stop() {
    this.isReplayAnimated = false;
    this.steps.clear();
    this.args.renderingLoop.updatables.removeObject(this);
    this.progress = 0;

    this.configuration.isCommRendered = this.isCommRendered;
    if (this.configuration.isCommRendered) {
      this.applicationRenderer.addCommunicationForAllApplications();
    }

    this.classMap.forEach((clazz) => {
      const mesh = this.applicationRenderer.getMeshById(clazz.id);
      mesh?.turnOpaque();
      this.turnComponentAndAncestorsTransparent(clazz.parent, 1);
    });

    for (let mesh of this.cloud) {
      this.args.renderingLoop.scene.remove(mesh);
    }
    this.cloud.clear();

    this.highlights.forEach((clazz) => {
      clazz.delete();
    });
    this.highlights.clear();
  }

  @action
  selectNextTraceStep() {
    // Can only select next step if a trace is selected
    if (!this.currentTraceStep) {
      return;
    }

    const currentTracePosition = this.trace.findIndex(
      (span) => span === this.currentTraceStep
    );

    if (currentTracePosition === -1) {
      return;
    }

    const nextStepPosition = currentTracePosition + 1;

    if (nextStepPosition > this.trace.length - 1) {
      return;
    }

    this.currentTraceStep = this.trace[nextStepPosition];

    this.args.highlightTrace(
      this.args.selectedTrace,
      this.currentTraceStep.spanId
    );
  }

  @action
  selectPreviousTraceStep() {
    // Can only select next step if a trace is selected
    if (!this.currentTraceStep) {
      return;
    }

    const currentTracePosition = this.trace.findIndex(
      (span) => span === this.currentTraceStep
    );

    if (currentTracePosition === -1) {
      return;
    }

    const previousStepPosition = currentTracePosition - 1;

    if (previousStepPosition < 0) {
      return;
    }

    this.currentTraceStep = this.trace[previousStepPosition];

    this.args.highlightTrace(
      this.args.selectedTrace,
      this.currentTraceStep.spanId
    );
  }
}
