import { useState } from 'react';
import type { Language } from '../types/auth';

const groups = [
  { icon: 0x1f600, uz: 'Yuzlar', ru: 'Смайлы', ranges: [[0x1f600, 0x1f64f], [0x1f910, 0x1f917], [0x1f920, 0x1f925], [0x1f970, 0x1f97a]] },
  { icon: 0x1f44b, uz: 'Imo-ishoralar', ru: 'Жесты', ranges: [[0x1f44a, 0x1f450], [0x1f446, 0x1f449], [0x1f918, 0x1f91f], [0x1f932, 0x1f933]] },
  { icon: 0x1f496, uz: 'Belgilar', ru: 'Символы', ranges: [[0x1f493, 0x1f49f], [0x1f90d, 0x1f90e], [0x1f4af, 0x1f4af], [0x2705, 0x2705], [0x1f525, 0x1f525], [0x1f389, 0x1f38a]] },
  { icon: 0x1f436, uz: 'Tabiat', ru: 'Природа', ranges: [[0x1f331, 0x1f33e], [0x1f415, 0x1f429], [0x1f42d, 0x1f43a]] },
  { icon: 0x1f355, uz: 'Taomlar', ru: 'Еда', ranges: [[0x1f345, 0x1f37f], [0x1f950, 0x1f95d]] },
];

export function ChatEmojiPicker({ language, onChoose }: { language: Language; onChoose: (emoji: string) => void }) {
  const [groupIndex, setGroupIndex] = useState(0);
  const ru = language === 'ru';
  const group = groups[groupIndex];
  const emojis = group.ranges.flatMap(([start, end]) =>
    Array.from({ length: end - start + 1 }, (_, index) => String.fromCodePoint(start + index)));
  return (
    <section aria-label={ru ? 'Выбор эмодзи' : 'Emoji tanlash'} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      <div className="flex justify-around border-b border-slate-200 bg-white p-1">
        {groups.map(({ icon, uz, ru: label }, index) => (
          <button key={icon} type="button" aria-label={ru ? label : uz} aria-pressed={index === groupIndex}
            onClick={() => setGroupIndex(index)}
            className="grid size-10 place-items-center rounded-xl text-xl aria-pressed:bg-green-100">
            {String.fromCodePoint(icon)}
          </button>
        ))}
      </div>
      <div key={groupIndex} className="grid max-h-[min(28dvh,12rem)] grid-cols-7 overflow-y-auto overscroll-contain p-1 sm:grid-cols-9">
        {emojis.map(emoji => (
          <button key={emoji} type="button" onClick={() => onChoose(emoji)}
            className="grid min-h-9 place-items-center rounded-lg text-2xl active:bg-green-100">
            {emoji}
          </button>
        ))}
      </div>
    </section>
  );
}
