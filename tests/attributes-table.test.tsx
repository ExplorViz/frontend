// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import AttributesTable from '../src/components/attributes-table';
import './setup-dom';

it('shows telemetry attributes while hiding internal ExplorViz metadata', () => {
  render(
    <AttributesTable
      attributes={{
        'http.method': 'GET',
        'db.statement': '<script>alert(1)</script>',
        'explorviz.id': 'secret-id',
      }}
    />
  );
  const rows = screen.getAllByRole('row');
  expect(rows).toHaveLength(2);
  expect(within(rows[0]).getByText('GET')).toBeInTheDocument();
  expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
  expect(screen.queryByText('secret-id')).not.toBeInTheDocument();
  expect(document.querySelector('script')).toBeNull();
});

it.each<Record<string, string>>([{}, { 'explorviz.id': 'internal' }])(
  'shows an empty state when no public attributes remain',
  (attributes) => {
    render(<AttributesTable attributes={attributes} />);
    expect(screen.getByText('None')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  }
);
