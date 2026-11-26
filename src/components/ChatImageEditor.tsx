import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Button, Modal } from 'antd';
import { decodeChatImage } from '../services/chatImage';
import type { Language } from '../types/auth';

export function ChatImageEditor({ file, language, onClose, onApply }: {
  file: File; language: Language; onClose: () => void; onApply: (file: File) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const original = useRef<HTMLImageElement | null>(null);
  const pointer = useRef<number | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [color, setColor] = useState('#ef4444');
  const [changed, setChanged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const ru = language === 'ru';

  useEffect(() => {
    let active = true;
    void decodeChatImage(file).then(image => {
      const surface = canvas.current;
      if (!active || !surface) return;
      const scale = Math.min(1, 2560 / Math.max(image.naturalWidth, image.naturalHeight));
      surface.width = Math.max(1, Math.round(image.naturalWidth * scale));
      surface.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = surface.getContext('2d');
      if (!context) throw new Error();
      context.drawImage(image, 0, 0, surface.width, surface.height);
      original.current = image;
      setState('ready');
    }).catch(() => { if (active) setState('unavailable'); });
    return () => { active = false; };
  }, [file]);

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const surface = event.currentTarget;
    const bounds = surface.getBoundingClientRect();
    return [
      (event.clientX - bounds.left) * surface.width / bounds.width,
      (event.clientY - bounds.top) * surface.height / bounds.height,
    ] as const;
  }

  function clear() {
    const surface = canvas.current;
    if (!surface || !original.current) return;
    const context = surface.getContext('2d');
    context?.clearRect(0, 0, surface.width, surface.height);
    context?.drawImage(original.current, 0, 0, surface.width, surface.height);
    setChanged(false);
  }

  function apply() {
    if (!changed) { onClose(); return; }
    if (!canvas.current) return;
    setFailed(false);
    setSaving(true);
    canvas.current.toBlob(blob => {
      setSaving(false);
      if (!blob) { setFailed(true); return; }
      const extension = blob.type === 'image/webp' ? 'webp' : 'png';
      onApply(new File([blob], file.name.replace(/\.[^.]+$/, '') + '-edited.' + extension, { type: blob.type }));
    }, 'image/webp', 0.95);
  }

  return (
    <Modal open centered width={640} onCancel={saving ? undefined : onClose} closable={!saving} keyboard={!saving}
      mask={{ closable: false }} title={ru ? 'Фото перед отправкой' : 'Rasmni yuborishdan oldin'}
      footer={<Button type="primary" loading={saving} disabled={state === 'loading'} onClick={apply}>
        {ru ? 'Готово' : 'Tayyor'}
      </Button>}>
      {state === 'loading' && <p role="status">{ru ? 'Загрузка…' : 'Rasm ochilmoqda…'}</p>}
      {state === 'unavailable' && <p role="status">{ru
        ? 'Этот формат можно отправить как оригинал. Предпросмотр и рисование недоступны.'
        : 'Bu formatni asl fayl sifatida yuborish mumkin. Oldindan ko‘rish va chizish mavjud emas.'}</p>}
      <div className={state === 'ready' ? 'flex justify-center overflow-hidden rounded-2xl bg-slate-100 p-2' : 'hidden'}>
        <canvas ref={canvas} className="block h-auto max-h-[55dvh] w-auto max-w-full touch-none object-contain"
          aria-label={ru ? 'Рисование на фото' : 'Rasm ustiga chizish'}
          onPointerDown={event => {
            if (!event.isPrimary || event.button !== 0 || saving) return;
            const context = event.currentTarget.getContext('2d');
            if (!context) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            pointer.current = event.pointerId;
            const [x, y] = point(event);
            const width = 4 * event.currentTarget.width / event.currentTarget.getBoundingClientRect().width;
            context.fillStyle = color;
            context.beginPath();
            context.arc(x, y, width / 2, 0, 2 * Math.PI);
            context.fill();
            context.beginPath();
            context.moveTo(x, y);
            context.lineWidth = width;
            context.lineCap = 'round';
            context.lineJoin = 'round';
            context.strokeStyle = color;
            setChanged(true);
          }}
          onPointerMove={event => {
            if (pointer.current !== event.pointerId) return;
            const context = event.currentTarget.getContext('2d');
            const [x, y] = point(event);
            context?.lineTo(x, y);
            context?.stroke();
            context?.beginPath();
            context?.moveTo(x, y);
          }}
          onLostPointerCapture={() => { pointer.current = null; }} />
      </div>
      {state === 'ready' && <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm">{ru ? 'Цвет линии' : 'Chiziq rangi'}</span>
        {(ru ? ['Красный', 'Зелёный', 'Синий', 'Белый'] : ['Qizil', 'Yashil', 'Ko‘k', 'Oq']).map((name, i) => {
          const value = ['#ef4444', '#16a34a', '#2563eb', '#ffffff'][i];
          return <button key={value} type="button" style={{ backgroundColor: value }} aria-label={name}
            aria-pressed={color === value} onClick={() => setColor(value)}
            className="size-9 rounded-full border border-slate-300 aria-pressed:ring-2 aria-pressed:ring-slate-800 aria-pressed:ring-offset-1" />;
        })}
        <Button disabled={!changed || saving} onClick={clear}>{ru ? 'Очистить' : 'Chiziqlarni tozalash'}</Button>
      </div>}
      {failed && <p role="alert">{ru ? 'Не удалось сохранить фото.' : 'Rasmni saqlab bo‘lmadi.'}</p>}
    </Modal>
  );
}
