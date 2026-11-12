// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import AnnotationCoordinator from '../src/components/visualization/rendering/annotations/annotation-coordinator';
import { useAnnotationHandlerStore } from '../src/stores/annotation-handler';
import { removeAnnotation, useAnnotations } from '../src/utils/collaboration/annotations';
import '../src/utils/collaboration/capabilities';
import { useRoomConnectionStore } from '../src/utils/collaboration/room-connection';
import { fakeCollaborationService as service } from './fake-collaboration-service';
import './setup-dom';

vi.mock('@colyseus/sdk', async () => (await import('./fake-collaboration-service')).fakeColyseusSdk());

beforeEach(() => {
  service.reset();
  useRoomConnectionStore.setState(useRoomConnectionStore.getInitialState(), true);
  useAnnotationHandlerStore.setState(useAnnotationHandlerStore.getInitialState(), true);
});

function ShownAnnotation() {
  const [annotation] = useAnnotations().annotationData;
  return annotation ? <AnnotationCoordinator annotationData={annotation} removeAnnotation={removeAnnotation} /> : null;
}

it('shows the creator and the last editor, has no share button, and sends one save of what was typed', async () => {
  const room = service.openRoom('K7XQ2M', 'Ada');
  await act(() => useRoomConnectionStore.getState().joinRoom('K7XQ2M', 'Grace'));
  room.update(() => room.putAnnotation({ id: 1, entityId: 'class-a', title: 'Draft', creatorName: 'Ada' }));
  const [client] = [...room.clients.values()].slice(-1);
  render(<ShownAnnotation />);

  expect(screen.getByText('Creator: Ada')).toBeInTheDocument();
  expect(screen.getByText('Last change by Ada')).toBeInTheDocument();
  expect(document.querySelector('.annotation-share-button')).toBeNull();

  fireEvent.click(screen.getByText('Edit Annotation'));
  fireEvent.change(screen.getByPlaceholderText('Annotation Title'), { target: { value: 'Hot' } });
  fireEvent.change(screen.getByPlaceholderText('Annotation Title'), { target: { value: 'Hot spot' } });
  expect(client.sent).toEqual([]);

  fireEvent.click(screen.getByText('Update Annotation'));
  expect(client.sent).toEqual([{ type: 'annotationEdit', payload: { id: 1, title: 'Hot spot', text: '' } }]);

  room.handleMessages();
  expect(screen.getByText('Hot spot')).toBeInTheDocument();
  expect(screen.getByText('Last change by Grace')).toBeInTheDocument();
});
