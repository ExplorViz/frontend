import React, { useState, useEffect, useCallback, useRef } from 'react';
import generateUuidv4 from 'explorviz-frontend/src/utils/helpers/uuid4-generator';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import { ToastContainer, Toast } from 'react-bootstrap';
import { Toast as BootstrapToast } from 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

export default function ToastMessage() {
  const cssClassesValues: [string, string][] = [
    ['info', 'bg-info text-white'],
    ['error', 'bg-danger text-white'],
    ['success', 'bg-success text-white'],
  ];

  const cssClasses = new Map<string, string>(cssClassesValues);

  const [toastMessages, setToastMessages] = useState<
    {
      htmlId: string;
      header: string | undefined;
      message: string;
      cssClasses: string;
    }[]
  >([]);
  const toastRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const addToastMessage = useCallback(
    (type: string, message: string, header: string) => {
      const htmlIdUnique = 'toast-' + generateUuidv4();

      let cssClassesString = cssClasses.get(type) || '';

      setToastMessages((prevMessages: any) => [
        ...prevMessages,
        {
          htmlId: htmlIdUnique,
          header,
          message,
          cssClasses: cssClassesString,
        },
      ]);
    },
    [cssClasses]
  );

  useEffect(() => {
    const showToastCallback = addToastMessage;

    eventEmitter.on('newToastMessage', showToastCallback);

    return () => {
      eventEmitter.off('newToastMessage', showToastCallback);
    };
  }, [addToastMessage]);

  const toastRenderIsComplete = useCallback((id: string) => {
    const toastElement = toastRefs.current[id];

    if (toastElement) {
      const bsToast = new BootstrapToast(toastElement, {
        autohide: true,
        delay: 5000,
      });
      bsToast.show();

      toastElement.addEventListener('hidden.bs.toast', () => {
        setToastMessages((prev) => prev.filter((item) => item.htmlId !== id));
      });
    }
  }, []);

  return (
    <ToastContainer
      position="bottom-end"
      className={'p-3 toast-stack-container position-fixed'}
      style={{ zIndex: 10000003 }}
    >
      <div className="toast-card-stack">
        {toastMessages.map(({ htmlId, header, message, cssClasses }) => (
          <Toast
            className={`mb-3 toast toast-card ${cssClasses}`}
            key={htmlId}
            ref={(el) => {
              toastRefs.current[htmlId] = el;
              if (el) toastRenderIsComplete(htmlId);
            }}
            onClose={() =>
              setToastMessages((prev) =>
                prev.filter((item) => item.htmlId !== htmlId)
              )
            }
            autohide
            delay={5000}
          >
            {header && (
              <Toast.Header className={'toast-header'}>
                <strong className={'me-auto'}>Information</strong>
              </Toast.Header>
            )}
            <Toast.Body className={'toast-body'}>{message}</Toast.Body>
          </Toast>
        ))}
      </div>
    </ToastContainer>
  );
}
