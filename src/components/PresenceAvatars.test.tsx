import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PresenceAvatars } from './PresenceAvatars';
import type { Peer } from '../hooks/useCollab';
import type { LocalUser } from '../hooks/useLocalUser';

const LOCAL: LocalUser = { id: 'me', name: 'Mia', color: '#111111' };

function peer(id: string, name: string, color: string): Peer {
  return { id, name, color, lastSeen: Date.now() };
}

describe('PresenceAvatars — Requirement 6: live presence UI', () => {
  it('renders the local user avatar', () => {
    render(<PresenceAvatars localUser={LOCAL} peers={[]} />);
    const me = screen.getByTestId('presence-local');
    expect(me).toHaveAttribute('data-user-id', LOCAL.id);
    expect(me).toHaveAttribute('title', expect.stringContaining(LOCAL.name));
    expect(me).toHaveTextContent('M');
  });

  it('renders one avatar per connected peer', () => {
    const peers = [
      peer('p1', 'Alex', '#8b5cf6'),
      peer('p2', 'Jordan', '#10b981'),
    ];
    render(<PresenceAvatars localUser={LOCAL} peers={peers} />);

    const a = screen.getByTestId('presence-peer-p1');
    const b = screen.getByTestId('presence-peer-p2');
    expect(a).toHaveAttribute('title', 'Alex');
    expect(b).toHaveAttribute('title', 'Jordan');
    expect(a).toHaveTextContent('A');
    expect(b).toHaveTextContent('J');
  });

  it('caps the visible avatars at 4 and shows overflow "+N"', () => {
    const peers = [
      peer('p1', 'One', '#111'),
      peer('p2', 'Two', '#222'),
      peer('p3', 'Three', '#333'),
      peer('p4', 'Four', '#444'),
      peer('p5', 'Five', '#555'),
      peer('p6', 'Six', '#666'),
    ];
    render(<PresenceAvatars localUser={LOCAL} peers={peers} />);

    // First 4 peers visible
    expect(screen.getByTestId('presence-peer-p1')).toBeInTheDocument();
    expect(screen.getByTestId('presence-peer-p4')).toBeInTheDocument();
    // 5th and 6th not rendered individually
    expect(screen.queryByTestId('presence-peer-p5')).toBeNull();
    expect(screen.queryByTestId('presence-peer-p6')).toBeNull();
    // Overflow indicator
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('omits the overflow indicator when peers fit within the visible cap', () => {
    const peers = [peer('p1', 'One', '#111')];
    render(<PresenceAvatars localUser={LOCAL} peers={peers} />);
    expect(screen.queryByText(/^\+\d+$/)).toBeNull();
  });
});
