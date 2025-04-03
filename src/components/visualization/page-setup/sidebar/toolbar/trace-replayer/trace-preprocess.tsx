import React, { useState } from 'react';
import {
  TraceNode,
  TraceTree,
  TraceTreeVisitor,
} from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-tree';
import { Button } from 'react-bootstrap'; // Assuming you're using react-bootstrap for buttons
import TraceTimeline from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-timeline';

interface TracePreProcessProps {
  tree: TraceTree;
  timeline: TraceNode[];
  callback: (tree: TraceTree) => void;
}

export default function TracePreProcess({
  tree,
  timeline,
  callback,
}: TracePreProcessProps) {
  const min = 1;
  const max = 10;
  const step = 1;

  const [delay, setDelay] = useState<number>(1);
  const [working, setWorking] = useState<boolean>(false);
  const [start, setStart] = useState<number>(-Infinity);
  const [end, setEnd] = useState<number>(Infinity);

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!working) {
      const value = Number(event.target.value);
      if (!isNaN(value)) {
        setDelay(Math.min(Math.max(value, min), max));
      }
    }
  };

  // get value() {
  //   return this.delay;
  // }

  // set value(value: number) {
  //   this.delay = Math.min(Math.max(value, this.min), this.max);
  // }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!working) {
      const value = Number(event.target.value);
      if (!isNaN(value)) {
        setDelay(Math.min(Math.max(value, min), max));
      }
    }
  };

  const apply = () => {
    if (delay > 0) {
      setWorking(true);
      pruneTree();

      const events: any[] = [];
      let pid = 0;
      const visitor = new TraceTreeVisitor((node: TraceNode): void => {
        events.push(node.traceEvent(pid));
      });

      tree.accept(visitor);
      calculateDelay();
      applyDelay();

      ++pid;
      tree.accept(visitor);
      setWorking(false);
    }

    callback(tree);
  };

  const ignore = () => {
    callback(tree);
  };

  const applyDelay = (): void => {
    const visitor = new TraceTreeVisitor((node: TraceNode): void => {
      node.start += node.startDelay * delay;
      node.end += node.endDelay * delay;
    });
    tree.accept(visitor);
  };

  const pruneTree = (): void => {
    const visitor = new TraceTreeVisitor((node: TraceNode): void => {
      node.children = node.children.filter(
        (child) => child.start >= start && child.end <= end
      );
    });
    tree.accept(visitor);
  };

  const calculateDelay = (): void => {
    const leaves: TraceNode[] = [];
    const frontier: TraceNode[] = [];
    const visited = new Set<string>();

    const iter = (head: TraceTree | TraceNode): TraceNode | undefined => {
      frontier.push(...head.children);
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
          node.startDelay = head.startDelay;
          node.endDelay = head.endDelay;
        });
      }

      const start = head.start + head.startDelay * delay;
      const end = head.end + head.endDelay * delay;

      if (end - start < delay) {
        head.children.forEach((node: TraceNode): void => {
          ++node.startDelay;
          ++node.endDelay;
        });
        ++head.endDelay;
      }

      head.children.forEach((child: TraceNode): void => {
        const start = head.start + head.startDelay * delay;
        const end = child.start + child.startDelay * delay;
        if (end - start < delay) {
          head.children.forEach((node: TraceNode): void => {
            ++node.startDelay;
            ++node.endDelay;
          });
          ++head.endDelay;
        }
      });

      head.children.forEach((child: TraceNode): void => {
        const start = head.end + head.endDelay * delay;
        const end = child.end + child.endDelay * delay;
        if (end - start < delay) {
          ++head.endDelay;
        }
      });
    }

    const iterBottomUp = (
      head: TraceTree | TraceNode
    ): TraceNode | undefined => {
      frontier.push(...head.parents);
      return frontier.shift();
    };

    for (
      let head = iterBottomUp(tree);
      head !== undefined;
      head = iterBottomUp(head)
    ) {
      head.parents.forEach((parent: TraceNode): void => {
        parent.endDelay = Math.max(head.endDelay + 1, parent.endDelay);
      });
    }
  };

  return (
    <div>
      <div className="alert alert-danger" role="alert">
        Detected issues with trace!
      </div>
      <div className="mb-3">
        <TraceTimeline
          timeline={timeline}
          select={true}
          cursor={false}
          selection={(start, end) => {
            if (!working) {
              setStart(start);
              setEnd(end);
            }
          }}
          observer={[]} // Provide the observer as needed
          callback={() => {}} // Provide the callback as needed
        />
      </div>

      <div className="mb-3">
        <div className="range-slider--container">
          <div style={{ width: '100%' }}>
            <label htmlFor="trace-delay-selector">Event Delay</label>
            <input
              id="trace-delay-slider"
              value={delay}
              min={min}
              max={max}
              type="range"
              step={step}
              className="form-control mr-2"
              onChange={handleChange}
              onInput={handleInput}
            />
            <div className="range-slider--values">
              <span>{min}</span>
              <span style={{ fontWeight: 'bold' }}>{delay}</span>
              <span>{max}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-3">
        <Button
          className="btn-outline-secondary"
          title="Ignore"
          onClick={apply}
          type="button"
        >
          Apply
        </Button>
        <Button
          className="btn-danger"
          title="Ignore"
          onClick={ignore}
          type="button"
        >
          Ignore
        </Button>
      </div>
    </div>
  );
}
