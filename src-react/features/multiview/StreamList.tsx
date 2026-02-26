import { useMultiviewStore } from './store';

export function StreamList() {
  const streams = useMultiviewStore((state) => state.streams);
  const source = useMultiviewStore((state) => state.source);
  const loading = useMultiviewStore((state) => state.loading);
  const targetSlot = useMultiviewStore((state) => state.targetSlot);
  const assignStreamToTarget = useMultiviewStore((state) => state.assignStreamToTarget);

  return (
    <section className="mv-list" aria-label="Streams">
      <div className="mv-list__head">
        <h2>Directory sandbox</h2>
        <span>{loading ? 'Loading...' : `${streams.length} streams`} / {source}</span>
      </div>
      <div className="mv-list__subhead">Target slot: {targetSlot}</div>

      <div className="mv-list__items">
        {streams.map((stream) => (
          <article key={stream.id} className="mv-list__item">
            <div className="mv-list__text">
              <strong>{stream.channel}</strong>
              <span>{stream.title}</span>
            </div>
            <div className="mv-list__actions">
              <span className={stream.isLive ? 'mv-status is-live' : 'mv-status'}>
                {stream.isLive ? 'Live' : 'Offline'}
              </span>
              <button type="button" className="mv-list__add" onClick={() => assignStreamToTarget(stream.id)}>
                Add to slot {targetSlot}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
