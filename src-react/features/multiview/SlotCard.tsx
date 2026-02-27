import { memo } from 'react';
import { getStreamById, useMultiviewStore } from './store';
import { SlotPlayer } from './SlotPlayer';
import type { SlotId } from './types';

interface SlotCardProps {
  slotId: SlotId;
  hidden: boolean;
}

export const SlotCard = memo(function SlotCard({ slotId, hidden }: SlotCardProps) {
  const streams = useMultiviewStore((state) => state.streams);
  const streamId = useMultiviewStore((state) => state.slots[slotId]);
  const activeSlot = useMultiviewStore((state) => state.activeSlot);
  const targetSlot = useMultiviewStore((state) => state.targetSlot);
  const focusMode = useMultiviewStore((state) => state.focusMode);
  const hoverSlot = useMultiviewStore((state) => state.hoverSlot);
  const setActiveSlot = useMultiviewStore((state) => state.setActiveSlot);
  const setTargetSlot = useMultiviewStore((state) => state.setTargetSlot);
  const setHoverSlot = useMultiviewStore((state) => state.setHoverSlot);
  const clearSlot = useMultiviewStore((state) => state.clearSlot);

  const stream = getStreamById(streams, streamId);
  const isActive = activeSlot === slotId;
  const isTarget = targetSlot === slotId;
  const isFocusTarget = focusMode && (isActive || hoverSlot === slotId);

  return (
    <div
      className={`slot js-slot${isActive ? ' is-active' : ''}${isFocusTarget ? ' is-focus-target' : ''}`}
      data-slot={slotId}
      hidden={hidden}
      onClick={() => {
        setActiveSlot(slotId);
        setTargetSlot(slotId);
      }}
      onMouseEnter={() => {
        if (!focusMode) return;
        setHoverSlot(slotId);
      }}
      onMouseLeave={() => {
        if (!focusMode) return;
        setHoverSlot(null);
      }}
    >
      <div className="slot__top">
        <div className="slot__title">Slot {slotId}</div>
        <div>
          <button
            className="slot__action"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setTargetSlot(slotId);
            }}
          >
            {isTarget ? 'Targeted' : 'Target'}
          </button>
          <button
            className="slot__action js-slot-clear"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearSlot(slotId);
            }}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="slot__body js-slot-body">
        {stream ? (
          <SlotPlayer key={`${stream.platform}:${stream.channel}`} stream={stream} isActive={isActive} />
        ) : (
          <div className="slot__empty">Empty</div>
        )}
      </div>
    </div>
  );
});
