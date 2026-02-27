import React from 'react';
import ReactDOM from 'react-dom/client';
import { useEffect } from 'react';
import { SlotGrid } from './features/multiview/SlotGrid';
import { useMultiviewStore } from './features/multiview/store';
import './styles.css';

function MultiviewApp() {
  const hydrateLiveStreams = useMultiviewStore((state) => state.hydrateLiveStreams);
  const seedFromUrl = useMultiviewStore((state) => state.seedFromUrl);
  const streams = useMultiviewStore((state) => state.streams);
  const slots = useMultiviewStore((state) => state.slots);
  const targetSlot = useMultiviewStore((state) => state.targetSlot);
  const activeSlot = useMultiviewStore((state) => state.activeSlot);

  useEffect(() => {
    seedFromUrl(window.location.search);
    if (!streams.length) {
      void hydrateLiveStreams();
    }
  }, [hydrateLiveStreams, seedFromUrl, streams.length]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('multiview:state-change', {
        detail: { slots, targetSlot, activeSlot },
      })
    );
  }, [slots, targetSlot, activeSlot]);

  return (
    <div className="multiview-embedded">
      <SlotGrid />
    </div>
  );
}

const rootEl = document.getElementById('react-multiview-root');

if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <MultiviewApp />
    </React.StrictMode>
  );

  const bridge = {
    setStreams: useMultiviewStore.getState().setStreams,
    assignStream: (streamId: string) => useMultiviewStore.getState().assignStreamToTarget(streamId),
    assignStreamToSlot: (slot: number, streamId: string) =>
      useMultiviewStore.getState().assignStreamToSlot(slot as 1 | 2 | 3 | 4, streamId),
    clearSlot: (slot: number) => useMultiviewStore.getState().clearSlot(slot as any),
    setTargetSlot: (slot: number) => useMultiviewStore.getState().setTargetSlot(slot as any),
    setActiveSlot: (slot: number) => useMultiviewStore.getState().setActiveSlot(slot as any),
    setFocusMode: (next: boolean) => useMultiviewStore.getState().setFocusMode(next),
    toggleFocusMode: () => useMultiviewStore.getState().toggleFocusMode(),
  };

  // @ts-expect-error expose for legacy layer
  window.multiviewBridge = bridge;
}
