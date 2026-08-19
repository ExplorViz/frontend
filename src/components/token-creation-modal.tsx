import React, { useEffect, useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';

export type LandscapeTokenCreateParams = {
  alias: string;
  value?: string;
  secret?: string;
};

interface TokenCreationModalProps {
  show: boolean;
  handleClose: () => void;
  createToken: (params: LandscapeTokenCreateParams) => Promise<void>;
}

const emptyFormState = (): LandscapeTokenCreateParams => ({
  alias: '',
  value: '',
  secret: '',
});

export default function TokenCreationModal({
  show,
  handleClose,
  createToken,
}: TokenCreationModalProps) {
  const [formState, setFormState] =
    useState<LandscapeTokenCreateParams>(emptyFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!show) {
      setFormState(emptyFormState());
      setIsSubmitting(false);
    }
  }, [show]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const params: LandscapeTokenCreateParams = {
      alias: formState.alias.trim(),
    };
    const value = formState.value?.trim();
    const secret = formState.secret?.trim();
    if (value) {
      params.value = value;
    }
    if (secret) {
      params.secret = secret;
    }

    try {
      await createToken(params);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Create Landscape Token</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="tokenAlias" className="mb-3">
            <Form.Label>Alias (optional)</Form.Label>
            <Form.Control
              type="text"
              autoFocus
              value={formState.alias}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, alias: e.target.value }))
              }
            />
          </Form.Group>
          <Form.Group controlId="tokenValue" className="mb-3">
            <Form.Label>Landscape Token (optional)</Form.Label>
            <Form.Control
              type="text"
              placeholder="Leave empty to generate automatically"
              value={formState.value ?? ''}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, value: e.target.value }))
              }
            />
            <Form.Text className="text-muted">
              Specify a custom token value or leave empty to generate one.
            </Form.Text>
          </Form.Group>
          <Form.Group controlId="tokenSecret" className="mb-3">
            <Form.Label>Token Secret (optional)</Form.Label>
            <Form.Control
              type="text"
              placeholder="Leave empty to generate automatically"
              value={formState.secret ?? ''}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, secret: e.target.value }))
              }
            />
            <Form.Text className="text-muted">
              Specify a custom token secret or leave empty to generate one.
            </Form.Text>
          </Form.Group>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="outline-primary"
              disabled={isSubmitting}
            >
              Create
            </Button>
          </Modal.Footer>
        </Form>
      </Modal.Body>
    </Modal>
  );
}
