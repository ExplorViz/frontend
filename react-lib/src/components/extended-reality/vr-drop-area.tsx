import React, { useState, ReactNode } from 'react';

interface VrDropAreaArgs {
  onDropFiles(files: File[]): void;
  children?: ReactNode;
}

export default function VrDropArea(args: VrDropAreaArgs) {
  const [isDraggedOver, setIsDraggedOver] = useState<boolean>(false);

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggedOver(false);

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

    if (files.length > 0) args.onDropFiles(files);
  };

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggedOver(true);
  };

  const onDragLeave = () => {
    setIsDraggedOver(false);
  };

  return (
    <div
      id="VrDropArea"
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      {args.children}

      {isDraggedOver && (
        <div className="vr-drop-area-background">
          <div className="vr-drop-area-border">
            <div className="vr-drop-area-text">
              Drop texture file to set background.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
