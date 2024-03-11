import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { Class } from 'explorviz-frontend/utils/landscape-schemes/structure-data';

interface Args {
  readonly classes: Class[];
  readonly visualizationPaused: boolean;
  update(newValue: number): void;
  pauseVisualizationUpdating(): void;
}

export default class ClassMethodFiltering extends Component<Args> {
  @tracked
  selected: number | null = null;

  private min: number = Number.MAX_VALUE;
  private max: number = -1;

  get classes() {
    if (!this.args.visualizationPaused) {
      this.selected = null;
    }

    if (!this.selected) {
      const classes = this.args.classes;

      for (const clazz of classes) {
        const methodCount = clazz.methods.length;

        this.min = methodCount <= this.min ? methodCount : this.min;
        this.max = methodCount >= this.max ? methodCount : this.max;
      }
    }

    let selected = this.min;

    if (this.selected) {
      selected = this.selected;
    }

    return { min: this.min, max: this.max, selected: selected };
  }

  @action
  onInput(_: any, htmlInputElement: any) {
    const newValue = htmlInputElement.target.value;
    if (newValue) {
      this.args.pauseVisualizationUpdating();
      this.selected = Number(newValue);
    }
  }

  @action
  onChange(event: any) {
    this.args.pauseVisualizationUpdating();
    this.selected = Number(event.target.value);
    this.args.update(this.selected);
  }
}
