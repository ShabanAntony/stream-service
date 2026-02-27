export type Platform = 'twitch';

export type SlotId = 1 | 2 | 3 | 4;

export interface StreamItem {
  id: string;
  platform: Platform;
  channel: string;
  title: string;
  url: string;
  isLive: boolean;
  category?: string | null;
  language?: string | null;
  viewerCount?: number | null;
  createdAt?: string | null;
  profileImageUrl?: string | null;
}
