import { SlotCard } from './SlotCard';
import { useMultiviewStore } from './store';

export function SlotGrid() {
  const slots = useMultiviewStore((state) => state.slots);

  const occupied = (Object.entries(slots) as Array<[string, string | null]>)
    .map(([k, v]) => (v ? Number(k) : 0))
    .filter(Boolean);
  const highest = occupied.length ? Math.max(...occupied) : 1;
  const visibleCount = Math.max(1, Math.min(4, highest));

  return (
    <div className="multiview js-multiview" data-layout={visibleCount}>
      {[1, 2, 3, 4].map((slotId) => (
        <SlotCard key={slotId} slotId={slotId as any} hidden={slotId > visibleCount} />
      ))}
    </div>
  );
}
