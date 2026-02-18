import { preferredGameName, twitchStreamsLimit } from '../config.js';
import { runtime, setStreams } from '../store.js';

export async function hydrateTwitchStreams() {
  try {
    const url = `/api/twitch/streams-by-game?name=${encodeURIComponent(preferredGameName)}&first=${twitchStreamsLimit}`;
    const res = await fetch(url);

    if (!res.ok) {
      runtime.source = 'error';
      runtime.error = `API ${res.status}`;
      return null;
    }

    const json = await res.json();
    if (!json || !Array.isArray(json.data)) {
      runtime.source = 'error';
      runtime.error = 'Invalid API response';
      return null;
    }

    setStreams(json.data, 'live');
    return json.data;
  } catch (e) {
    runtime.source = 'error';
    runtime.error = e instanceof Error ? e.message : String(e);
    return null;
  }
}

