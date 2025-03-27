import { Class } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import { Span } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Component from '@glimmer/component';
import { Args } from '@glimmer/component/-private/component';

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

  public accept(visitor: TraceTreeVisitor) {
    visitor.visit(this);
  }

  public get isRoot() {
    return this.parents.length == 0;
  }

  public get isLeaf() {
    return this.children.length == 0;
  }

  traceEvent(pid: number = 0, tid: number = 0): {} {
    const start = this.start;
    const end = this.end;
    return {
      name: this.id,
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
  public children: TraceNode[];
  public readonly parents: TraceNode[];
  public clean: boolean;

  constructor(root: TraceNode[] = []) {
    this.children = root;
    this.parents = [];
    this.clean = true;
  }

  public accept(visitor: TraceTreeVisitor) {
    let frontier: TraceNode[] = [];
    let visited = new Set<string>();

    let iter = (head: TraceTree | TraceNode): TraceNode | undefined => {
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

  public build(): TraceTree {
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

        if (node.end - node.start < 1) {
          tree.clean = false;
        }
      }
    });

    return tree;
  }

  public static applyDelay(tree: TraceTree, delay: number): void {
    const visitor = new TraceTreeVisitor((node: TraceNode): void => {
      node.start += node.startDelay * delay;
      node.end += node.endDelay * delay;
    });
    tree.accept(visitor);
  }

  public static calculateDelay(tree: TraceTree): void {
    /**
     * Fix zero-length events.
     */

    let leaves: TraceNode[] = [];

    // fix delay top-down
    {
      let frontier: TraceNode[] = [];
      let visited = new Set<string>();

      let iter = (head: TraceTree | TraceNode): TraceNode | undefined => {
        frontier.push(...head.children);
        // sort events according to timeline -- delays are propagated to later events, either start or end
        frontier.sort((a: TraceNode, b: TraceNode): number => {
          return a.start === b.start
            ? a.end === b.end
              ? a.id < b.id
                ? -1
                : 1
              : a.end - b.end
            : a.start - b.start;
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

      for (let head = iter(tree); head !== undefined; head = iter(head)) {
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
          head.children.forEach((node: TraceNode): void => {
            ++node.startDelay;
            ++node.endDelay;
          });
          frontier.forEach((node: TraceNode): void => {
            ++node.startDelay;
            ++node.endDelay;
          });
          ++head.endDelay;
        }

        // child starts at the same time
        head.children.forEach((child: TraceNode): void => {
          if (
            child.start + child.startDelay ===
            head!.start + head!.startDelay
          ) {
            head!.children.forEach((node: TraceNode): void => {
              ++node.startDelay;
              ++node.endDelay;
            });
            frontier.forEach((node: TraceNode): void => {
              ++node.startDelay;
              ++node.endDelay;
            });
            ++head!.endDelay;
          }
        });

        // child ends at the same time
        head.children.forEach((child: TraceNode): void => {
          if (child.end + child.endDelay === head!.end + head!.endDelay) {
            frontier.forEach((node: TraceNode): void => {
              ++node.startDelay;
              ++node.endDelay;
            });
            ++head!.endDelay;
          }
        });
      }
    }

    // fix delay bottom-up
    {
      let frontier = leaves;

      let iter = (head: TraceTree | TraceNode): TraceNode | undefined => {
        frontier.push(...head.parents);
        return frontier.shift();
      };

      for (let head = iter(tree); head !== undefined; head = iter(head)) {
        head.parents.forEach((node: TraceNode): void => {
          node.endDelay = Math.max(head!.endDelay + 1, node.endDelay);
        });
      }
    }

    tree.clean = true;
    console.log(tree);
  }
}
