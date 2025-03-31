import React, { useEffect, useRef, useState } from 'react';

import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { useLandscapeRestructureStore } from 'explorviz-frontend/src/stores/landscape-restructure';
import AnnotationData from 'explorviz-frontend/src/components/visualization/rendering/annotations/annotation-data';
import {
  Class,
  Package,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { EntityMesh } from 'explorviz-frontend/src/utils/extended-reality/vr-helpers/detail-info-composer';
import { isEntityMesh } from 'explorviz-frontend/src/utils/extended-reality/vr-helpers/detail-info-composer';
import { useHighlightingStore } from 'explorviz-frontend/src/stores/highlighting';
import * as THREE from 'three';
import { useAnnotationHandlerStore } from 'explorviz-frontend/src/stores/annotation-handler';
import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import Button from 'react-bootstrap/Button';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import {
  ShareAndroidIcon,
  LocationIcon,
  TrashIcon,
} from '@primer/octicons-react';
import { Position2D } from 'explorviz-frontend/src/hooks/interaction-modifier';
import { useShallow } from 'zustand/react/shallow';
import { useToastHandlerStore } from '../../../../stores/toast-handler';
import { useApplicationRendererStore } from '../../../../stores/application-renderer';

interface AnnotationCoordinatorProps {
  isMovable: boolean;
  annotationData: AnnotationData;
  removeAnnotation(annotationId: number): void;
  toggleHighlightById(modelId: string): void;
  openParents(
    entity: Package | Class | EntityMesh,
    applicationId: string
  ): void;
}

export default function AnnotationCoordinator({
  isMovable,
  annotationData,
  removeAnnotation,
  toggleHighlightById,
  openParents,
}: AnnotationCoordinatorProps) {
  const isOnline = useCollaborationSessionStore((state) => state.isOnline);
  const getColor = useCollaborationSessionStore((state) => state.getColor);
  const toggleHighlight = useHighlightingStore(
    (state) => state.toggleHighlight
  );
  const pingByModelId = useLocalUserStore((state) => state.pingByModelId);
  const showErrorToastMessage = useToastHandlerStore((state) => state.showErrorToastMessage);

  const annotationHandler = useAnnotationHandlerStore(
    useShallow((state) => ({
      removeUnmovedAnnotations: state.removeUnmovedAnnotations,
      updateAnnotation: state.updateAnnotation,
      editAnnotation: state.editAnnotation,
      shareAnnotation: state.shareAnnotation,
      updateMeshReference: state.updateMeshReference,
      annotationData: state.annotationData,
      setAnnotationData: state.setAnnotationData,
      minimizedAnnotations: state.minimizedAnnotations,
      setMinimizedAnnotationData: state.setMinimizedAnnotationData,
    }))
  )

  const [annotationTitle, setAnnotationTitle] = useState<string>(annotationData.annotationTitle);
  const [annotationText, setAnnotationText] = useState<string>(annotationData.annotationText);

  const element = useRef<HTMLDivElement | null>(null);
  const lastMousePosition = useRef<Position2D>({ x: 0, y: 0 });

  const sharedByColor = !!annotationData.sharedBy
    ? getColor(annotationData.sharedBy)
    : '';

  const onPointerOver = () => {
    if (isEntityMesh(annotationData.mesh)) {
      annotationData.mesh.applyHoverEffect();
    }

    annotationHandler.setAnnotationData([
      ...annotationHandler.annotationData.filter((an) => an.annotationId !== annotationData.annotationId),
      {...annotationData, hovered: true}
    ]);
  };

  const onPointerOut = () => {
    if (isEntityMesh(annotationData.mesh)) {
      annotationData.mesh.resetHoverEffect();
    }

    annotationHandler.setAnnotationData([
      ...annotationHandler.annotationData.filter((an) => an.annotationId !== annotationData.annotationId),
      {...annotationData, hovered: false}
    ]);
  };

  const highlight = () => {
    if (isEntityMesh(annotationData.mesh)) {
      annotationHandler.updateMeshReference(annotationData);
      toggleHighlight(annotationData.mesh, {
        sendMessage: true,
        remoteColor: new THREE.Color(0xffb739),
      });
    }
  };

  const ping = () => {
    if (annotationData.entity && annotationData.applicationId) {
      pingByModelId(annotationData.entity?.id, annotationData.applicationId);
    }
  };

  const dragMouseDown = (event: React.MouseEvent) => {
    if (!isMovable) {
      return;
    }

    lastMousePosition.current.x = event.clientX;
    lastMousePosition.current.y = event.clientY;
    document.onpointerup = closeDragElement;
    document.onpointermove = elementDrag;
  };

  const elementDrag = (event: MouseEvent) => {
    annotationData.wasMoved = true;

    // prevent that annotation gets minimized before user moves curser out of the annotation window
    // if this doesnt happen, it would end up in making this annotation not accessible
    annotationHandler.removeUnmovedAnnotations();

    event.preventDefault();

    // Calculate delta of cursor position:
    const diffX = lastMousePosition.current.x - event.clientX;
    const diffY = lastMousePosition.current.y - event.clientY;

    // Store latest mouse position for next delta calculation
    lastMousePosition.current.x = event.clientX;
    lastMousePosition.current.y = event.clientY;

    // Set the elements new position:
    const containerDiv = element.current!.parentElement as HTMLElement;

    const annotationHeight = element.current!.clientHeight;
    const annotationWidth = element.current!.clientWidth;

    let newPositionX = element.current!.offsetLeft - diffX;
    let newPositionY = element.current!.offsetTop - diffY;

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
    annotationData.mouseX -= element.current!.offsetLeft - newPositionX;
    annotationData.mouseY -= element.current!.offsetTop - newPositionY;

    element.current!.style.left = `${newPositionX}px`;
    element.current!.style.top = `${newPositionY}px`;
  };

  const closeDragElement = () => {
    document.onpointerup = null;
    document.onpointermove = null;
  };

  useEffect(() => {
    if (element.current === null) {
      return;
    }

    const annotationDiv = element.current;

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
  }, []);

  const hideAnnotation = () => {
    if (annotationData.inEdit && !annotationData.hidden) {
      showErrorToastMessage('Please exit edit mode before hiding.');
      return;
    }

    // const newAnnotation = {...annotation, hidden: !annotation.hidden}
    // setAnnotation(newAnnotation);

    annotationHandler.setAnnotationData([
      ...annotationHandler.annotationData.filter((an) => an.annotationId !== annotationData.annotationId),
      {...annotationData, hidden: !annotationData.hidden}
    ]);
  };

  const minimizeAnnotation = () => {
    if (annotationData.inEdit) {
      useToastHandlerStore
        .getState()
        .showErrorToastMessage('Please exit edit mode before minimizing.');
      return;
    }

    // remove potential toggle effects
    if (annotationData.entity) {
      const mesh = useApplicationRendererStore
        .getState()
        .getMeshById(annotationData.entity.id);
      if (mesh?.isHovered) {
        mesh.resetHoverEffect();
      }
    }
    
    // const newAnnotation = {...annotation, wasMoved: false}
    annotationHandler.setMinimizedAnnotationData([
      ...annotationHandler.minimizedAnnotations,
      {...annotationData, wasMoved: false}
    ]);
    annotationHandler.setAnnotationData([
      ...annotationHandler.annotationData.filter((an) => an.annotationId !== annotationData.annotationId)
    ]);
  };

  return (
    <div
      className={`annotation ${annotationData.hovered ? "hovered" : ""}`}
      onPointerDown={dragMouseDown}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      ref={element}
    >
      {isMovable && (
        <>
          {annotationData.isAssociated ? (
            <>
              {annotationData.wasMoved ? (
                <>
                  <div className="d-flex justify-content-between">
                    <label
                      style={{
                        fontWeight: 'bold',
                        marginLeft: '3px',
                        marginBottom: 0,
                      }}
                    >
                      Associated with '{annotationData.entity!.name}'
                    </label>
                    <div>
                      <label
                        style={{
                          fontWeight: 'bold',
                          marginRight: '3px',
                          marginBottom: 0,
                        }}
                      >
                        Creator: {annotationData.owner}
                      </label>
                    </div>
                  </div>
                  <div className="d-flex justify-content-between">
                    <div></div>
                    <label
                      style={{
                        fontWeight: 'bold',
                        fontSize: 'smaller',
                        marginRight: '3px',
                        color: '#6c757d',
                      }}
                    >
                      Last change by {annotationData.lastEditor}
                    </label>
                  </div>
                  <div className="d-flex justify-content-between">
                    {annotationData.inEdit ? (
                      <input
                        id="annotationTitle"
                        style={{ fontWeight: 'bold', width: '279px', height: '38px' }}
                        className="form-control mr-2"
                        placeholder="Annotation Title"
                        type="text"
                        value={annotationTitle}
                        onChange={(e) => setAnnotationTitle(e.target.value)}
                      />
                    ) : (
                      <label
                        style={{
                          fontWeight: 'bold',
                          fontSize: 'x-large',
                          marginLeft: '3px',
                          marginBottom: 0,
                          width: '276px',
                          height: '38px',
                          overflow: 'scroll',
                          whiteSpace: 'nowrap',
                        }}
                        className="mr-2"
                      >
                        {annotationTitle}
                      </label>
                    )}

                    <OverlayTrigger
                      placement="top"
                      trigger={['hover', 'focus']}
                      overlay={<Tooltip>Ping</Tooltip>}
                    >
                      <Button variant="primary" onClick={ping}>
                        <LocationIcon size="small" className="align-middle" />
                      </Button>
                    </OverlayTrigger>

                    {!isOnline() ? (
                      <OverlayTrigger
                        placement="top"
                        trigger={['hover', 'focus']}
                        overlay={
                          <Tooltip>This is not an online session.</Tooltip>
                        }
                      >
                        <Button
                          className="annotation-share-button"
                          variant="outline-secondary"
                          disabled
                        >
                          <ShareAndroidIcon
                            size="small"
                            className="align-right"
                          />
                        </Button>
                      </OverlayTrigger>
                    ) : annotationData.shared ? (
                      <OverlayTrigger
                        placement="top"
                        trigger={['hover', 'focus']}
                        overlay={<Tooltip>Annotation is shared</Tooltip>}
                      >
                        <Button
                          className="annotation-share-button"
                          variant="outline-secondary"
                          disabled
                        >
                          <ShareAndroidIcon
                            size="small"
                            className="align-right"
                          />
                        </Button>
                      </OverlayTrigger>
                    ) : (
                      <OverlayTrigger
                        placement="top"
                        trigger={['hover', 'focus']}
                        overlay={
                          <Tooltip>Share annotation with other users.</Tooltip>
                        }
                      >
                        <Button
                          className="annotation-share-button"
                          variant="primary"
                          onClick={() => annotationHandler.shareAnnotation(annotationData)}
                        >
                          <ShareAndroidIcon
                            size="small"
                            className="align-right"
                          />
                        </Button>
                      </OverlayTrigger>
                    )}

                    <OverlayTrigger
                      placement="top"
                      trigger={['hover', 'focus']}
                      overlay={<Tooltip>Minimize annotation.</Tooltip>}
                    >
                      <Button
                        className="annotation-minimize-button"
                        variant="outline-secondary"
                        onClick={() =>
                          minimizeAnnotation()
                        }
                      >
                        _
                      </Button>
                    </OverlayTrigger>

                    <OverlayTrigger
                      placement="top"
                      trigger={['hover', 'focus']}
                      overlay={<Tooltip>Close annotation.</Tooltip>}
                    >
                      <Button
                        className="annotation-close-button"
                        variant="outline-secondary"
                        onClick={() =>
                          removeAnnotation(annotationData.annotationId)
                        }
                      >
                        <TrashIcon size="small" className="align-right" />
                      </Button>
                    </OverlayTrigger>
                  </div>
                  {!annotationData.hidden && (
                    <>
                      {annotationData.inEdit ? (
                        <>
                          <div
                            className="annotation-text"
                            style={{ marginTop: '5px' }}
                          >
                            <textarea
                              id="annotationtext"
                              value={annotationText}
                              rows={4}
                              cols={50}
                              style={{ resize: 'none' }}
                              onChange={(e) => setAnnotationText(e.target.value)}
                            />
                          </div>
                          <Button
                            title="Update"
                            style={{
                              width: '98.8%',
                              backgroundColor: '#28a745',
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: 'large',
                              border: 'none',
                            }}
                            variant="outline-secondary"
                            onClick={() => annotationHandler.updateAnnotation({...annotationData, annotationText: annotationText, annotationTitle: annotationTitle})}
                          >
                            Update Annotation
                          </Button>
                        </>
                      ) : (
                        <>
                          <div
                            className="annotation-text"
                            style={{ marginTop: '5px' }}
                          >
                            <textarea
                              id="annotationtext"
                              value={annotationText}
                              rows={4}
                              cols={50}
                              style={{ resize: 'none' }}
                              readOnly
                            />
                          </div>
                          <Button
                            title="Update"
                            style={{
                              width: '98.8%',
                              backgroundColor: '#007bff',
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: 'large',
                              border: 'none',
                            }}
                            variant="outline-secondary"
                            onClick={() => {annotationHandler.editAnnotation({...annotationData, annotationText: annotationText, annotationTitle: annotationTitle})}
                            }
                          >
                            Edit Annotation
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="d-flex justify-content-between">
                    <label style={{ fontWeight: 'bold', marginLeft: '3px' }}>
                      Annotation
                    </label>
                  </div>
                  <label
                    style={{ backgroundColor: 'lightgray', fontWeight: 'bold' }}
                    className="form-control mr-2"
                  >
                    {annotationTitle}
                  </label>
                  <label style={{ marginLeft: '3px' }}>
                    Associated to '{annotationData.entity!.name}'
                  </label>
                </>
              )}
            </>
          ) : (
            <>
              <div className="d-flex justify-content-between">
                <label style={{ fontWeight: 'bold', marginLeft: '3px' }}>
                  Creator:
                  {annotationData.owner}
                </label>
                <label
                  style={{
                    fontWeight: 'bold',
                    fontSize: 'smaller',
                    marginRight: '3px',
                    marginTop: '2px',
                    color: '#6c757d',
                  }}
                >
                  Last change by {annotationData.lastEditor}
                </label>
              </div>
              <div className="d-flex justify-content-between">
                {annotationData.inEdit ? (
                  <input
                    id="annotationTitle"
                    style={{ fontWeight: 'bold' }}
                    className="form-control mr-2"
                    placeholder="Annotation Title"
                    type="text"
                    value={annotationTitle}
                    onChange={(e) => setAnnotationTitle(e.target.value)}
                  />
                ) : (
                  <label
                    style={{
                      fontWeight: 'bold',
                      fontSize: 'x-large',
                      marginLeft: '3px',
                      marginBottom: 0,
                      minWidth: '273px',
                      maxWidth: '273px',
                      minHeight: '38px',
                      maxHeight: '38px',
                      overflow: 'scroll',
                      whiteSpace: 'nowrap',
                    }}
                    className="mr-2"
                  >
                    {annotationTitle}
                  </label>
                )}

                {!isOnline() ? (
                  <OverlayTrigger
                    placement="top"
                    trigger={['hover', 'focus']}
                    overlay={<Tooltip>This is not an online session.</Tooltip>}
                  >
                    <Button
                      className="annotation-share-button"
                      variant="outline-secondary"
                      disabled
                    >
                      <ShareAndroidIcon size="small" className="align-right" />
                    </Button>
                  </OverlayTrigger>
                ) : annotationData.shared ? (
                  <OverlayTrigger
                    placement="top"
                    trigger={['hover', 'focus']}
                    overlay={<Tooltip>Annotation is shared</Tooltip>}
                  >
                    <Button
                      className="annotation-share-button"
                      variant="outline-secondary"
                      disabled
                    >
                      <ShareAndroidIcon size="small" className="align-right" />
                    </Button>
                  </OverlayTrigger>
                ) : (
                  <OverlayTrigger
                    placement="top"
                    trigger={['hover', 'focus']}
                    overlay={
                      <Tooltip>Share annotation with other users.</Tooltip>
                    }
                  >
                    <Button
                      className="annotation-share-button"
                      variant="primary"
                      onClick={() => annotationHandler.shareAnnotation(annotationData)}
                    >
                      <ShareAndroidIcon size="small" className="align-right" />
                    </Button>
                  </OverlayTrigger>
                )}

                <OverlayTrigger
                  placement="top"
                  trigger={['hover', 'focus']}
                  overlay={<Tooltip>Hide annotation.</Tooltip>}
                >
                  <Button
                    className="annotation-minimize-button"
                    variant="outline-secondary"
                    onClick={() =>
                      hideAnnotation()
                    }
                  >
                    _
                  </Button>
                </OverlayTrigger>

                <OverlayTrigger
                  placement="top"
                  trigger={['hover', 'focus']}
                  overlay={<Tooltip>Close annotation.</Tooltip>}
                >
                  <Button
                    className="annotation-close-button"
                    variant="outline-secondary"
                    onClick={() =>
                      removeAnnotation(annotationData.annotationId)
                    }
                  >
                    <TrashIcon size="small" className="align-right" />
                  </Button>
                </OverlayTrigger>
              </div>
              {!annotationData.hidden && (
                <>
                  {annotationData.inEdit ? (
                    <>
                      <div
                        className="annotation-text"
                        style={{ marginTop: '5px' }}
                      >
                        <textarea
                          id="annotationtext"
                          value={annotationText}
                          rows={4}
                          cols={45}
                          style={{ resize: 'none' }}
                        />
                      </div>
                      <Button
                        title="Update"
                        style={{
                          width: '98.5%',
                          backgroundColor: '#28a745',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: 'large',
                          border: 'none',
                        }}
                        variant="outline-secondary"
                        onClick={() => annotationHandler.updateAnnotation({...annotationData, annotationText: annotationText, annotationTitle: annotationTitle})}
                      >
                        Update Annotation
                      </Button>
                    </>
                  ) : (
                    <>
                      <div
                        className="annotation-text"
                        style={{ marginTop: '5px' }}
                      >
                        <textarea
                          id="annotationtext"
                          value={annotationText}
                          rows={4}
                          cols={45}
                          style={{ resize: 'none' }}
                          readOnly
                        />
                      </div>
                      <Button
                        title="Update"
                        style={{
                          width: '98.5%',
                          backgroundColor: '#007bff',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: 'large',
                          border: 'none',
                        }}
                        variant="outline-secondary"
                        onClick={() => {annotationHandler.editAnnotation({...annotationData, annotationText: annotationText, annotationTitle: annotationTitle})}
                        }
                      >
                        Edit Annotation
                      </Button>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
