import { Span } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import { Class } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';

export class TraceNode {
  readonly id: string;
  readonly name: string;
  sourceClass?: Class | null;
  targetClass: Class;
  start: number;
  end: number;
  startDelay: number;
  endDelay: number;

  parent: TraceNode | null;
  children: TraceNode[];

  constructor(
    id: string,
    name: string,
    targetClass: Class,
    start: number,
    end: number
  ) {
    this.id = id;
    this.name = name;
    this.targetClass = targetClass;
    this.start = start;
    this.end = end;
    this.startDelay = 0;
    this.endDelay = 0;

    this.parent = null;
    this.children = [];
  }

  accept(visitor: TraceTreeVisitor) {
    visitor.visit(this);
  }

  setParent(parent: TraceNode | null) {
    this.parent = parent;
    if (parent) {
      this.sourceClass = parent.targetClass;
    }
  }

  get isRoot() {
    return this.parent !== null;
  }

  get isLeaf() {
    return this.children.length == 0;
  }

  traceEvent(pid: number = 0, tid: number = 0): any {
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

  constructor(trace: Span[], classMap: Map<string, Class>) {
    this.trace = trace;
    this.classMap = classMap;
  }

  private buildNode(span: Span): TraceNode | undefined {
    const targetClass = this.classMap.get(span.methodHash);
    if (targetClass) {
      const name = targetClass.methods.find(
        (method) => method.methodHash === span.methodHash
      )!.name;
      const node = new TraceNode(
        span.spanId,
        name,
        targetClass,
        span.startTime,
        span.endTime
      );
      node.targetClass = targetClass;
      return node;
    }
    return undefined;
  }

  build(): TraceTree {
    const tree = new TraceTree();
    const map = new Map<string, TraceNode>();
    let global: number = Infinity;

    // Build all nodes without relationships first
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

    // Build tree from created nodes
    this.trace.forEach((span) => {
      const node = map.get(span.spanId);
      if (node) {
        const parent = map.get(span.parentSpanId);

        if (parent) {
          parent.children.push(node);
          node.setParent(parent);
          node.sourceClass = parent.targetClass;
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
