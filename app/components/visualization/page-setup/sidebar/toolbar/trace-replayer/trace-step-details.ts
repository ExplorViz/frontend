import Component from '@glimmer/component';
import { Class } from 'explorviz-frontend/utils/landscape-schemes/structure-data';

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
  readonly unit: string;
}

export default class TraceStepDetails extends Component<Args> {}
