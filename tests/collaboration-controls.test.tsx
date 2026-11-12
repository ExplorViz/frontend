// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import CollaborationControls from '../src/components/collaboration/visualization/page-setup/sidebar/customizationbar/collaboration/collaboration-controls';
import './setup-dom';

const stubHealthCheck = (response: () => Promise<Response>) => {
  const fetch = vi.fn(response);
  vi.stubGlobal('fetch', fetch);
  return fetch;
};

it('shows the room entry form when the collaboration service answers', async () => {
  const fetch = stubHealthCheck(async () => new Response('OK', { status: 200 }));

  render(<CollaborationControls />);

  expect(await screen.findByRole('button', { name: /create room/i })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: /room code/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /join/i })).toBeInTheDocument();
  expect(screen.queryByText(/not reachable/i)).not.toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith('/collaboration/__healthcheck', expect.anything());
});

it('says collaboration is disabled when the service cannot be reached', async () => {
  stubHealthCheck(async () => {
    throw new TypeError('Failed to fetch');
  });

  render(<CollaborationControls />);

  expect(await screen.findByText(/collaboration is currently disabled.*not reachable/i)).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

it('says collaboration is disabled when the proxy answers instead of the service', async () => {
  // e.g. the dev proxy's 502, or a web server answering with its index page
  stubHealthCheck(async () => new Response('<!doctype html>', { status: 200 }));

  render(<CollaborationControls />);

  expect(await screen.findByText(/not reachable/i)).toBeInTheDocument();
});

it('says collaboration is disabled when the service answers with an error', async () => {
  stubHealthCheck(async () => new Response('Bad Gateway', { status: 502 }));

  render(<CollaborationControls />);

  expect(await screen.findByText(/not reachable/i)).toBeInTheDocument();
});
