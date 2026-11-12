// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Popups from '../src/components/visualization/rendering/popups/popups';
import { usePopupHandlerStore } from '../src/stores/popup-handler';
import { useModelStore } from '../src/stores/repos/model-repository';
import '../src/utils/collaboration/capabilities';
import { addPopup } from '../src/utils/collaboration/popups';
import { useRoomConnectionStore } from '../src/utils/collaboration/room-connection';
import { fakeCollaborationService as service } from './fake-collaboration-service';
import { building, city, district } from './fixtures/landscape';
import './setup-dom';

vi.mock('@colyseus/sdk', async () => (await import('./fake-collaboration-service')).fakeColyseusSdk());

beforeEach(() => {
  service.reset();
  useRoomConnectionStore.setState(useRoomConnectionStore.getInitialState(), true);
  usePopupHandlerStore.setState(usePopupHandlerStore.getInitialState(), true);
  useModelStore
    .getState()
    .setAllModels({ cities: [city], districts: [district], buildings: [], buildingCommunications: [] });
});

const renderPopups = () => render(<Popups landscapeData={{} as any} />);

describe('the popup share button', () => {
  it('is not offered alone', () => {
    act(() => addPopup({ entityId: 'district' }));
    renderPopups();

    expect(screen.queryByRole('button', { name: 'Share popup with the room' })).not.toBeInTheDocument();
  });

  it('shares the popup with the room, which then shows who shared it', async () => {
    const room = service.openRoom('K7XQ2M', 'Ada');
    await act(() => useRoomConnectionStore.getState().joinRoom('K7XQ2M', 'Grace'));
    act(() => addPopup({ entityId: 'district' }));
    renderPopups();

    await userEvent.click(screen.getByRole('button', { name: 'Share popup with the room' }));
    room.handleMessages();

    expect(screen.getByRole('button', { name: 'Shared by Grace' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Share popup with the room' })).not.toBeInTheDocument();
  });
});
