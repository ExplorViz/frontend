import {
  TraceNode,
  TraceTree,
  TraceTreeBuilder,
  TraceTreeVisitor,
} from 'explorviz-frontend/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-tree';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { Trace } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';

interface Args {
  readonly tree: TraceTree;

  callback(): void;
}

export default class Preprocess extends Component<Args> {
  @tracked
  public sliderDelay: number = 1;

  @action
  inputDelay(_: any, htmlInputElement: any) {
    if (!this.working) {
      const newValue = htmlInputElement.target.value;
      if (newValue) {
        this.sliderDelay = Number(newValue);
      }
    }
  }

  @action
  changeDelay(event: any) {
    if (!this.working) {
      this.sliderDelay = Number(event.target.value);
    }
  }

  @tracked
  public working: boolean = false;

  @action
  apply() {
    if (this.sliderDelay > 0) {
      this.working = true;

      const events: {}[] = [];
      let pid = 0;
      const visitor = new TraceTreeVisitor((node: TraceNode): void => {
        events.push(node.traceEvent(pid));
      });

      this.args.tree.accept(visitor);

      TraceTreeBuilder.calculateDelay(this.args.tree);
      TraceTreeBuilder.applyDelay(this.args.tree, this.sliderDelay);

      ++pid;
      this.args.tree.accept(visitor);

      const traceEvents = {
        traceEvents: events,
        displayTimeUnit: 'us',
        systemTraceEvents: 'SystemTraceData',
      };

      console.log(traceEvents);

      this.working = false;
    }
    this.args.callback();
  }

  @action
  ignore() {
    this.args.callback();
  }
}
