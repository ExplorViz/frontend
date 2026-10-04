import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import generateUuidv4 from 'explorviz-frontend/src/utils/helpers/uuid4-generator';
import { useEffect, useState } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';

const cssClasses = new Map<string, string>([
  ['info', 'bg-info text-white'],
  ['error', 'bg-danger text-white'],
  ['success', 'bg-success text-white'],
]);

interface ToastMessageData {
  htmlId: string;
  header: string | undefined;
  message: string;
  cssClasses: string;
  // False while fading out, removed once the fade has finished
  show: boolean;
}

/**
 * Toasts are shown and hidden by react-bootstrap alone. Also driving them with
 * Bootstrap's own Toast JS restarted their fade-in on every render, which made
 * them flicker.
 */
export default function ToastMessage() {
  const [toastMessages, setToastMessages] = useState<ToastMessageData[]>([]);

  useEffect(() => {
    const addToastMessage = (type: string, message: string, header: string) => {
      setToastMessages((prevMessages) => [
        ...prevMessages,
        {
          htmlId: 'toast-' + generateUuidv4(),
          header,
          message,
          cssClasses: cssClasses.get(type) || '',
          show: true,
        },
      ]);
    };

    eventEmitter.on('newToastMessage', addToastMessage);

    return () => {
      eventEmitter.off('newToastMessage', addToastMessage);
    };
  }, []);

  const hideToast = (id: string) => {
    setToastMessages((prev) =>
      prev.map((item) => (item.htmlId === id ? { ...item, show: false } : item))
    );
  };

  const removeToast = (id: string) => {
    setToastMessages((prev) => prev.filter((item) => item.htmlId !== id));
  };

  return (
    <ToastContainer
      position="bottom-end"
      className={'p-3 toast-stack-container position-fixed'}
      style={{ zIndex: 10000003 }}
    >
      <div className="toast-card-stack">
        {toastMessages.map(({ htmlId, header, message, cssClasses, show }) => (
          <Toast
            className={`mb-3 toast toast-card ${cssClasses}`}
            key={htmlId}
            show={show}
            onClose={() => hideToast(htmlId)}
            onExited={() => removeToast(htmlId)}
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
