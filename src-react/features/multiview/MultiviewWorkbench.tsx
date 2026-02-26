import { useEffect } from 'react';
import { SlotGrid } from './SlotGrid';
import { StreamList } from './StreamList';
import { useMultiviewStore } from './store';

export function MultiviewWorkbench() {
  const source = useMultiviewStore((state) => state.source);
  const loading = useMultiviewStore((state) => state.loading);
  const error = useMultiviewStore((state) => state.error);
  const focusMode = useMultiviewStore((state) => state.focusMode);
  const activeSlot = useMultiviewStore((state) => state.activeSlot);
  const toggleFocusMode = useMultiviewStore((state) => state.toggleFocusMode);
  const hydrateLiveStreams = useMultiviewStore((state) => state.hydrateLiveStreams);
  const useFallbackStreams = useMultiviewStore((state) => state.useFallbackStreams);
  const seedFromUrl = useMultiviewStore((state) => state.seedFromUrl);

  useEffect(() => {
    seedFromUrl(window.location.search);
    void hydrateLiveStreams();
  }, [hydrateLiveStreams, seedFromUrl]);

  return (
    <section className="multiview-workbench" aria-label="Multiview refactor sandbox">
      <div className="multiview-workbench__panel">
        <h2>Phase 2: slot-local updates</h2>
        <p>
          This sandbox uses per-slot subscriptions. Toggling focus or selecting a slot should update only affected slot cards.
        </p>
        <div className="multiview-workbench__toolbar">
          <button type="button" className="mv-list__add" onClick={toggleFocusMode}>
            {focusMode ? 'Disable focus mode' : 'Enable focus mode'}
          </button>
          <button type="button" className="mv-list__add" onClick={() => void hydrateLiveStreams()} disabled={loading}>
            {loading ? 'Loading live...' : 'Reload live streams'}
          </button>
          <button type="button" className="mv-list__add" onClick={useFallbackStreams}>
            Use fallback
          </button>
          <span>Active slot: {activeSlot}</span>
          <span>Source: {source}</span>
          <span>`iframe src` is stable across focus/target changes</span>
        </div>
        {error ? <p className="multiview-workbench__error">Data note: {error}</p> : null}
      </div>
      <div className="multiview-workbench__layout">
        <StreamList />
        <SlotGrid />
      </div>
    </section>
  );
}
