import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { Class } from 'some-react-lib/src/utils/landscape-schemes/structure-data';
import { Span } from 'some-react-lib/src/utils/landscape-schemes/dynamic/dynamic-data';

type TimeUnit = 'ns' | 'ms' | 's';

interface Args {
  readonly operationName: string;
  readonly sourceClass?: Class;
  readonly targetClass: Class;
  readonly sourceApplicationName?: string;
  readonly targetApplicationName: string;
  readonly spanStartTime: number;
  readonly spanEndTime: number;
  moveCameraTo(emberModel: Class | Span): void;
}

export default class TraceStepDetails extends Component<Args> {
  @tracked
  timeUnit: TimeUnit = 'ns';

  get spanDuration() {
    const { spanStartTime, spanEndTime } = this.args;
    return spanEndTime - spanStartTime;
  }

  @action
  toggleSpanDurationTimeUnit() {
    if (this.timeUnit === 'ns') {
      this.timeUnit = 'ms';
    } else if (this.timeUnit === 'ms') {
      this.timeUnit = 's';
    } else if (this.timeUnit === 's') {
      this.timeUnit = 'ns';
    }
  }
}
