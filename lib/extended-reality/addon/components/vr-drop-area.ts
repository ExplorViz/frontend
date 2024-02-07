import { action } from '@ember/object';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

interface VrDropAreaArgs {
  onDropFiles(files: File[]): void;
}

export default class VrDropArea extends Component<VrDropAreaArgs> {
  @tracked
  isDraggedOver: boolean = false;

  @action
  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDraggedOver = false;

    const files = [];
    if (event.dataTransfer?.items) {
      // Use DataTransferItemList interface to access the files.
      for (let i = 0; i < event.dataTransfer.items.length; i++) {
        if (event.dataTransfer.items[i].kind === 'file') {
          const file = event.dataTransfer.items[i].getAsFile();
          if (file) files.push(file);
        }
      }
    } else if (event.dataTransfer?.files) {
      // Use DataTransfer interface to access the files.
      for (let i = 0; i < event.dataTransfer.files.length; i++) {
        files.push(event.dataTransfer.files[i]);
      }
    }

    if (files.length > 0) this.args.onDropFiles(files);
  }

  @action
  onDragover(event: DragEvent) {
    event.preventDefault();
    this.isDraggedOver = true;
  }

  @action
  onDragleave() {
    this.isDraggedOver = false;
  }
}
