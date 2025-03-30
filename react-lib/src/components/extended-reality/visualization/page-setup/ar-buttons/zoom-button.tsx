import React from 'react';

import Button from 'react-bootstrap/Button';
import { SearchIcon } from '@primer/octicons-react';
import { useARSettingsStore } from 'react-lib/src/stores/extended-reality/ar-settings';

interface ZoomButtonArgs {}

export default function ZoomButton({}: ZoomButtonArgs) {
  const zoomEnabled = useARSettingsStore((state) => state.zoomEnabled);
  const toggleZoomEnabled = useARSettingsStore(
    (state) => state.toggleZoomEnabled
  );

  return (
    <div id="ar-zoom-container">
      <Button
        variant={zoomEnabled ? 'success' : 'primary'}
        className="half-transparent"
        onClick={toggleZoomEnabled}
      >
        <SearchIcon size="small" className="align-middle ar-button-svg" />
      </Button>
    </div>
  );
}
