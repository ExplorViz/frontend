import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { Class } from 'explorviz-frontend/utils/landscape-schemes/structure-data';

type TimeUnit = 'ns' | 'us' | 'ms' | 's';

interface Args {
  readonly operationName: string;
  readonly sourceClass?: Class;
  readonly targetClass: Class;
  readonly sourceApplicationName?: string;
  readonly targetApplicationName: string;
  readonly spanStartTime: number;
  readonly spanEndTime: number;
  readonly start: number;
  readonly end: number;
  readonly duration: number;
}

export default class TraceStepDetails extends Component<Args> {
  @tracked
  unit: TimeUnit = 'ns';

  @action
  toggleUnit() {
    if (this.unit === 'ns') {
      this.unit = 'us';
    } else if (this.unit === 'us') {
      this.unit = 'ms';
    } else if (this.unit === 'ms') {
      this.unit = 's';
    } else if (this.unit === 's') {
      this.unit = 'ns';
    }
  }
}
