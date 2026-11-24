import { Select } from 'antd';
import { ChevronDown, Globe } from 'lucide-react';
import type { Language } from '../types/auth';

interface LanguageSelectorProps {
  value: Language;
  onChange: (lang: Language) => void;
  ariaLabel?: string;
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

export function LanguageSelector({ value, onChange, ariaLabel }: LanguageSelectorProps) {
  const activeOption =
    LANGUAGE_OPTIONS.find((item) => item.value === value) ?? LANGUAGE_OPTIONS[0];

  return (
    <>
      {/* Compact toggle button on narrow mobile viewports (320px–639px) */}
      <button
        type="button"
        onClick={() => onChange(value === 'uz' ? 'ru' : 'uz')}
        aria-label={ariaLabel || 'Language'}
        className="sm:hidden inline-flex items-center justify-center min-w-[40px] h-10 px-2 rounded-lg border border-[#e6e4dd] bg-white text-xs font-semibold text-slate-800 hover:border-[#86efac] transition-colors cursor-pointer shrink-0"
      >
        {activeOption.code}
      </button>

      {/* Full selector on tablet & desktop (>= 640px) */}
      <div className="hidden sm:block">
        <Select<Language>
          value={value}
          onChange={onChange}
          aria-label={ariaLabel || 'Language'}
          suffix={<ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          popupMatchSelectWidth={false}
          className="oson-lang-select min-w-[132px]"
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
                <Globe className="w-3.5 h-3.5 text-[#1677ff] shrink-0" />
                <span>{opt.label}</span>
              </span>
            );
          }}
          options={LANGUAGE_OPTIONS.map((opt) => ({
            value: opt.value,
            label: (
              <div className="flex items-center justify-between gap-4 py-0.5">
                <span className="inline-flex items-center gap-2.5 text-sm font-medium text-slate-800">
                  {opt.flag === 'uz' ? <UzFlag /> : <RuFlag />}
                  <span>{opt.label}</span>
                </span>
                <span className="font-mono-tabular text-[11px] font-medium text-slate-400">
                  {opt.code}
                </span>
              </div>
            ),
          }))}
        />
      </div>
    </>
  );
}
