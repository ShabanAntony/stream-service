import { useEffect, useMemo, useState } from 'react';
import { useMultiviewStore } from './store';
import type { SlotId } from './types';

function useIsMultiviewRoute() {
  const [pathname, setPathname] = useState(() => window.location.pathname || '/');

  useEffect(() => {
    const onRouteChange = () => setPathname(window.location.pathname || '/');
    window.addEventListener('popstate', onRouteChange);
    window.addEventListener('app:navigation', onRouteChange);
    return () => {
      window.removeEventListener('popstate', onRouteChange);
      window.removeEventListener('app:navigation', onRouteChange);
    };
  }, []);

  return pathname === '/multiview' || pathname === '/multiview/';
}

function getHighestVisibleSlot(slots: Record<SlotId, string | null>) {
  const occupied = [1, 2, 3, 4].filter((slot) => Boolean(slots[slot as SlotId]));
  return occupied.length ? Math.max(...occupied) : 1;
}

export function HeaderControls() {
  const isMultiviewRoute = useIsMultiviewRoute();
  const slots = useMultiviewStore((state) => state.slots);
  const targetSlot = useMultiviewStore((state) => state.targetSlot);
  const focusMode = useMultiviewStore((state) => state.focusMode);
  const setTargetSlot = useMultiviewStore((state) => state.setTargetSlot);
  const setActiveSlot = useMultiviewStore((state) => state.setActiveSlot);
  const toggleFocusMode = useMultiviewStore((state) => state.toggleFocusMode);

  const filledCount = useMemo(() => Object.values(slots).filter(Boolean).length, [slots]);
  const highest = useMemo(() => getHighestVisibleSlot(slots), [slots]);

  const showFocus = isMultiviewRoute && filledCount >= 2;
  const showSlots = isMultiviewRoute && highest >= 2;

  return (
    <>
      <button
        className={`focus-btn${focusMode ? ' is-active' : ''}`}
        type="button"
        aria-pressed={focusMode ? 'true' : 'false'}
        hidden={!showFocus}
        onClick={toggleFocusMode}
      >
        Focus mode
      </button>

      <div className="slot-toggle" role="group" aria-label="Target slot" hidden={!showSlots}>
        {[1, 2, 3, 4].map((slot) => {
          const isVisible = slot <= highest;
          return (
            <button
              key={slot}
              className={`slot-toggle__btn${slot === targetSlot ? ' is-active' : ''}`}
              data-slot={slot}
              type="button"
              hidden={!showSlots || !isVisible}
              onClick={() => {
                setTargetSlot(slot as SlotId);
                setActiveSlot(slot as SlotId);
              }}
            >
              {slot}
            </button>
          );
        })}
      </div>
    </>
  );
}
