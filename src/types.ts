export interface IPTVChannel {
  id: string;
  name: string;
  url: string;
  logo: string;
  category: string;
  language?: string;
  country?: string;
}

export interface PlaybackState {
  playing: boolean;
  volume: number;
  muted: boolean;
  buffered: number;
  currentTime: number;
  duration: number;
}
