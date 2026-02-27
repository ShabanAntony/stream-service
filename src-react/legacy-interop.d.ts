declare module '../src/config.js' {
  export const preferredGameName: string;
  export const twitchStreamsLimit: number;
}

declare module '../../../src/config.js' {
  export const preferredGameName: string;
  export const twitchStreamsLimit: number;
}

declare module '../../../src/data/fallbackStreams.js' {
  export const fallbackStreams: Array<Record<string, unknown>>;
}
