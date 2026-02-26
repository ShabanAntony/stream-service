import type { StreamItem } from './types';

export const sampleStreams: StreamItem[] = [
  {
    id: 'tw-shroud',
    platform: 'twitch',
    channel: 'shroud',
    title: 'FPS ranked session',
    url: 'https://www.twitch.tv/shroud',
    isLive: true,
  },
  {
    id: 'tw-summit1g',
    platform: 'twitch',
    channel: 'summit1g',
    title: 'CS queue and chill',
    url: 'https://www.twitch.tv/summit1g',
    isLive: true,
  },
  {
    id: 'tw-tenz',
    platform: 'twitch',
    channel: 'tenz',
    title: 'VALORANT aim and ranked',
    url: 'https://www.twitch.tv/tenz',
    isLive: true,
  },
  {
    id: 'tw-n0tail',
    platform: 'twitch',
    channel: 'n0tail',
    title: 'Dota pubs and review',
    url: 'https://www.twitch.tv/n0tail',
    isLive: false,
  },
  {
    id: 'tw-s1mple',
    platform: 'twitch',
    channel: 's1mple',
    title: 'CS2 pugs and practice',
    url: 'https://www.twitch.tv/s1mple',
    isLive: false,
  },
];
