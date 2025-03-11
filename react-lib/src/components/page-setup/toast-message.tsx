import React, { useState, useEffect, useCallback } from 'react';
import generateUuidv4 from 'react-lib/src/utils/helpers/uuid4-generator';
import eventEmitter from 'react-lib/src/utils/event-emitter';
import $ from 'jquery';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

export default function ToastMessage() {
  const [toastMessages, setToastMessages]: any = useState([]);

  const cssClassesValues: [string, string][] = [
    ['info', 'bg-info text-white'],
    ['error', 'bg-danger text-white'],
    ['success', 'bg-success text-white'],
  ];

  const cssClasses = new Map<string, string>(cssClassesValues);

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

  const toastRenderIsComplete = useCallback((htmlElement: HTMLElement) => {
    const id = htmlElement.id;
    const toast: any = $(`#${id}`); // Requires jQuery

    if (toast) {
      toast.toast('show');
      toast.on('hidden.bs.toast', () => {
        setToastMessages((prevMessages: any) =>
          prevMessages.filter((item: any) => item.htmlId !== id)
        );
      });
    }
  }, []);

  return (
    <div className="toast-stack-container position-fixed">
      <div className="toast-card-stack">
        {toastMessages.map((toast: any) => (
          <div
            key={toast.htmlId}
            id={toast.htmlId}
            className={`toast toast-card ${toast.cssClasses}`}
            data-delay="2000"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            ref={(element) => {
              if (element) {
                toastRenderIsComplete(element);
              }
            }}
          >
            {toast.header && (
              <div className="toast-header">
                <strong className="mr-auto">Information</strong>
                <button
                  type="button"
                  className="ml-2 mb-1 close"
                  data-dismiss="toast"
                  aria-label="Close"
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
            )}
            <div className="toast-body">{toast.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
