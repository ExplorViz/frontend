import { Class } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import { Span } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import { calculateDuration } from 'explorviz-frontend/utils/trace-helpers';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';

export class TraceNode {
  public clazz: Class;
  public mesh: BaseMesh;
  public duration: number;

  public parents: TraceNode[];
  public children: TraceNode[];

  constructor(clazz: Class, mesh: BaseMesh, duration: number) {
    this.clazz = clazz;
    this.mesh = mesh;
    this.duration = duration;

    this.parents = [];
    this.children = [];
  }

  public accept(visitor: TraceNodeVisitor) {
    visitor.visit(this);
  }

  public get isRoot() {
    return this.parents.length == 0;
  }

  public get isLeaf() {
    return this.children.length == 0;
  }
}

export class TraceNodeVisitor {
  visit: (node: TraceNode) => void;

  constructor(visit: (node: TraceNode) => void) {
    this.visit = (node: TraceNode): void => {
      visit(node);
    };
  }
}

export class TraceTreeVisitor extends TraceNodeVisitor {
  constructor(visit: (node: TraceNode) => void) {
    super((node: TraceNode): void => {
      visit(node);
      node.children.forEach((node: TraceNode) => {
        node.accept(this);
      });
    });
  }
}

export class TraceTree {
  public root: TraceNode[];

  constructor() {
    this.root = [];
  }

  public accept(visitor: TraceNodeVisitor) {
    this.root.forEach((node: TraceNode): void => {
      node.accept(visitor);
    });
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
        // TODO: Implement recursive build, when Span is a tree structure / multiple (parallel) traces.
        return new TraceNode(clazz, mesh, calculateDuration(span));
      }
    }
    return undefined;
  }

  public build(): TraceTree {
    const tree = new TraceTree();
    let parent: TraceNode | undefined = undefined;
    let head = tree.root;

    this.trace.forEach((span) => {
      const node = this.buildNode(span);
      if (node) {
        if (parent) {
          node.parents.push(parent);
        }
        head.push(node);
        head = node.children;
        parent = node;
      }
    });

    return tree;
  }
}
