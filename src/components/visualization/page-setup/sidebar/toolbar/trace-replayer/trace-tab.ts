import { TraceNode } from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-tree';
import { Application } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';

export class TraceTab {
  readonly style: string;

  active: boolean = false;

  id: string;
  label: string;
  name: string;
  caller: string;
  callee: string;
  origin: string;
  target: string;
  start: number;
  end: number;
  duration: number;

  callback: () => void;

  constructor(
    caller: TraceNode,
    callee: TraceNode,
    origin: Application | undefined,
    target: Application | undefined,
    color: THREE.Color,
    callback: () => void
  ) {
    this.id = callee.id;
    this.label = this.id.substring(0, 4);
    this.name = callee.name;
    this.caller = caller.sourceClass?.name ?? '';
    this.callee = callee.targetClass.name;
    this.origin = origin !== undefined ? origin.name : '';
    this.target = target !== undefined ? target.name : '';
    this.start = callee.start;
    this.end = callee.end;
    this.duration = this.end - this.start;
    this.style = `color: ${color.offsetHSL(0, 0, -0.25).getStyle()}`;
    this.callback = callback;
  }

  enable = () => {
    this.callback();
    this.active = true;
  };
}
