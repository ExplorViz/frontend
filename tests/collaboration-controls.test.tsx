// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import CollaborationControls from '../src/components/collaboration/visualization/page-setup/sidebar/customizationbar/collaboration/collaboration-controls';
import './setup-dom';

it('says that collaboration is disabled and offers no way to join a room', () => {
  render(<CollaborationControls />);
  expect(screen.getByText(/collaboration is disabled/i)).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
