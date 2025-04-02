import {
  TraceNode,
  TraceTree,
  TraceTreeVisitor,
} from 'explorviz-frontend/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-tree';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

interface Args {
  readonly tree: TraceTree;
  readonly timeline: TraceNode[];

  callback(tree: TraceTree): void;
}

export default class Preprocess extends Component<Args> {
  readonly min = 1;
  readonly max = 10;
  readonly step = 1;

  @tracked
  delay: number = 1;

  @action
  input(_: any, htmlInputElement: any) {
    if (!this.working) {
      const value = htmlInputElement.target.value;
      if (value) {
        this.value = Number(value);
      }
    }
  }

  @action
  change(event: any) {
    if (!this.working) {
      this.value = Number(event.target.value);
    }
  }

  get value() {
    return this.delay;
  }

  set value(value: number) {
    this.delay = Math.min(Math.max(value, this.min), this.max);
  }

  @tracked
  working: boolean = false;

  @action
  apply() {
    if (this.delay > 0) {
      this.working = true;

      // this.scaleTree()
      this.pruneTree();

      const events: any[] = [];
      let pid = 0;
      const visitor = new TraceTreeVisitor((node: TraceNode): void => {
        events.push(node.traceEvent(pid));
      });

      this.args.tree.accept(visitor);

      this.calculateDelay();
      this.applyDelay();

      ++pid;
      this.args.tree.accept(visitor);

      this.working = false;
    }

    this.args.callback(this.args.tree);
  }

  @action
  ignore() {
    this.args.callback(this.args.tree);
  }

  private applyDelay(): void {
    const visitor = new TraceTreeVisitor((node: TraceNode): void => {
      node.start += node.startDelay * this.delay;
      node.end += node.endDelay * this.delay;
    });
    this.args.tree.accept(visitor);
  }

  start: number = -Infinity;
  end: number = Infinity;

  observer: ((cursor: number) => void)[] = [];

  callbackSelection = (start: number, end: number) => {
    if (!this.working) {
      this.start = start;
      this.end = end;
    }
  };

  callbackCursor = () => {};

  // private scaleTree(): void {
  //   const visitor = new TraceTreeVisitor((node: TraceNode): void => {
  //     node.start = node.start / 1_000_000;
  //     node.end = node.end / 1_000_000;
  //   });
  //   this.args.tree.accept(visitor);
  // }

  private pruneTree(): void {
    const visitor = new TraceTreeVisitor((node: TraceNode): void => {
      node.children = node.children.filter(
        (node) => node.start >= this.start && node.end <= this.end
      );
    });
    this.args.tree.accept(visitor);
  }

  private calculateDelay(): void {
    /**
     * Fix zero-length events.
     */

    const leaves: TraceNode[] = [];

    // fix delay top-down
    {
      const frontier: TraceNode[] = [];
      const visited = new Set<string>();

      const iter = (head: TraceTree | TraceNode): TraceNode | undefined => {
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

      for (
        let head = iter(this.args.tree);
        head !== undefined;
        head = iter(head)
      ) {
        if (head.isLeaf) {
          leaves.push(head);
        } else {
          head.children.forEach((node: TraceNode) => {
            node.startDelay = head!.startDelay;
            node.endDelay = head!.endDelay;
          });
        }

        const start = head.start + head.startDelay * this.delay;
        const end = head.end + head.endDelay * this.delay;
        // event has no length
        if (end - start < this.delay) {
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
          const start = head!.start + head!.startDelay * this.delay;
          const end = child.start + child.startDelay * this.delay;
          if (end - start < this.delay) {
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
          const start = head!.end + head!.endDelay * this.delay;
          const end = child.end + child.endDelay * this.delay;
          if (end - start < this.delay) {
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
      const frontier = leaves;

      const iter = (head: TraceTree | TraceNode): TraceNode | undefined => {
        frontier.push(...head.parents);
        return frontier.shift();
      };

      for (
        let head = iter(this.args.tree);
        head !== undefined;
        head = iter(head)
      ) {
        head.parents.forEach((parent: TraceNode): void => {
          parent.endDelay = Math.max(head!.endDelay + 1, parent.endDelay);
        });
      }
    }
  }
}
