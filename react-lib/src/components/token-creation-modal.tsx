import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

interface TokenCreationModalProps {
  show: boolean;
  handleClose: () => void;
  createToken: (tokenAlias: string) => Promise<void>;
}

export default function TokenCreationModal({
  show,
  handleClose,
  createToken,
}: TokenCreationModalProps) {
  const [tokenAlias, setTokenAlias] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createToken(tokenAlias);
    handleClose();
  };

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Create Landscape Token</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="tokenAlias">
            <Form.Label>Alias (may be left empty)</Form.Label>
            <Form.Control
              type="text"
              autoFocus
              value={tokenAlias}
              onChange={(e) => setTokenAlias(e.target.value)}
            />
          </Form.Group>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleClose}>
              Cancle
            </Button>
            <Button type="submit" variant="primary">
              Create
            </Button>
          </Modal.Footer>
        </Form>
      </Modal.Body>
    </Modal>
  );
}
