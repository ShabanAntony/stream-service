import { kickStreams } from './kickStreams.js';

// Used when the API proxy isn't running / configured yet.
export const fallbackStreams = [
  ...kickStreams,
  {
    id: 'twitch-alohadancetv',
    platform: 'twitch',
    channel: 'alohadancetv',
    title: 'alohadancetv',
    category: 'Unknown',
    language: 'ru',
    region: null,
    viewerCount: 0,
    createdAt: null,
    url: 'https://www.twitch.tv/alohadancetv',
    isLive: false,
    profileImageUrl: null,
  },
];

