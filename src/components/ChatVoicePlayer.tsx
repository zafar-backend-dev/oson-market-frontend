import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import type { Language } from '../types/auth';

let playingAudio: HTMLAudioElement | null = null;

export function voiceTime(seconds: number) {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function ChatVoicePlayer({ url, language, autoPlay = false, durationHint = 0 }: {
  url: string; language: Language; autoPlay?: boolean; durationHint?: number;
}) {
  const completed = useRef(false);
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(durationHint);
  const [failed, setFailed] = useState(false);
  const ru = language === 'ru';

  useEffect(() => {
    const element = audio.current;
    completed.current = false;
    setElapsed(0);
    setPlaying(false);
    if (autoPlay) void element?.play().catch(() => {});
    return () => {
      element?.pause();
      if (playingAudio === element) playingAudio = null;
    };
  }, [url, autoPlay]);

  function sync() {
    const element = audio.current;
    if (!element) return;
    const end = element.seekable.length ? element.seekable.end(element.seekable.length - 1) : 0;
    const length = Number.isFinite(element.duration) && element.duration > 0
      ? element.duration : Math.max(durationHint, Number.isFinite(end) ? end : 0, element.currentTime);
    setDuration(completed.current ? Math.max(duration, length) : length);
    setElapsed(completed.current ? Math.max(duration, length) : element.currentTime);
  }

  function toggle() {
    const element = audio.current;
    if (!element) return;
    if (!element.paused) element.pause();
    else {
      if (completed.current) {
        completed.current = false;
        element.currentTime = 0;
        setElapsed(0);
      }
      void element.play().catch(() => setFailed(true));
    }
  }

  return <div className="flex w-52 max-w-full items-center gap-3 rounded-xl bg-white/65 p-2 sm:w-64">
    <audio ref={audio} src={url} preload="metadata" onLoadedMetadata={sync} onDurationChange={sync}
      onTimeUpdate={sync} onPause={() => setPlaying(false)} onEnded={() => { completed.current = true; sync(); setPlaying(false); }}
      onError={() => setFailed(true)} onPlay={event => {
        const element = event.currentTarget;
        if (playingAudio !== element) playingAudio?.pause();
        playingAudio = element;
        setFailed(false);
        setPlaying(true);
      }} />
    <button type="button" onClick={toggle}
      className="grid size-11 shrink-0 place-items-center rounded-full bg-green-700 text-white"
      aria-label={playing ? (ru ? 'Пауза' : 'Pauza') : (ru ? 'Воспроизвести' : 'Tinglash')}>
      {playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}
    </button>
    <div className="min-w-0 flex-1">
      <input type="range" min={0} max={duration || 1} step="any" value={Math.min(elapsed, duration)}
        disabled={!duration} aria-label={ru ? 'Позиция воспроизведения' : 'Tinglash joyi'}
        className="block h-5 w-full accent-green-700" onChange={event => {
          const element = audio.current;
          if (element) {
            completed.current = false;
            element.currentTime = Number(event.target.value);
            sync();
          }
        }} />
      <div className="flex justify-between text-xs tabular-nums text-slate-600">
        <span>{voiceTime(elapsed)}</span><span>{duration > 0 ? voiceTime(duration) : '—'}</span>
      </div>
      {failed && <p role="status" className="text-xs text-red-700">{ru ? 'Ошибка воспроизведения' : 'Ovozni ijro qilib bo‘lmadi'}</p>}
    </div>
  </div>;
}
