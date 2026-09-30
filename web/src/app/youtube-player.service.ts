import { Injectable } from '@angular/core';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type YTNamespace = any;

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const ENDED_STATE = 0;

let apiLoadPromise: Promise<void> | null = null;

@Injectable({ providedIn: 'root' })
export class YoutubePlayerService {
  readonly ENDED_STATE = ENDED_STATE;

  loadApi(): Promise<void> {
    if (window.YT?.Player) {
      return Promise.resolve();
    }
    if (!apiLoadPromise) {
      apiLoadPromise = new Promise((resolve) => {
        window.onYouTubeIframeAPIReady = () => resolve();
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(script);
      });
    }
    return apiLoadPromise;
  }

  async createPlayer(element: HTMLElement, videoId: string, onEnded: () => void): Promise<YTNamespace> {
    await this.loadApi();
    return new window.YT.Player(element, {
      videoId,
      host: 'https://www.youtube-nocookie.com',
      playerVars: { rel: 0, autoplay: 1, playsinline: 1 },
      events: {
        onStateChange: (event: { data: number }) => {
          if (event.data === ENDED_STATE) {
            onEnded();
          }
        },
      },
    });
  }
}
