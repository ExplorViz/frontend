import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

interface Args {
  callback(speed: number): void;
}

export default class TraceSpeed extends Component<Args> {
  readonly min = 0.1;
  readonly max = 20;
  readonly step = 0.1;

  @action
  input(_: any, htmlInputElement: any) {
    const value = htmlInputElement.target.value;
    if (value) {
      this.value = Number(value);
    }
  }

  @action
  change(event: any) {
    this.value = Number(event.target.value);
  }

  @tracked
  speed: number = 5;

  get value() {
    return this.speed;
  }

  private set value(value: number) {
    this.speed = Math.min(Math.max(value, this.min), this.max);
    this.args.callback(this.speed);
  }
}
