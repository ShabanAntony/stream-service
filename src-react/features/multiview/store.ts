import { create } from 'zustand';
import { sampleStreams } from './sampleStreams';
import { getFallbackStreams, loadLiveStreams } from './dataBridge';
import type { SlotId, StreamItem } from './types';

type SlotMap = Record<SlotId, string | null>;

interface MultiviewState {
  streams: StreamItem[];
  directoryList: StreamItem[];
  directoryMeta: string;
  source: 'sample' | 'fallback' | 'live';
  loading: boolean;
  error: string;
  slots: SlotMap;
  activeSlot: SlotId;
  targetSlot: SlotId;
  focusMode: boolean;
  hoverSlot: SlotId | null;
  setStreams: (streams: StreamItem[], source: MultiviewState['source']) => void;
  setDirectoryList: (list: StreamItem[], metaText: string) => void;
  hydrateLiveStreams: () => Promise<void>;
  useFallbackStreams: () => void;
  seedFromUrl: (search: string) => void;
  setTargetSlot: (slot: SlotId) => void;
  setActiveSlot: (slot: SlotId) => void;
  setHoverSlot: (slot: SlotId | null) => void;
  setFocusMode: (next: boolean) => void;
  toggleFocusMode: () => void;
  assignStreamToTarget: (streamId: string) => void;
  assignStreamToSlot: (slot: SlotId, streamId: string) => void;
  clearSlot: (slot: SlotId) => void;
}

const initialSlots: SlotMap = {
  1: null,
  2: null,
  3: null,
  4: null,
};

function compactSlots(slots: SlotMap): SlotMap {
  const ordered = [slots[1], slots[2], slots[3], slots[4]].filter(Boolean) as string[];
  return {
    1: ordered[0] || null,
    2: ordered[1] || null,
    3: ordered[2] || null,
    4: ordered[3] || null,
  };
}

function getNextEmptySlot(slots: SlotMap): SlotId {
  for (const slot of [1, 2, 3, 4] as const) {
    if (!slots[slot]) return slot;
  }
  return 4;
}

export const useMultiviewStore = create<MultiviewState>((set, get) => ({
  streams: sampleStreams,
  directoryList: sampleStreams,
  directoryMeta: `${sampleStreams.length} results · sample`,
  source: 'sample',
  loading: false,
  error: '',
  slots: initialSlots,
  activeSlot: 1,
  targetSlot: 1,
  focusMode: false,
  hoverSlot: null,
  setStreams: (streams, source) => set({ streams, source, error: '' }),
  setDirectoryList: (list, metaText) =>
    set({
      directoryList: Array.isArray(list) ? list : [],
      directoryMeta: typeof metaText === 'string' ? metaText : '',
    }),
  hydrateLiveStreams: async () => {
    set({ loading: true, error: '' });
    try {
      const streams = await loadLiveStreams();
      if (streams.length) {
        set({ streams, source: 'live', loading: false, error: '' });
        return;
      }
      const fallback = getFallbackStreams();
      set({
        streams: fallback.length ? fallback : sampleStreams,
        source: fallback.length ? 'fallback' : 'sample',
        loading: false,
        error: 'Live sources returned no streams. Showing fallback data.',
      });
    } catch (error) {
      const fallback = getFallbackStreams();
      set({
        streams: fallback.length ? fallback : sampleStreams,
        source: fallback.length ? 'fallback' : 'sample',
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to hydrate live streams',
      });
    }
  },
  useFallbackStreams: () => {
    const fallback = getFallbackStreams();
    set({
      streams: fallback.length ? fallback : sampleStreams,
      source: fallback.length ? 'fallback' : 'sample',
      error: '',
    });
  },
  seedFromUrl: (search) => {
    const params = new URLSearchParams(search);
    const seed = params.get('seed');
    if (!seed) return;
    const state = get();
    const exists = state.streams.some((stream) => stream.id === seed);
    if (!exists) return;
    set((current) => ({
      slots: {
        ...current.slots,
        1: seed,
      },
      activeSlot: 1,
      targetSlot: 1,
    }));
  },
  setTargetSlot: (slot) => set({ targetSlot: slot }),
  setActiveSlot: (slot) => set({ activeSlot: slot, targetSlot: slot }),
  setHoverSlot: (slot) => set({ hoverSlot: slot }),
  setFocusMode: (next) => set({ focusMode: Boolean(next) }),
  toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),
  assignStreamToTarget: (streamId) =>
    set((state) => {
      const slot = state.targetSlot || getNextEmptySlot(state.slots);
      return {
        slots: {
          ...state.slots,
          [slot]: streamId,
        },
        activeSlot: slot,
        targetSlot: slot,
      };
    }),
  assignStreamToSlot: (slot, streamId) =>
    set((state) => ({
      slots: {
        ...state.slots,
        [slot]: streamId,
      },
      activeSlot: slot,
      targetSlot: slot,
    })),
  clearSlot: (slot) =>
    set((state) => {
      const nextSlots = compactSlots({
        ...state.slots,
        [slot]: null,
      });
      const occupied = ([1, 2, 3, 4] as const).filter((slotId) => Boolean(nextSlots[slotId]));
      const fallback = occupied.length ? occupied[0] : 1;
      const nextActive = occupied.includes(state.activeSlot) ? state.activeSlot : fallback;
      const nextTarget = occupied.includes(state.targetSlot) ? state.targetSlot : fallback;
      return {
        slots: nextSlots,
        activeSlot: nextActive,
        targetSlot: nextTarget,
      };
    }),
}));

export function getStreamById(streams: StreamItem[], streamId: string | null) {
  if (!streamId) return null;
  return streams.find((stream) => stream.id === streamId) ?? null;
}
