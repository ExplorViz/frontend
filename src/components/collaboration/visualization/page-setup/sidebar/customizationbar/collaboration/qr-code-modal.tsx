import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
// import QRCodeSVG from 'react-qr-code';

interface QRCodeModalProps {
  show: boolean;
  onHide: () => void;
}

export default function QRCodeModal({ show, onHide }: QRCodeModalProps) {
  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header>
        <h4 className="modal-title">Share Room URL</h4>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex flex-column align-items-center">
          <p className="mb-3">Scan this QR code to join the room:</p>
          <div
          >
            <QRCodeSVG value={window.location.href} size={256} />
          </div>
          <p className="mt-3 mb-0 text-break" style={{ fontSize: '0.9em' }}>
            {window.location.href}
          </p>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

