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

class Blob extends BaseMesh<THREE.SphereGeometry, THREE.Material> {
  constructor(
    radius: number,
    color: THREE.Color = new THREE.Color('red'),
    opacity:number = 1
  ) {
    super(color, color, opacity);
    this.highlight();
    this.geometry = new THREE.SphereGeometry(radius, 8, 8);
  }

  move( position: THREE.Vector3): void {
    this.position.copy(position);
  }
}

export class Afterimage {
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

  tick(): void {
    if (this.opacity >= 0.3) {
      this.mesh.show();
      this.mesh.highlight();
      this.mesh.turnTransparent(this.opacity);
    } else {
      this.mesh.hide();
      this.mesh.unhighlight();
    }
    this.opacity -= 0.01;
  }

  alive(): boolean {
    return this.opacity > 0;
  }

  reset() {
    this.opacity = DEFAULT_OPACITY;
    this.mesh.highlight();
    this.mesh.turnTransparent(this.opacity);
  }
}

class Leg {
  constructor() {}
}

class Record {
  public clazz: Class;
  public mesh: BaseMesh;
  public duration: number;

  constructor(clazz: Class, mesh: BaseMesh, duration: number) {
    this.clazz = clazz;
    this.mesh = mesh;
    this.duration = duration;
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

    this.trace.forEach((span) => {
      const clazz = this.classMap.get(span.methodHash);
      if (clazz) {
        const mesh = this.applicationRenderer.getMeshById(clazz.id);
        if (mesh) {
          this.records.push(new Record(clazz, mesh, calculateDuration(span)));
        }
      }
    });

    console.log(this.records);
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
  private records: Record[] = [];

  private blob: Blob | undefined = undefined;
  private curve: THREE.QuadraticBezierCurve3 | undefined = undefined;
  private duration = 0;

  @tracked
  progress = 0;

  @tracked
  paused: boolean = true;

  @tracked
  stopped: boolean = true;

  @tracked
  index: number = -1;

  private meshes = new Set<BaseMesh>();
  private afterimages = new Set<Afterimage>();

  @action
  next() {
    if (this.paused) {
      this.index = Math.min(this.index + 1, this.records.length);
    }
  }

  @action
  previous() {
    if (this.paused) {
      this.index = Math.max(this.index - 1, 0);
    }
  }

  tick(delta: number) {
    this.delta += delta;

    if (this.blob && this.curve) {
      const progress = this.delta / this.duration;
      if (0.0 <= progress && progress <= 1.0) {
        const afterimage = this.blob.clone();
        this.args.renderingLoop.scene.add(afterimage);
        this.afterimages.add(new Afterimage(afterimage));
        this.blob.move(this.curve.getPoint(progress));
      }
    }
    this.progress = Math.ceil((this.index / this.trace.length) * 100);

    if (!this.stopped && !this.paused && this.delta > this.duration) {
      this.delta = 0;

      if (this.index >= 0 && this.index < this.records.length - 1) {
        const origin = this.records[this.index++];
        const target = this.records[this.index];

        this.duration = (1 + origin.duration / 1000.0) / this.selectedSpeed;

        getAllAncestorComponents(origin.clazz).forEach((component) => {
          this.applicationRenderer.getMeshById(component.id);
        });

        // if (this.highlights.has(origin.clazz.id)) {
        //   this.highlights.get(origin.clazz.id)?.reset();
        // } else {
        //   this.highlights.set(
        //     origin.clazz.id,
        //     new Afterimage(origin.mesh)
        //   );
        // }
        //
        // if (this.highlights.has(target.clazz.id)) {
        //   this.highlights.get(target.clazz.id)?.reset();
        // } else {
        //   this.highlights.set(
        //     target.clazz.id,
        //     new Afterimage(target.mesh)
        //   );
        // }

        // this.afterimages.add(new Afterimage(origin.mesh));
        // this.afterimages.add(new Afterimage(target.mesh));

        let scale = this.applicationRenderer.forceGraph.scale;
        let start = this.applicationRenderer
          .getGraphPosition(origin.mesh)
          .multiply(scale);
        let end = this.applicationRenderer
          .getGraphPosition(target.mesh)
          .multiply(scale);

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

        this.curve = new THREE.QuadraticBezierCurve3(start, middle, end);

        this.blob?.move(start);
        this.blob?.show();

        // this.args.highlightTrace(this.args.selectedTrace, current.spanId);
      } else {
        this.stop();
      }
    }

    if (this.afterimages.size > 0) {
      const prune = new Set<Afterimage>();
      this.afterimages.forEach((afterimage) => {
        afterimage.tick();
        if (!afterimage.alive()) {
          prune.add(afterimage);
        }
      });
      prune.forEach((afterimage) => this.afterimages.delete(afterimage));
    }
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
      this.index = 0;
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

      for (let i = 0; i < 3; ++i) {
        const blob = new Blob(0.02)
        blob.hide();
        this.args.renderingLoop.scene.add(blob);
        this.blob = blob;
        this.meshes.add(blob);
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
    this.index = -1;
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

    for (let mesh of this.meshes) {
      this.args.renderingLoop.scene.remove(mesh);
    }
    this.meshes.clear();

    this.afterimages.forEach((clazz) => {
      clazz.delete();
    });
    this.afterimages.clear();
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
