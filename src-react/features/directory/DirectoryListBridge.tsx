import { useMemo } from 'react';
import { ageTierLabel, formatNumber, getAgeTier } from '../../../src/utils/format.js';
import { useMultiviewStore } from '../multiview/store';

function platformLabel(value: string) {
  if (value === 'twitch') return 'Twitch';
  return 'Other';
}

export function DirectoryMetaBridge() {
  const meta = useMultiviewStore((state) => state.directoryMeta);
  return <>{meta}</>;
}

export function DirectoryListBridge() {
  const list = useMultiviewStore((state) => state.directoryList);

  const items = useMemo(() => list || [], [list]);

  return (
    <>
      {items.map((s) => {
        const isLive = s.isLive !== false;
        const tierLabel = ageTierLabel(getAgeTier(s.createdAt || null));
        const viewersLabel = isLive ? `${formatNumber(s.viewerCount || 0)} viewers` : 'Currently offline';
        return (
          <article key={s.id} className="stream-card" data-id={s.id}>
            <div className="stream-card__avatar" aria-hidden="true">
              {s.profileImageUrl ? (
                <img className="stream-card__avatar-img" src={s.profileImageUrl} alt={s.title} loading="lazy" />
              ) : null}
            </div>
            <div>
              <h3 className="stream-card__title">{s.title}</h3>
              <div className="stream-card__sub">
                <span>{platformLabel(s.platform)}</span>
                <span>{s.category || ''}</span>
                <span>{s.language ? s.language.toUpperCase() : ''}</span>
                <span>{viewersLabel}</span>
                <span>{tierLabel}</span>
              </div>
            </div>
            <div className="stream-card__actions">
              <button className="action-btn action-btn--primary js-watch-slot-btn" type="button" data-id={s.id} disabled={!isLive}>
                Watch
              </button>
              <button className="action-btn js-add-btn" type="button" data-id={s.id} disabled={!isLive}>
                Add
              </button>
            </div>
          </article>
        );
      })}
    </>
  );
}
