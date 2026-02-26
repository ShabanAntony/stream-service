import { fallbackStreams as legacyFallbackStreams } from '../../../src/data/fallbackStreams.js';
import { preferredGameName, twitchStreamsLimit } from '../../../src/config.js';
import type { StreamItem } from './types';

type RawStream = Partial<StreamItem> & Record<string, unknown>;

interface ApiDataResponse {
  data?: unknown;
  error?: string;
}

function isPlatform(value: unknown): value is StreamItem['platform'] {
  return value === 'twitch' || value === 'trovo';
}

function normalizeStream(raw: RawStream): StreamItem | null {
  const id = typeof raw.id === 'string' ? raw.id : null;
  const channel = typeof raw.channel === 'string' ? raw.channel : null;
  const title = typeof raw.title === 'string' ? raw.title : channel;
  const url = typeof raw.url === 'string' ? raw.url : null;
  const platform = isPlatform(raw.platform) ? raw.platform : null;

  if (!id || !channel || !title || !url || !platform) {
    return null;
  }

  return {
    id,
    platform,
    channel,
    title,
    url,
    isLive: raw.isLive !== false,
    category: typeof raw.category === 'string' ? raw.category : null,
    language: typeof raw.language === 'string' ? raw.language : null,
    viewerCount: typeof raw.viewerCount === 'number' ? raw.viewerCount : null,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : null,
    profileImageUrl: typeof raw.profileImageUrl === 'string' ? raw.profileImageUrl : null,
  };
}

async function fetchJson(url: string): Promise<ApiDataResponse> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${url}`);
  }
  return (await res.json()) as ApiDataResponse;
}

async function fetchTwitchStreams() {
  const url = `/api/twitch/streams-by-game?name=${encodeURIComponent(preferredGameName)}&first=${twitchStreamsLimit}`;
  const json = await fetchJson(url);
  return Array.isArray(json.data) ? json.data : [];
}

export function getFallbackStreams(): StreamItem[] {
  return legacyFallbackStreams
    .map((item: Record<string, unknown>) => normalizeStream(item))
    .filter(Boolean) as StreamItem[];
}

export async function loadLiveStreams(): Promise<StreamItem[]> {
  const [twitch] = await Promise.allSettled([fetchTwitchStreams()]);
  const merged = [...(twitch.status === 'fulfilled' ? twitch.value : [])];

  const normalized = merged.map((item) => normalizeStream(item as RawStream)).filter(Boolean) as StreamItem[];

  if (normalized.length > 0) {
    return normalized;
  }

  const reasons = [twitch]
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map((result) => (result.reason instanceof Error ? result.reason.message : String(result.reason)));

  if (reasons.length) {
    throw new Error(reasons.join(' | '));
  }

  return [];
}
