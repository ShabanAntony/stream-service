import { SlotCard } from './SlotCard';
import { useMultiviewStore } from './store';

export function SlotGrid() {
  const slots = useMultiviewStore((state) => state.slots);
  const activeSlot = useMultiviewStore((state) => state.activeSlot);

  const occupied = (Object.entries(slots) as Array<[string, string | null]>)
    .map(([k, v]) => (v ? Number(k) : 0))
    .filter(Boolean);
  const highest = occupied.length ? Math.max(...occupied) : 1;
  const visibleCount = Math.max(1, Math.min(4, highest));
  const visibleSlotIds = [1, 2, 3, 4].slice(0, visibleCount) as Array<1 | 2 | 3 | 4>;
  const activeLayoutSlot =
    visibleCount === 3 && visibleSlotIds.includes(activeSlot)
      ? activeSlot
      : visibleSlotIds[0];

  return (
    <div className="multiview js-multiview" data-layout={visibleCount} data-active-slot={activeLayoutSlot}>
      {visibleSlotIds.map((slotId) => (
        <SlotCard key={slotId} slotId={slotId} />
      ))}
    </div>
  );
}
