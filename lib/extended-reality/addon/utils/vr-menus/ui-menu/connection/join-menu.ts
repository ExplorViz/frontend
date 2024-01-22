import RoomService from 'collaborative-mode/services/room-service';
import TextItem from '../../items/text-item';
import TextbuttonItem from '../../items/textbutton-item';
import TitleItem from '../../items/title-item';
import ConnectionBaseMenu, { ConnectionBaseMenuArgs } from './base';
import { RoomListRecord } from 'collaborative-mode/utils/room-payload/receivable/room-list';

/**
 * Time in seconds before the new room list should be fetched.
 */
const REFRESH_TIMEOUT = 3.0;

export type JoinMenuArgs = ConnectionBaseMenuArgs & {
  roomService: RoomService;
};

export default class JoinMenu extends ConnectionBaseMenu {
  private roomService: RoomService;

  private refreshTimeout: number;

  constructor({ roomService, ...args }: JoinMenuArgs) {
    super(args);
    this.roomService = roomService;
    this.refreshTimeout = 0;

    this.drawLoadingScreen();
  }

  private drawLoadingScreen() {
    this.items.clear();

    // Draw loading screen.
    const title = new TitleItem({
      text: 'Loading Rooms...',
      position: { x: 256, y: 20 },
    });
    this.items.push(title);

    this.redrawMenu();
  }

  private async drawRoomList(rooms: RoomListRecord[]) {
    this.items.clear();

    const title = new TitleItem({
      text: `Join Room (${rooms.length})`,
      position: { x: 256, y: 20 },
    });
    this.items.push(title);

    // Draw one button for each room.
    const yOffset = 60;
    let yPos = 50 + yOffset;
    rooms.forEach((room) => {
      const roomButton = new TextbuttonItem({
        text: room.roomName,
        position: { x: 100, y: yPos },
        width: 316,
        height: 50,
        fontSize: 28,
        onTriggerDown: () => this.collaborationSession.joinRoom(room.roomId),
      });
      this.items.push(roomButton);
      this.thumbpadTargets.push(roomButton);
      yPos += yOffset;
    });
    this.redrawMenu();
  }

  private drawErrorMessage(msg: string) {
    this.items.clear();

    // Draw loading screen.
    const title = new TitleItem({
      text: 'Error',
      position: { x: 256, y: 20 },
    });
    this.items.push(title);

    const text = new TextItem({
      text: msg,
      color: '#ffffff',
      fontSize: 20,
      alignment: 'center',
      position: { x: 256, y: 100 },
    });
    this.items.push(text);

    const retryButton = new TextbuttonItem({
      text: 'Retry',
      position: { x: 100, y: 186 },
      width: 316,
      height: 50,
      fontSize: 28,
      onTriggerDown: () => {
        this.drawLoadingScreen();
        this.loadAndDrawRoomList();
      },
    });
    this.items.push(retryButton);
    this.thumbpadTargets.push(retryButton);

    this.redrawMenu();
  }

  private async loadAndDrawRoomList() {
    try {
      const rooms = await this.roomService.listRooms();
      this.drawRoomList(rooms);
      this.refreshTimeout = REFRESH_TIMEOUT;
    } catch (e) {
      this.drawErrorMessage(e);
    }
  }

  onOpenMenu() {
    super.onOpenMenu();
    this.loadAndDrawRoomList();
  }

  onUpdateMenu(delta: number) {
    super.onUpdateMenu(delta);

    // Refesh room list after timeout.
    if (this.refreshTimeout > 0) {
      this.refreshTimeout -= delta;
      if (this.refreshTimeout <= 0) {
        this.refreshTimeout = 0;
        this.loadAndDrawRoomList();
      }
    }
  }
}
