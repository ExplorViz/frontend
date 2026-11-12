import { Decoder, Encoder, schema, t } from '@colyseus/schema';
import { act } from '@testing-library/react';

/*
 * A stand-in for the collaboration service, at the boundary of `@colyseus/sdk`.
 * Install it in a test file with
 *
 *   vi.mock('@colyseus/sdk', async () => (await import('./fake-collaboration-service')).fakeColyseusSdk());
 *
 * and reset `fakeCollaborationService` before each test.
 *
 * The rules of a Room (codes, colors, Host, limits) belong to the service and
 * are tested there; this fake only seats people and lets a test change the
 * Room's state and see the client side follow, as the real SDK would.
 *
 * The state schema mirrors the service's `src/contract/state.ts`. Extend both
 * together; the generated `CollaborationState` type checks the snapshot side.
 */

const Participant = schema(
  {
    name: t.string(),
    color: t.string(),
    muted: t.boolean().default(false),
    spectating: t.string().default(''),
    immersiveEntityId: t.string().default(''),
  },
  'Participant'
);
const ChatEntry = schema(
  {
    id: t.string(),
    kind: t.string(),
    authorId: t.string(),
    authorName: t.string(),
    authorColor: t.string(),
    text: t.string(),
    time: t.number(),
  },
  'ChatEntry'
);
const CollaborationState = schema(
  { participants: t.map(Participant), hostId: t.string(), chat: t.array(ChatEntry) },
  'CollaborationState'
);
type ServerState = InstanceType<typeof CollaborationState>;

/**
 * How the fake Room answers a `request`: return a refusal reason to reject
 * it (as the service's `ctx.reject(reason)` does), or nothing to resolve it.
 */
export type FakeRequestHandler = (sessionId: string, payload: any) => string | void;

/** A refusal as the SDK reports it: an error with the service's error code. */
export class FakeServerError extends Error {
  constructor(
    readonly code: number,
    message: string
  ) {
    super(message);
    this.name = 'ServerError';
  }
}

const PALETTE = ['#e6194b', '#3cb44b', '#4363d8', '#f58231'];

/** The client side of one connection, shaped like the SDK's `Room` as far as the frontend uses it. */
export class FakeClientRoom {
  private readonly decoder = new Decoder(new CollaborationState());
  private readonly leaveListeners: ((code: number) => void)[] = [];
  private readonly messageListeners = new Map<string, ((payload: any) => void)[]>();
  readonly serializer = { decoder: this.decoder };
  readonly sent: { type: string; payload: unknown }[] = [];

  constructor(
    readonly server: FakeServerRoom,
    readonly sessionId: string
  ) {}

  get roomId() {
    return this.server.code;
  }

  get state() {
    return this.decoder.state;
  }

  receive(bytes: Uint8Array) {
    this.decoder.decode(bytes);
  }

  onLeave(listener: (code: number) => void) {
    this.leaveListeners.push(listener);
    return () => this.leaveListeners.splice(this.leaveListeners.indexOf(listener), 1);
  }

  send(type: string, payload?: unknown) {
    this.sent.push({ type, payload });
  }

  onMessage(type: string, listener: (payload: any) => void) {
    const listeners = this.messageListeners.get(type) ?? [];
    this.messageListeners.set(type, [...listeners, listener]);
    return () => {
      this.messageListeners.set(
        type,
        (this.messageListeners.get(type) ?? []).filter((l) => l !== listener)
      );
    };
  }

  /** The service sends this client a message. */
  deliver(type: string, payload: unknown) {
    for (const listener of this.messageListeners.get(type) ?? []) listener(payload);
  }

  /** Recorded in `sent` like `send`; answered by the handler the test gave `FakeServerRoom.answer`. */
  async request(type: string, payload?: unknown) {
    this.sent.push({ type, payload });
    const reason = this.server.handle(this.sessionId, type, payload);
    if (reason !== undefined) throw Object.assign(new Error('request rejected'), { name: 'rejected', reason });
  }

  async leave(consented = true) {
    this.server.remove(this.sessionId);
    this.closed(consented ? 4000 : 1000);
    return 4000;
  }

  /** The connection ended (consented leave is 4000). */
  closed(code: number) {
    for (const listener of [...this.leaveListeners]) listener(code);
  }
}

/** The service side of one Room. */
export class FakeServerRoom {
  readonly state: ServerState = new CollaborationState();
  private readonly encoder = new Encoder(this.state);
  readonly clients = new Map<string, FakeClientRoom>();
  private readonly handlers = new Map<string, FakeRequestHandler>();
  private chatEntries = 0;

  constructor(readonly code: string) {}

  /** Answer requests of this type with the handler; unanswered types resolve without effect. */
  answer(type: string, handler: FakeRequestHandler) {
    this.handlers.set(type, handler);
  }

  handle(sessionId: string, type: string, payload: unknown) {
    return this.handlers.get(type)?.(sessionId, payload) ?? undefined;
  }

  /** Adds a chat entry (a message unless `kind` says otherwise); call it inside `update`. */
  appendChatEntry(entry: { kind?: string; authorId: string; authorName: string; authorColor?: string; text: string }) {
    this.state.chat.push(
      new ChatEntry({
        kind: 'message',
        authorColor: '',
        ...entry,
        id: `entry-${++this.chatEntries}`,
        time: Date.now(),
      })
    );
  }

  seat(sessionId: string, name: string) {
    const client = new FakeClientRoom(this, sessionId);
    this.clients.set(sessionId, client);
    if (this.state.participants.size === 0) this.state.hostId = sessionId;
    this.state.participants.set(
      sessionId,
      new Participant({ name, color: PALETTE[this.state.participants.size % PALETTE.length] })
    );
    client.receive(this.encoder.encodeAll());
    this.broadcast();
    return client;
  }

  remove(sessionId: string) {
    this.clients.delete(sessionId);
    this.state.participants.delete(sessionId);
    this.broadcast();
  }

  /** Change the state, then send the patch to every client. */
  update(change: (state: ServerState) => void) {
    act(() => {
      change(this.state);
      this.broadcast();
    });
  }

  private broadcast() {
    const patch = this.encoder.encode();
    for (const client of this.clients.values()) client.receive(patch);
    this.encoder.discardChanges();
  }
}

export class FakeCollaborationService {
  readonly rooms = new Map<string, FakeServerRoom>();
  /** Every `create` and `joinById` call, in order. */
  readonly requests: {
    method: 'create' | 'joinById';
    roomName?: string;
    code?: string;
    options: any;
    /** The login token the client carried (`client.auth.token`). */
    token?: string;
  }[] = [];
  endpoint: string | undefined;
  private refusal: FakeServerError | undefined;
  private sessions = 0;
  private codes = 0;

  /** The next `create` or `joinById` is refused with this error code. */
  refuseNext(code: number, message = 'refused') {
    this.refusal = new FakeServerError(code, message);
  }

  /** A Room someone else created. */
  openRoom(code: string, creatorName = 'Someone') {
    const room = new FakeServerRoom(code);
    this.rooms.set(code, room);
    room.seat(this.nextSessionId(), creatorName);
    return room;
  }

  async create(roomName: string, options: any, token?: string) {
    this.requests.push({ method: 'create', roomName, options, token });
    this.throwRefusal();
    const room = new FakeServerRoom(`ROOM${String(++this.codes).padStart(2, '0')}`);
    this.rooms.set(room.code, room);
    return room.seat(this.nextSessionId(), options.name);
  }

  async joinById(code: string, options: any, token?: string) {
    this.requests.push({ method: 'joinById', code, options, token });
    this.throwRefusal();
    const room = this.rooms.get(code);
    if (!room) throw new FakeServerError(522, `room "${code}" not found`);
    return room.seat(this.nextSessionId(), options.name);
  }

  reset() {
    this.rooms.clear();
    this.requests.length = 0;
    this.refusal = undefined;
    this.endpoint = undefined;
    this.codes = 0;
    this.sessions = 0;
  }

  private throwRefusal() {
    const refusal = this.refusal;
    this.refusal = undefined;
    if (refusal) throw refusal;
  }

  private nextSessionId() {
    return `session-${++this.sessions}`;
  }
}

export const fakeCollaborationService = new FakeCollaborationService();

/** The parts of `@colyseus/sdk` the frontend uses, with its `Client` talking to the fake service. */
export function fakeColyseusSdk() {
  const service = fakeCollaborationService;
  class Client {
    readonly auth: { token: string | undefined } = { token: undefined };
    /** Like the SDK, an empty token is not sent. */
    private sentToken() {
      return this.auth.token || undefined;
    }
    constructor(endpoint: string) {
      service.endpoint = endpoint;
    }
    create(roomName: string, options: any) {
      return service.create(roomName, options, this.sentToken());
    }
    joinById(code: string, options: any) {
      return service.joinById(code, options, this.sentToken());
    }
  }
  return { Client };
}
