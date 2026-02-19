import { preferredGameName, trovoStreamsLimit } from '../config.js';
import { runtime } from '../store.js';

export async function hydrateTrovoStreams() {
  try {
    const url = `/api/trovo/streams-by-game?name=${encodeURIComponent(preferredGameName)}&first=${trovoStreamsLimit}`;
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

    return json.data;
  } catch (e) {
    runtime.source = 'error';
    runtime.error = e instanceof Error ? e.message : String(e);
    return null;
  }
}

