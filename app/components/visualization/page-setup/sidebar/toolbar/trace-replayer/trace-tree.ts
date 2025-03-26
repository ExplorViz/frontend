import { Class } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import {
  Span,
  Trace,
} from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import { calculateDuration } from 'explorviz-frontend/utils/trace-helpers';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import { duration } from 'moment';
import { string } from 'three/examples/jsm/nodes/shadernode/ShaderNode';

export class TraceNode {
  public readonly id: string;
  public readonly clazz: Class;
  public readonly mesh: BaseMesh;
  public start: number;
  public end: number;
  public startDelay: number;
  public endDelay: number;

  public parents: TraceNode[];
  public children: TraceNode[];

  constructor(
    id: string,
    clazz: Class,
    mesh: BaseMesh,
    start: number,
    end: number
  ) {
    this.id = id;
    this.clazz = clazz;
    this.mesh = mesh;
    this.start = start;
    this.end = end;
    this.startDelay = 0;
    this.endDelay = 0;

    this.parents = [];
    this.children = [];
  }

  public get duration() {
    return this.end - this.start;
  }

  public accept(visitor: TraceTreeVisitor) {
    visitor.visit(this);
  }

  public get isRoot() {
    return this.parents.length == 0;
  }

  public get isLeaf() {
    return this.children.length == 0;
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
  public children: TraceNode[];
  public readonly parents: TraceNode[];

  constructor(root: TraceNode[] = []) {
    this.children = root;
    this.parents = [];
  }

  public accept(visitor: TraceTreeVisitor) {
    let frontier: TraceNode[] = [];
    let visited = new Set<string>();

    let iter = (
      head: TraceTree | TraceNode,
      frontier: TraceNode[]
    ): TraceNode | undefined => {
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

    for (
      let head = iter(this, frontier);
      head !== undefined;
      head = iter(head, frontier)
    ) {
      head.accept(visitor);
    }
  }
}

export class TraceTreeBuilder {
  trace: Span[];
  classMap: Map<string, Class>;
  applicationRenderer: ApplicationRenderer;

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
      if (mesh) {
        return new TraceNode(
          span.spanId,
          clazz,
          mesh,
          span.startTime,
          span.endTime
        );
      }
    }
    return undefined;
  }

  private buildTree(): TraceTree {
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

  public build(): TraceTree {
    const tree = this.buildTree();

    this.fixTrace(tree);

    const visitor = new TraceTreeVisitor((node: TraceNode): void => {
      node.start = node.start + node.startDelay;
      node.end = node.end + node.endDelay;
    });
    tree.accept(visitor);

    return tree;
  }

  private fixTrace(tree: TraceTree): void {
    /**
     * Fix zero-length events.
     */

    let leaves: TraceNode[] = [];

    // fix delay top-down
    {
      let frontier: TraceNode[] = [];
      let visited = new Set<string>();

      let iter = (
        head: TraceTree | TraceNode,
        frontier: TraceNode[]
      ): TraceNode | undefined => {
        frontier.push(...head.children);
        // sort events according to timeline -- delays are propagated to later events, either start or end
        frontier.sort((a: TraceNode, b: TraceNode): number => {
          return a.start === b.start ? a.end - b.end : a.start - b.start;
        });
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

      for (
        let head = iter(tree, frontier);
        head !== undefined;
        head = iter(head, frontier)
      ) {
        if (head.isLeaf) {
          leaves.push(head);
        } else {
          head.children.forEach((node: TraceNode) => {
            node.startDelay = head!.startDelay;
            node.endDelay = head!.endDelay;
          });
        }

        // event has no length
        if (head.start + head.startDelay === head.end + head.endDelay) {
          ++head.endDelay;
          head.children.forEach((node: TraceNode): void => {
            ++node.startDelay;
            ++node.endDelay;
          });
          frontier.forEach((node: TraceNode): void => {
            ++node.startDelay;
            ++node.endDelay;
          });
        }

        // child starts at the same time
        head.children.forEach((node: TraceNode): void => {
          if (node.start + node.startDelay === head!.start + head!.startDelay) {
            ++head!.endDelay;
            head!.children.forEach((node: TraceNode): void => {
              ++node.startDelay;
              ++node.endDelay;
            });
            frontier.forEach((node: TraceNode): void => {
              ++node.startDelay;
              ++node.endDelay;
            });
          }
        });

        // child ends at the same time
        head.children.forEach((node: TraceNode): void => {
          if (node.end + node.endDelay === head!.end + head!.endDelay) {
            ++head!.endDelay;
            frontier.forEach((node: TraceNode): void => {
              ++node.startDelay;
              ++node.endDelay;
            });
          }
        });
      }
    }

    // fix delay bottom-up
    {
      let frontier = leaves;

      let iter = (
        head: TraceTree | TraceNode,
        frontier: TraceNode[]
      ): TraceNode | undefined => {
        frontier.push(...head.parents);
        return frontier.shift();
      };

      for (
        let head = iter(tree, frontier);
        head !== undefined;
        head = iter(head, frontier)
      ) {
        head.parents.forEach((node: TraceNode): void => {
          node.endDelay = Math.max(head!.endDelay + 1, node.endDelay);
        });
      }
    }

    console.log(tree);
  }
}
