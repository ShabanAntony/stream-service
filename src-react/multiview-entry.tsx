import React from 'react';
import ReactDOM from 'react-dom/client';
import { useEffect } from 'react';
import { SlotGrid } from './features/multiview/SlotGrid';
import { useMultiviewStore } from './features/multiview/store';
import { DirectoryListBridge, DirectoryMetaBridge } from './features/directory/DirectoryListBridge';
import { HeaderControls } from './features/multiview/HeaderControls';
import './styles.css';

function MultiviewApp() {
  const hydrateLiveStreams = useMultiviewStore((state) => state.hydrateLiveStreams);
  const seedFromUrl = useMultiviewStore((state) => state.seedFromUrl);
  const streams = useMultiviewStore((state) => state.streams);
  const slots = useMultiviewStore((state) => state.slots);
  const targetSlot = useMultiviewStore((state) => state.targetSlot);
  const activeSlot = useMultiviewStore((state) => state.activeSlot);
  const focusMode = useMultiviewStore((state) => state.focusMode);
  const setTargetSlot = useMultiviewStore((state) => state.setTargetSlot);
  const setActiveSlot = useMultiviewStore((state) => state.setActiveSlot);
  const setFocusMode = useMultiviewStore((state) => state.setFocusMode);

  useEffect(() => {
    seedFromUrl(window.location.search);
    if (!streams.length) {
      void hydrateLiveStreams();
    }
  }, [hydrateLiveStreams, seedFromUrl, streams.length]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('multiview:state-change', {
        detail: { slots, targetSlot, activeSlot, focusMode },
      })
    );
  }, [slots, targetSlot, activeSlot, focusMode]);

  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      const isMultiviewRoute = window.location.pathname === '/multiview' || window.location.pathname === '/multiview/';
      if (!isMultiviewRoute) return;
      if (e.key === 'Escape' && useMultiviewStore.getState().focusMode) {
        setFocusMode(false);
        return;
      }
      if (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4') {
        const current = useMultiviewStore.getState();
        const occupied = [1, 2, 3, 4].filter((slot) => Boolean(current.slots[slot as 1 | 2 | 3 | 4]));
        const highestVisibleSlot = occupied.length ? Math.max(...occupied) : 1;
        if (highestVisibleSlot < 2) {
          return;
        }
        const slot = Number(e.key) as 1 | 2 | 3 | 4;
        if (slot > highestVisibleSlot) {
          return;
        }
        setTargetSlot(slot);
        setActiveSlot(slot);
      }
    };
    document.addEventListener('keydown', onKeydown);

    return () => {
      document.removeEventListener('keydown', onKeydown);
    };
  }, [setActiveSlot, setFocusMode, setTargetSlot]);

  useEffect(() => {
    const filled = Object.values(slots).filter(Boolean).length;
    if (filled < 2 && focusMode) {
      setFocusMode(false);
    }
  }, [focusMode, slots, setFocusMode]);

  useEffect(() => {
    document.body.classList.toggle('is-focus-mode', Boolean(focusMode));
  }, [focusMode]);

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
    setDirectoryList: (list: unknown[], metaText: string) =>
      useMultiviewStore.getState().setDirectoryList(list as any, metaText),
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

  const headerControlsEl = document.getElementById('react-header-controls');
  if (headerControlsEl) {
    const headerRoot = ReactDOM.createRoot(headerControlsEl);
    headerRoot.render(
      <React.StrictMode>
        <HeaderControls />
      </React.StrictMode>
    );
  }

  const listEl = document.querySelector('.js-stream-list');
  if (listEl) {
    const listRoot = ReactDOM.createRoot(listEl);
    listRoot.render(
      <React.StrictMode>
        <DirectoryListBridge />
      </React.StrictMode>
    );
  }

  const metaEl = document.querySelector('.js-results-meta');
  if (metaEl) {
    const metaRoot = ReactDOM.createRoot(metaEl);
    metaRoot.render(
      <React.StrictMode>
        <DirectoryMetaBridge />
      </React.StrictMode>
    );
  }
}
