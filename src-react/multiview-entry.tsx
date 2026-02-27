import React from 'react';
import ReactDOM from 'react-dom/client';
import { useEffect } from 'react';
import { SlotGrid } from './features/multiview/SlotGrid';
import { useMultiviewStore } from './features/multiview/store';
import { DirectoryListBridge, DirectoryMetaBridge } from './features/directory/DirectoryListBridge';
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
  const toggleFocusMode = useMultiviewStore((state) => state.toggleFocusMode);

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
    const focusBtn = document.querySelector('.js-focus-toggle');
    const slotButtons = Array.from(document.querySelectorAll('.js-slot-btn'));
    const slotToggleEl = slotButtons[0]?.closest('.slot-toggle') || null;
    const pageEl = document.querySelector('.js-page');

    const onFocusClick = () => toggleFocusMode();
    focusBtn?.addEventListener('click', onFocusClick);

    const slotHandlers: Array<{ btn: Element; fn: EventListener }> = [];
    slotButtons.forEach((btn) => {
      const fn: EventListener = () => {
        const slot = Number((btn as HTMLElement).dataset.slot || '1') as 1 | 2 | 3 | 4;
        setTargetSlot(slot);
        setActiveSlot(slot);
      };
      btn.addEventListener('click', fn);
      slotHandlers.push({ btn, fn });
    });

    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && useMultiviewStore.getState().focusMode) {
        setFocusMode(false);
        return;
      }
      if (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4') {
        const slot = Number(e.key) as 1 | 2 | 3 | 4;
        setTargetSlot(slot);
        setActiveSlot(slot);
      }
    };
    document.addEventListener('keydown', onKeydown);

    const applyHeaderUi = () => {
      const state = useMultiviewStore.getState();
      const filled = Object.values(state.slots).filter(Boolean).length;
      const highest = Math.max(0, ...[1, 2, 3, 4].filter((slot) => Boolean(state.slots[slot as 1 | 2 | 3 | 4])));
      const isMultiviewRoute = window.location.pathname === '/multiview' || window.location.pathname === '/multiview/';

      if (filled < 2 && state.focusMode) {
        setFocusMode(false);
      }

      if (focusBtn instanceof HTMLElement) {
        focusBtn.hidden = !isMultiviewRoute || filled < 2;
        focusBtn.classList.toggle('is-active', Boolean(state.focusMode));
        focusBtn.setAttribute('aria-pressed', state.focusMode ? 'true' : 'false');
      }

      if (slotToggleEl instanceof HTMLElement) {
        slotToggleEl.hidden = !isMultiviewRoute || highest < 2;
      }

      slotButtons.forEach((btn) => {
        const slot = Number((btn as HTMLElement).dataset.slot || '0');
        if (btn instanceof HTMLElement) {
          btn.hidden = !isMultiviewRoute || highest < 2 || slot > highest;
          btn.classList.toggle('is-active', slot === state.targetSlot);
        }
      });

      if (pageEl instanceof HTMLElement) {
        pageEl.classList.toggle('is-focus-mode', Boolean(state.focusMode));
      }
    };

    applyHeaderUi();
    const unsubscribe = useMultiviewStore.subscribe(applyHeaderUi);
    window.addEventListener('popstate', applyHeaderUi);

    return () => {
      focusBtn?.removeEventListener('click', onFocusClick);
      slotHandlers.forEach(({ btn, fn }) => btn.removeEventListener('click', fn));
      document.removeEventListener('keydown', onKeydown);
      window.removeEventListener('popstate', applyHeaderUi);
      unsubscribe();
    };
  }, [setActiveSlot, setFocusMode, setTargetSlot, toggleFocusMode]);

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
