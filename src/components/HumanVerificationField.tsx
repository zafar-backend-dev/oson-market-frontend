import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, RefreshCw, ShieldCheck } from 'lucide-react';
import { translations } from '../i18n/translations';
import type { Language } from '../types/auth';

interface HumanVerificationFieldProps {
  language: Language;
  value?: boolean;
  onChange?: (verified: boolean) => void;
  disabled?: boolean;
  resetSignal?: number;
}

interface MathChallenge {
  label: string;
  answer: number;
  options: number[];
}

function createMathChallenge(): MathChallenge {
  const useSubtraction = Math.random() > 0.55;
  let a = Math.floor(Math.random() * 9) + 2; // 2..10
  let b = Math.floor(Math.random() * 8) + 1; // 1..8

  if (useSubtraction && a <= b) {
    const temp = a + b;
    a = temp;
  }

  const answer = useSubtraction ? a - b : a + b;
  const label = `${a} ${useSubtraction ? '−' : '+'} ${b} = ?`;

  const optionSet = new Set<number>([answer]);
  while (optionSet.size < 4) {
    const offset = Math.floor(Math.random() * 7) - 3; // -3..+3
    const candidate = answer + offset;
    if (candidate >= 0 && candidate !== answer) {
      optionSet.add(candidate);
    }
  }

  const options = Array.from(optionSet).sort(() => Math.random() - 0.5);
  return { label, answer, options };
}

export function HumanVerificationField({
  language,
  value = false,
  onChange,
  disabled = false,
  resetSignal = 0,
}: HumanVerificationFieldProps) {
  const t = translations[language].humanCheck;
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [wrongAttempt, setWrongAttempt] = useState(false);
  const [challenge, setChallenge] = useState<MathChallenge>(() => createMathChallenge());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<number | null>(null);

  const regenerateChallenge = useCallback(() => {
    setChallenge(createMathChallenge());
  }, []);

  useEffect(() => {
    if (resetSignal > 0) {
      setChallengeOpen(false);
      setChecking(false);
      setWrongAttempt(false);
      regenerateChallenge();
      onChange?.(false);
    }
  }, [resetSignal, regenerateChallenge, onChange]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!challengeOpen || value) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 128;
    const height = 36;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    // Subtle distortion lines
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 20, Math.random() * height);
      ctx.bezierCurveTo(
        width * 0.33,
        Math.random() * height,
        width * 0.66,
        Math.random() * height,
        width - Math.random() * 15,
        Math.random() * height,
      );
      ctx.stroke();
    }

    // Render challenge characters with slight angle jitter
    const chars = challenge.label.split('');
    const startX = 12;
    const stepX = (width - 24) / Math.max(chars.length, 1);
    ctx.font = '600 15px "JetBrains Mono", monospace';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#0f172a';

    chars.forEach((ch, idx) => {
      ctx.save();
      const x = startX + idx * stepX + stepX * 0.3;
      const y = height / 2 + (Math.random() * 4 - 2);
      const angle = (Math.random() - 0.5) * 0.16;
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillText(ch, -4, 0);
      ctx.restore();
    });
  }, [challenge, challengeOpen, value]);

  const handleToggleBox = () => {
    if (disabled || checking) return;
    if (value) {
      onChange?.(false);
      setChallengeOpen(false);
      setWrongAttempt(false);
      regenerateChallenge();
      return;
    }

    setWrongAttempt(false);
    setChecking(true);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setChecking(false);
      regenerateChallenge();
      setChallengeOpen(true);
    }, 240);
  };

  const handleSelectOption = (option: number) => {
    if (disabled) return;
    if (option === challenge.answer) {
      setWrongAttempt(false);
      setChallengeOpen(false);
      onChange?.(true);
    } else {
      setWrongAttempt(true);
      onChange?.(false);
      regenerateChallenge();
    }
  };

  return (
    <div
      className={`rounded-lg border transition-colors ${
        value
          ? 'border-emerald-300 bg-emerald-50/40'
          : 'border-slate-200 bg-slate-50/70'
      }`}
    >
      <div className="px-3.5 py-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleToggleBox}
          disabled={disabled}
          aria-pressed={value}
          className="flex items-center gap-3 text-left cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
        >
          <span
            className={`w-5 h-5 rounded flex items-center justify-center border transition-all shrink-0 ${
              value
                ? 'bg-[#16a34a] border-[#16a34a] text-white'
                : checking
                  ? 'border-[#16a34a] bg-[#f0fdf4]'
                  : 'bg-white border-slate-300 group-hover:border-[#16a34a]'
            }`}
          >
            {value ? (
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : checking ? (
              <span className="w-2.5 h-2.5 rounded-full border-2 border-[#16a34a] border-t-transparent animate-spin" />
            ) : null}
          </span>

          <span className="text-sm font-medium text-slate-800 select-none">
            {value ? t.verifiedLabel : t.checkboxLabel}
          </span>
        </button>

        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 shrink-0 select-none">
          <ShieldCheck
            className={`w-4 h-4 ${value ? 'text-[#16a34a]' : 'text-slate-400'}`}
          />
          <span className="hidden sm:inline">{t.badgeLabel}</span>
        </div>
      </div>

      {challengeOpen && !value && (
        <div className="px-3.5 pb-3.5 pt-2.5 border-t border-slate-200/80 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-600">{t.promptLabel}</span>
            <button
              type="button"
              onClick={() => {
                setWrongAttempt(false);
                regenerateChallenge();
              }}
              disabled={disabled}
              title={t.refreshLabel}
              aria-label={t.refreshLabel}
              className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <canvas
              ref={canvasRef}
              width={128}
              height={36}
              className="w-[128px] h-[36px] rounded border border-slate-200 bg-slate-50 shrink-0"
              aria-label={t.canvasAlt}
            />

            <div className="flex-1 grid grid-cols-4 gap-1.5 min-w-[160px]">
              {challenge.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSelectOption(option)}
                  className="h-10 rounded-md border border-slate-200 bg-white text-slate-800 font-mono-tabular text-sm font-semibold hover:border-[#16a34a] hover:text-[#15803d] hover:bg-[#f0fdf4] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {wrongAttempt && (
            <p className="text-xs text-red-600 font-medium">{t.wrongAnswer}</p>
          )}
        </div>
      )}
    </div>
  );
}
