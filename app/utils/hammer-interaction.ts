import Object from '@ember/object';
import Evented from '@ember/object/evented';
import { Position2D } from 'explorviz-frontend/modifiers/interaction-modifier';
import Hammer from 'hammerjs';

/* eslint-disable no-bitwise */
export default class HammerInteraction extends Object.extend(Evented) {
  hammerManager: HammerManager | null = null;

  /**
   * Setups events which are triggered by hammer interaction
   *
   * @param {*} canvas Events are registered on the canvas
   */
  setupHammer(canvas: HTMLCanvasElement, dbTapInterval = 250) {
    const self = this;

    let mouseDeltaX = 0;
    let mouseDeltaY = 0;

    // Used to calculate delta scale and delta zoom for events
    let lastPinchScale = 1;
    let lastRotation = 0;

    // Fire Panning-Event with right click as well
    function registerRightClickWithPan() {
      const POINTER_INPUT_MAP = {
        pointerdown: Hammer.INPUT_START,
        pointermove: Hammer.INPUT_MOVE,
        pointerup: Hammer.INPUT_END,
        pointercancel: Hammer.INPUT_CANCEL,
        pointerout: Hammer.INPUT_CANCEL,
      };

      // @ts-ignore
      Hammer.inherit(Hammer.PointerEventInput, Hammer.Input, {

        handler: function PEhandler(ev: PointerEvent) {
          const { store } = this;
          let removePointer = false;

          const eventTypeNormalized = ev.type.toLowerCase();
          if (!(eventTypeNormalized === 'pointerdown'
            || eventTypeNormalized === 'pointermove'
            || eventTypeNormalized === 'pointerup'
            || eventTypeNormalized === 'pointercancel'
            || eventTypeNormalized === 'pointerout')) {
            return;
          }
          const eventType = POINTER_INPUT_MAP[eventTypeNormalized];
          const { pointerType } = ev;

          // Modified to handle all buttons
          // left=0, middle=1, right=2
          if (eventType & Hammer.INPUT_START) {
            // firefox sends button 0 for mousemove, so store it here
            this.button = ev.button;
          }

          // var isTouch = (pointerType === Hammer.INPUT_TYPE_TOUCH);

          function isCorrectPointerId(element: any) {
            return element.pointerId === ev.pointerId;
          }

          // Get index of the event in the store
          let storeIndex = store.findIndex(isCorrectPointerId);

          // Start and mouse must be down
          if (eventType & Hammer.INPUT_START
            && (ev.button === 0 || ev.button === 1 || ev.button === 2)) {
            if (storeIndex < 0) {
              store.push(ev);
              storeIndex = store.length - 1;
            }
          } else if (eventType & (Hammer.INPUT_END | Hammer.INPUT_CANCEL)) {
            removePointer = true;
          }

          // Not found, so the pointer hasn't been down (so it's probably a hover)
          if (storeIndex < 0) {
            return;
          }

          // Update the event in the store
          store[storeIndex] = ev;

          this.callback(this.manager, eventType, {
            button: this.button + 1,
            pointers: store,
            changedPointers: [ev],
            pointerType,
            srcEvent: ev,
          });

          if (removePointer) {
            // Remove from the store
            store.splice(storeIndex, 1);
          }
        },
      });
    }

    registerRightClickWithPan();

    const hammer = new Hammer.Manager(canvas, {});
    this.set('hammerManager', hammer);

    const singleTap = new Hammer.Tap({
      event: 'singletap',
      interval: 150,
    });

    const doubleTap = new Hammer.Tap({
      event: 'doubletap',
      taps: 2,
      interval: dbTapInterval,
    });

    const press = new Hammer.Press({
      event: 'press',
      pointers: 1,
      threshold: 25,
      time: 500,
    });

    const pinch = new Hammer.Pinch({
      event: 'pinch',
      pointers: 2,
    });

    const rotate = new Hammer.Rotate({
      event: 'rotate',
      pointers: 2,
    });

    const pan = new Hammer.Pan({
      event: 'pan',
    });

    hammer.add([doubleTap, singleTap, press, pinch, rotate, pan]);

    doubleTap.recognizeWith(singleTap);
    singleTap.requireFailure(doubleTap);
    doubleTap.dropRequireFailure(singleTap);
    pinch.recognizeWith(rotate);

    hammer.on('panstart', (evt: any) => {
      if (evt.button !== 1 && evt.button !== 3) {
        return;
      }

      if (evt.srcEvent.target !== canvas) {
        return;
      }

      const mousePosition = HammerInteraction.getMousePos(canvas, evt.srcEvent);

      mouseDeltaX = mousePosition.x;
      mouseDeltaY = mousePosition.y;

      self.trigger('panstart', evt);
    });

    /**
     * Triggers a panning event
     */
    hammer.on('panmove', (evt: any) => {
      if (evt.button !== 1 && evt.button !== 3) {
        return;
      }

      if (evt.srcEvent.target !== canvas) {
        return;
      }

      const mousePosition = HammerInteraction.getMousePos(canvas, evt.srcEvent);

      const delta = {
        x: mousePosition.x - mouseDeltaX,
        y: mousePosition.y - mouseDeltaY,
      };

      mouseDeltaX = mousePosition.x;
      mouseDeltaY = mousePosition.y;

      self.trigger('panning', delta, evt);
    });

    // END of mouse movement

    /**
     * Triggers a panningEnd event if mouse is moved without clicking a button
     */
    hammer.on('mousemove', (evt: any) => {
      if (evt.button !== 1 && evt.button !== 3) {
        return;
      }

      if (evt.srcEvent.target !== canvas) {
        return;
      }

      const mousePosition = HammerInteraction.getMousePos(canvas, evt.srcEvent);

      self.trigger('panningEnd', mousePosition);
    });

    /**
     * Triggers a doubletap event for the right mouse button
     */
    hammer.on('doubletap', (evt: any) => {
      if (evt.button !== 1 || evt.srcEvent.target !== canvas) {
        return;
      }

      let mousePosition: Position2D;

      if (window.TouchEvent && evt.srcEvent instanceof TouchEvent) {
        mousePosition = HammerInteraction.getTouchPos(canvas, evt.srcEvent);
      } else {
        mousePosition = HammerInteraction.getMousePos(canvas, evt.srcEvent);
      }

      self.trigger('doubletap', mousePosition);
    });

    /**
     * Triggers a single tap event for the left and right mouse button
     */
    hammer.on('singletap', (evt: any) => {
      if (evt.srcEvent.target !== canvas) {
        return;
      }

      let mousePosition: Position2D;

      if (window.TouchEvent && evt.srcEvent instanceof TouchEvent) {
        mousePosition = HammerInteraction.getTouchPos(canvas, evt.srcEvent);
      } else {
        mousePosition = HammerInteraction.getMousePos(canvas, evt.srcEvent);
      }

      if (evt.button === 1) {
        self.trigger('lefttap', mousePosition, canvas);
      } else if (evt.button === 3) {
        self.trigger('righttap', mousePosition, evt.srcEvent);
      }
    });

    /**
     * Triggers a press event which (could e.g. be used as an alternative to 'righttap')
     */
    hammer.on('press', (evt: any) => {
      if (evt.srcEvent.target !== canvas) {
        return;
      }

      const mousePosition = HammerInteraction.getMousePos(canvas, evt.srcEvent);

      self.trigger('press', mousePosition, evt.srcEvent);
    });

    /*
    * Expose pinch events
    */

    hammer.on('pinchstart', (evt) => {
      lastPinchScale = evt.scale;
      self.trigger('pinchstart', evt);
    });

    hammer.on('pinchmove', (evt) => {
      const deltaScale = evt.scale - lastPinchScale;
      const deltaScaleInPercent = deltaScale / lastPinchScale;
      lastPinchScale = evt.scale;
      self.trigger('pinch', deltaScaleInPercent, evt);
    });

    hammer.on('pinchend', (evt) => {
      lastPinchScale = 1;
      self.trigger('pinchend', evt);
    });

    /*
    * Expose rotation events
    */

    hammer.on('rotatestart', (evt) => {
      lastRotation = evt.rotation;
      self.trigger('rotatestart', evt);
    });

    hammer.on('rotate', (evt) => {
      // Difference in rotation between rotate events (in degrees)
      const deltaRotation = lastRotation - evt.rotation;
      lastRotation = evt.rotation;

      self.trigger('rotate', deltaRotation, evt);
    });

    hammer.on('rotateend', (evt) => {
      lastRotation = 0;
      self.trigger('rotateend', evt);
    });
  }

  static getMousePos(canvas: HTMLCanvasElement, evt: MouseEvent): Position2D {
    const rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top,
    };
  }

  static getTouchPos(canvas: HTMLCanvasElement, evt: TouchEvent): Position2D {
    const rect = canvas.getBoundingClientRect();
    return {
      x: evt.targetTouches[0].clientX - rect.left,
      y: evt.targetTouches[0].clientY - rect.top,
    };
  }
}
