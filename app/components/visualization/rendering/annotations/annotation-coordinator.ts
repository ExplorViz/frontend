import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { Position2D } from 'explorviz-frontend/modifiers/interaction-modifier';
import Configuration from 'explorviz-frontend/services/configuration';
import LocalUser from 'collaboration/services/local-user';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import AnnotationData from './annotation-data';
import { isEntityMesh } from 'extended-reality/utils/vr-helpers/detail-info-composer';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import * as THREE from 'three';
import AnnotationHandlerService from 'explorviz-frontend/services/annotation-handler';
import CollaborationSession from 'collaboration/services/collaboration-session';

interface IArgs {
  isMovable: boolean;
  annotationData: AnnotationData;
  removeAnnotation(annotationId: number): void;
  updateMeshReference(annotation: AnnotationData): void;
  shareAnnotation(annotation: AnnotationData): void;
}

export default class AnnotationCoordinatorComponent extends Component<IArgs> {
  @service('collaboration-session')
  private collaborationSession!: CollaborationSession;

  @service('configuration')
  configuration!: Configuration;

  @service('highlighting-service')
  highlightingService!: HighlightingService;

  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  @service('local-user')
  localUser!: LocalUser;

  @service('annotation-handler')
  annotationHandler!: AnnotationHandlerService;

  element!: HTMLDivElement;

  lastMousePosition: Position2D = {
    x: 0,
    y: 0,
  };

  @action
  onPointerOver() {
    if (isEntityMesh(this.args.annotationData.mesh)) {
      this.args.annotationData.mesh.applyHoverEffect();
    }
    this.args.annotationData.hovered = true;
  }

  @action
  onPointerOut() {
    if (isEntityMesh(this.args.annotationData.mesh)) {
      this.args.annotationData.mesh.resetHoverEffect();
    }
    this.args.annotationData.hovered = false;
  }

  get sharedByColor() {
    const userId = this.args.annotationData.sharedBy;
    if (!userId) {
      return '';
    }
    return this.collaborationSession.getColor(userId);
  }

  @action
  highlight() {
    if (isEntityMesh(this.args.annotationData.mesh)) {
      this.args.updateMeshReference(this.args.annotationData);
      this.highlightingService.toggleHighlight(this.args.annotationData.mesh, {
        sendMessage: true,
        remoteColor: new THREE.Color(0xffb739),
      });
    }
  }

  @action
  ping() {
    if (
      this.args.annotationData.entity &&
      this.args.annotationData.applicationId
    ) {
      this.localUser.pingByModelId(
        this.args.annotationData.entity?.id,
        this.args.annotationData.applicationId
      );
    }
  }

  @action
  dragMouseDown(event: MouseEvent) {
    if (!this.args.isMovable) {
      return;
    }

    this.lastMousePosition.x = event.clientX;
    this.lastMousePosition.y = event.clientY;
    document.onpointerup = this.closeDragElement;
    document.onpointermove = this.elementDrag;
  }

  @action
  elementDrag(event: MouseEvent) {
    this.args.annotationData.wasMoved = true;

    event.preventDefault();

    // Calculate delta of cursor position:
    const diffX = this.lastMousePosition.x - event.clientX;
    const diffY = this.lastMousePosition.y - event.clientY;

    // Store latest mouse position for next delta calculation
    this.lastMousePosition.x = event.clientX;
    this.lastMousePosition.y = event.clientY;

    // Set the elements new position:
    const containerDiv = this.element.parentElement as HTMLElement;

    const annotationHeight = this.element.clientHeight;
    const annotationWidth = this.element.clientWidth;

    let newPositionX = this.element.offsetLeft - diffX;
    let newPositionY = this.element.offsetTop - diffY;

    // Prevent annotation position outside of rendering canvas in x-Direction
    if (newPositionX < 0) {
      newPositionX = 0;
    } else if (
      containerDiv.clientHeight &&
      newPositionX > containerDiv.clientWidth - annotationWidth
    ) {
      newPositionX = containerDiv.clientWidth - annotationWidth;
    }

    // Prevent annotation position outside of rendering canvas in y-Direction
    if (newPositionY < 0) {
      newPositionY = 0;
    } else if (
      containerDiv.clientHeight &&
      newPositionY > containerDiv.clientHeight - annotationHeight
    ) {
      newPositionY = containerDiv.clientHeight - annotationHeight;
    }

    // Update stored annotation position relative to new position
    this.args.annotationData.mouseX -= this.element.offsetLeft - newPositionX;
    this.args.annotationData.mouseY -= this.element.offsetTop - newPositionY;

    this.element.style.left = `${newPositionX}px`;
    this.element.style.top = `${newPositionY}px`;
  }

  // eslint-disable-next-line class-methods-use-this
  closeDragElement() {
    document.onpointerup = null;
    document.onpointermove = null;
  }

  @action
  setAnnotationPosition(annotationDiv: HTMLDivElement) {
    this.element = annotationDiv;
    const { annotationData } = this.args;

    if (!annotationData) {
      return;
    }

    // Surrounding div for position calculations
    const containerDiv = annotationDiv.parentElement as HTMLElement;

    const annotationHeight = annotationDiv.clientHeight;
    const annotationWidth = annotationDiv.clientWidth;

    const containerWidth = containerDiv.clientWidth;

    if (
      annotationHeight === undefined ||
      annotationWidth === undefined ||
      containerWidth === undefined
    ) {
      return;
    }

    const annotationTopOffset = annotationHeight + 30;
    const annotationLeftOffset = annotationWidth / 2;

    let annotationTopPosition = annotationData.mouseY - annotationTopOffset;
    let annotationLeftPosition = annotationData.mouseX - annotationLeftOffset;

    // Preven annotation positioning on top of rendering canvas =>
    // position under mouse cursor
    if (annotationTopPosition < 0) {
      const approximateMouseHeight = 35;
      annotationTopPosition = annotationData.mouseY + approximateMouseHeight;
    }

    // Preven annotation positioning on right(outside) of rendering canvas =>
    // position at right edge of cancas
    if (annotationLeftPosition + annotationWidth > containerWidth) {
      const extraAnnotationMarginFromAtBottom = 5;
      annotationLeftPosition =
        containerWidth - annotationWidth - extraAnnotationMarginFromAtBottom;
    }

    // Preven annotation positioning on left(outside) of rendering canvas =>
    // position at left edge of canvas
    if (annotationLeftPosition < 0) {
      annotationLeftPosition = 0;
    }

    // Set annotation position
    /* eslint-disable no-param-reassign */
    annotationDiv.style.top = `${annotationTopPosition}px`;
    annotationDiv.style.left = `${annotationLeftPosition}px`;
  }
}
