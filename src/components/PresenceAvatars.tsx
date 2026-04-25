import type { CSSProperties } from 'react';
import type { LocalUser } from '../hooks/useLocalUser';
import type { Peer } from '../hooks/useCollab';

const MAX_VISIBLE = 4;

function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

type PresenceAvatarsProps = {
  localUser: LocalUser;
  peers: Peer[];
};

export function PresenceAvatars({ localUser, peers }: PresenceAvatarsProps) {
  const visible = peers.slice(0, MAX_VISIBLE);
  const overflow = peers.length - visible.length;

  return (
    <div className="app__avatars" data-testid="presence-avatars">
      <div
        className="app__avatar app__avatar--you"
        title={`${localUser.name} (you)`}
        data-testid="presence-local"
        data-user-id={localUser.id}
        style={{ background: localUser.color } as CSSProperties}
      >
        <span>{initials(localUser.name)}</span>
      </div>
      {visible.map((peer) => (
        <div
          key={peer.id}
          className="app__avatar"
          title={peer.name}
          data-testid={`presence-peer-${peer.id}`}
          data-user-id={peer.id}
          style={{ background: peer.color } as CSSProperties}
        >
          <span>{initials(peer.name)}</span>
        </div>
      ))}
      {overflow > 0 && (
        <div className="app__avatar app__avatar--more" title={`${overflow} more`}>
          <span>+{overflow}</span>
        </div>
      )}
    </div>
  );
}
