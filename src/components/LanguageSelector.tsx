import { Select } from 'antd';
import { ChevronDown } from 'lucide-react';
import type { Language } from '../types/auth';

interface LanguageSelectorProps {
  value: Language;
  onChange: (lang: Language) => void;
  ariaLabel?: string;
  fullWidth?: boolean;
}

function UzFlag() {
  return (
    <svg
      className="w-4 h-3 rounded-[2px] border border-slate-200 shrink-0"
      viewBox="0 0 24 18"
      aria-hidden="true"
    >
      <rect width="24" height="6" fill="#0099B5" />
      <rect y="6" width="24" height="6" fill="#FFFFFF" />
      <rect y="5.5" width="24" height="0.8" fill="#CE1126" />
      <rect y="11.7" width="24" height="0.8" fill="#CE1126" />
      <rect y="12" width="24" height="6" fill="#1EB53A" />
      <path fill="#fff" d="M5.8 1a2.2 2.2 0 1 0 0 4.4 2.5 2.5 0 0 1 0-4.4Z" />
      <path stroke="#fff" strokeWidth=".55" strokeLinecap="round"
        d="M9 1.5h.1m1.5 0h.1m1.5 0h.1M8 3h.1m1.5 0h.1m1.5 0h.1m1.5 0h.1M7 4.5h.1m1.5 0h.1m1.5 0h.1m1.5 0h.1m1.5 0h.1" />
    </svg>
  );
}

function RuFlag() {
  return (
    <svg
      className="w-4 h-3 rounded-[2px] border border-slate-200 shrink-0"
      viewBox="0 0 24 18"
      aria-hidden="true"
    >
      <rect width="24" height="6" fill="#FFFFFF" />
      <rect y="6" width="24" height="6" fill="#0039A6" />
      <rect y="12" width="24" height="6" fill="#D52B1E" />
    </svg>
  );
}

const LANGUAGE_OPTIONS: {
  value: Language;
  label: string;
  code: string;
  flag: 'uz' | 'ru';
}[] = [
  { value: 'uz', label: 'O‘zbekcha', code: 'UZ', flag: 'uz' },
  { value: 'ru', label: 'Русский', code: 'RU', flag: 'ru' },
];

export function LanguageSelector({ value, onChange, ariaLabel, fullWidth = false }: LanguageSelectorProps) {
  return (
    <div className={fullWidth ? "w-full" : "shrink-0"}>
        <Select<Language>
          value={value}
          onChange={onChange}
          aria-label={ariaLabel || 'Language'}
          suffix={<ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          popupMatchSelectWidth={fullWidth}
          size={fullWidth ? 'large' : 'middle'}
          className={fullWidth ? "w-full" : "oson-lang-select w-[52px] sm:w-[142px]"}
          styles={{
            popup: {
              root: {
                minWidth: 184,
                padding: 4,
                borderRadius: 10,
              },
            },
          }}
          labelRender={(props) => {
            const opt = LANGUAGE_OPTIONS.find((item) => item.value === props.value);
            if (!opt) return null;
            return (
              <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-800 whitespace-nowrap">
                {opt.flag === 'uz' ? <UzFlag /> : <RuFlag />}
                <span className={fullWidth ? "text-sm" : "sr-only sm:not-sr-only"}>{opt.label}</span>
              </span>
            );
          }}
          options={LANGUAGE_OPTIONS.map((opt) => ({
            value: opt.value,
            label: (
              <div className="flex items-center justify-between gap-4 py-0.5">
                <span className="inline-flex items-center gap-2.5 text-sm font-medium text-slate-800">
                  {opt.flag === 'uz' ? <UzFlag /> : <RuFlag />}
                  <span >{opt.label}</span>
                </span>
                <span className="font-mono-tabular text-[11px] font-medium text-slate-400">
                  {opt.code}
                </span>
              </div>
            ),
          }))}
        />
      </div>
  );
}
