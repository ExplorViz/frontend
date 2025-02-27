import React from 'react';
import Button from 'react-bootstrap/Button';
import { SearchIcon } from '@primer/octicons-react';
import ArZoomHandler from 'react-lib/src/utils/extended-reality/ar-helpers/ar-zoom-handler';

interface ZoomButtonArgs {
  arZoomHandler: ArZoomHandler;
  handleZoomToggle(): void;
}

export default function ZoomButton({
  arZoomHandler,
  handleZoomToggle,
}: ZoomButtonArgs) {
  const buttonVariant = arZoomHandler.zoomEnabled ? 'success' : 'primary';

  return (
    <div id="ar-zoom-container">
      <Button
        variant={buttonVariant}
        className="half-transparent"
        onClick={handleZoomToggle}
      >
        <SearchIcon
          size="small"
          className="octicon align-middle ar-button-svg"
        />
      </Button>
    </div>
  );
}
