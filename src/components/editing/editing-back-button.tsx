import { ArrowLeftIcon } from '@primer/octicons-react';
import Button from 'react-bootstrap/Button';
import { use } from 'react';
import { EditingContext } from './editing-context';

export function EditingBackButton() {
  const { canGoBack, goBack } = use(EditingContext);
  return (
    <Button
      title="Undo"
      variant="outline-dark"
      onClick={() => goBack()}
      disabled={!canGoBack}
    >
      <ArrowLeftIcon size="small" />
    </Button>
  );
}
