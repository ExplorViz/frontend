import { ArrowRightIcon } from '@primer/octicons-react';
import { use } from 'react';
import Button from 'react-bootstrap/Button';
import { EditingContext } from './editing-context';

export function EditingForwardButton() {
  const { canGoForward, goForward } = use(EditingContext);
  return (
    <Button
      title="Undo"
      variant="outline-dark"
      onClick={() => goForward()}
      disabled={!canGoForward}
    >
      <ArrowRightIcon size="small" />
    </Button>
  );
}
