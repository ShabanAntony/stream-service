import type { StreamItem } from './types';

interface SlotPlayerProps {
  stream: StreamItem;
  isActive: boolean;
}

function buildEmbedUrl(stream: StreamItem) {
  if (stream.platform === 'twitch') {
    const url = new URL('https://player.twitch.tv/');
    url.searchParams.set('channel', stream.channel);
    url.searchParams.append('parent', window.location.hostname || 'localhost');
    url.searchParams.set('autoplay', 'true');
    url.searchParams.set('muted', 'true');
    return url.toString();
  }

  if (stream.platform === 'trovo') {
    const url = new URL('https://player.trovo.live/embed/player');
    url.searchParams.set('streamername', stream.channel);
    url.searchParams.set('autoplay', '1');
    url.searchParams.set('muted', '1');
    return url.toString();
  }

  return stream.url;
}

export function SlotPlayer({ stream, isActive }: SlotPlayerProps) {
  if (!stream.isLive) {
    return (
      <>
        <div className="slot__empty">Empty</div>
      </>
    );
  }

  const embedUrl = buildEmbedUrl(stream);

  return (
    <>
      <iframe
        className="slot__iframe"
        src={embedUrl}
        title={stream.title}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
      <div className="slot__overlay">
        <a className="slot__overlay-link" href={stream.url} target="_blank" rel="noreferrer">
          Open
        </a>
        <span className="slot__overlay-link">{isActive ? 'Active' : 'Muted'}</span>
      </div>
    </>
  );
}
