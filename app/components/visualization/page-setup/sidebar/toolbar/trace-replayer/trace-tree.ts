import { Class } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import { Span } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';

export class TraceNode {
  readonly id: string;
  readonly clazz: Class;
  readonly name: string;
  readonly mesh: BaseMesh;
  start: number;
  end: number;
  startDelay: number;
  endDelay: number;

  parents: TraceNode[];
  children: TraceNode[];

  constructor(
    id: string,
    clazz: Class,
    name: string,
    mesh: BaseMesh,
    start: number,
    end: number
  ) {
    this.id = id;
    this.clazz = clazz;
    this.name = name;
    this.mesh = mesh;
    this.start = start;
    this.end = end;
    this.startDelay = 0;
    this.endDelay = 0;

    this.parents = [];
    this.children = [];
  }

  accept(visitor: TraceTreeVisitor) {
    visitor.visit(this);
  }

  get isRoot() {
    return this.parents.length == 0;
  }

  get isLeaf() {
    return this.children.length == 0;
  }

  traceEvent(pid: number = 0, tid: number = 0): {} {
    const start = this.start;
    const end = this.end;
    return {
      name: this.name,
      cat: 'PERF',
      ph: 'X',
      pid: pid,
      tid: tid,
      ts: start,
      dur: end - start,
    };
  }
}

export class TraceTreeVisitor {
  visit: (node: TraceNode) => void;

  constructor(visit: (node: TraceNode) => void) {
    this.visit = (node: TraceNode): void => {
      visit(node);
    };
  }
}

export class TraceTree {
  children: TraceNode[];
  readonly parents: TraceNode[];

  constructor(root: TraceNode[] = []) {
    this.children = root;
    this.parents = [];
  }

  accept(visitor: TraceTreeVisitor) {
    const frontier: TraceNode[] = [];
    const visited = new Set<string>();

    const iter = (head: TraceTree | TraceNode): TraceNode | undefined => {
      frontier.push(...head.children);
      const next = frontier.shift();
      if (next !== undefined) {
        if (visited.has(next.id)) {
          console.error(`cycle detected in ${next.id}`);
          return undefined;
        }
        visited.add(next.id);
      }
      return next;
    };

    for (let head = iter(this); head !== undefined; head = iter(head)) {
      head.accept(visitor);
    }
  }
}

export class TraceTreeBuilder {
  private readonly trace: Span[];
  private readonly classMap: Map<string, Class>;
  private readonly applicationRenderer: ApplicationRenderer;

  constructor(
    trace: Span[],
    classMap: Map<string, Class>,
    applicationRenderer: ApplicationRenderer
  ) {
    this.trace = trace;
    this.classMap = classMap;
    this.applicationRenderer = applicationRenderer;
  }

  private buildNode(span: Span): TraceNode | undefined {
    const clazz = this.classMap.get(span.methodHash);
    if (clazz) {
      const mesh = this.applicationRenderer.getMeshById(clazz.id);
      const name = clazz.methods.find(
        (method) => method.methodHash === span.methodHash
      )!.name;
      if (mesh) {
        return new TraceNode(
          span.spanId,
          clazz,
          name,
          mesh,
          span.startTime,
          span.endTime
        );
      }
    }
    return undefined;
  }

  build(): TraceTree {
    const tree = new TraceTree();
    const map = new Map<string, TraceNode>();
    let global: number = Infinity;

    // build shallow nodes
    this.trace.forEach((span) => {
      const node = this.buildNode(span);
      if (node) {
        if (map.has(node.id)) {
          console.error(`duplicate node ${node.id}`);
        } else {
          map.set(node.id, node);
          global = Math.min(global, node.start);
        }
      }
    });

    // build tree
    this.trace.forEach((span) => {
      const node = map.get(span.spanId);
      if (node) {
        const parent = map.get(span.parentSpanId);

        if (parent) {
          parent.children.push(node);
          node.parents.push(parent);
        } else {
          tree.children.push(node);
        }

        node.start -= global;
        node.end -= global;
      }
    });

    return tree;
  }
}
