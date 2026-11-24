import { useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Table as TableIcon } from 'lucide-react';
import { translations } from '../i18n/translations';
import { formatInteger, formatShortYmdDate } from '../services/adminStatisticsApi';
import type { Language } from '../types/auth';

export type ChartMarkerShape = 'circle' | 'square' | 'diamond' | 'triangle';

export interface DailyChartSeriesConfig {
  key: string;
  label: string;
  color: string;
  shape: ChartMarkerShape;
}

interface DailyTrendChartProps {
  points: Record<string, string | number>[];
  series: DailyChartSeriesConfig[];
  language: Language;
  allowSeriesToggle?: boolean;
  defaultShowTable?: boolean;
}

function SeriesShapeMarker({
  shape,
  color,
  size = 10,
}: {
  shape: ChartMarkerShape;
  color: string;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true" className="shrink-0">
      {shape === 'circle' && <circle cx="6" cy="6" r="4.5" fill={color} />}
      {shape === 'square' && <rect x="2" y="2" width="8" height="8" rx="1.5" fill={color} />}
      {shape === 'diamond' && <polygon points="6,1 11,6 6,11 1,6" fill={color} />}
      {shape === 'triangle' && <polygon points="6,1.5 11,10.5 1,10.5" fill={color} />}
    </svg>
  );
}

function ChartPointMarker({
  shape,
  cx,
  cy,
  color,
  r = 4,
}: {
  shape: ChartMarkerShape;
  cx: number;
  cy: number;
  color: string;
  r?: number;
}) {
  if (shape === 'square') {
    return (
      <rect
        x={cx - r}
        y={cy - r}
        width={r * 2}
        height={r * 2}
        rx="1.2"
        fill={color}
        stroke="#ffffff"
        strokeWidth="1.5"
      />
    );
  }
  if (shape === 'diamond') {
    const d = r + 1;
    return (
      <polygon
        points={`${cx},${cy - d} ${cx + d},${cy} ${cx},${cy + d} ${cx - d},${cy}`}
        fill={color}
        stroke="#ffffff"
        strokeWidth="1.5"
      />
    );
  }
  if (shape === 'triangle') {
    const d = r + 1;
    return (
      <polygon
        points={`${cx},${cy - d} ${cx + d},${cy + d} ${cx - d},${cy + d}`}
        fill={color}
        stroke="#ffffff"
        strokeWidth="1.5"
      />
    );
  }
  return <circle cx={cx} cy={cy} r={r} fill={color} stroke="#ffffff" strokeWidth="1.5" />;
}

export function DailyTrendChart({
  points,
  series,
  language,
  allowSeriesToggle = true,
  defaultShowTable = false,
}: DailyTrendChartProps) {
  const ts = translations[language].adminStatistics;
  const [enabledKeys, setEnabledKeys] = useState<string[]>(() => series.map((s) => s.key));
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(defaultShowTable);

  const effectiveEnabledKeys = useMemo(() => {
    const valid = new Set(series.map((s) => s.key));
    const filtered = enabledKeys.filter((k) => valid.has(k));
    return filtered.length > 0 ? filtered : series.map((s) => s.key);
  }, [enabledKeys, series]);

  const activeSeries = useMemo(
    () => series.filter((s) => effectiveEnabledKeys.includes(s.key)),
    [series, effectiveEnabledKeys],
  );

  const toggleSeries = (key: string) => {
    if (!allowSeriesToggle) return;
    setEnabledKeys((prev) => {
      const exists = prev.includes(key);
      if (exists && prev.length === 1) {
        return prev; // Keep at least 1 active series visible
      }
      return exists ? prev.filter((item) => item !== key) : [...prev, key];
    });
  };

  if (points.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#e6e4dd] bg-[#faf9f5] px-4 py-8 text-center text-sm text-slate-500">
        {ts.chartNoPoints}
      </div>
    );
  }

  const width = 760;
  const height = 250;
  const padLeft = 46;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 34;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  let rawMax = 0;
  for (const pt of points) {
    for (const s of activeSeries) {
      const v = Number(pt[s.key] ?? 0);
      if (Number.isFinite(v) && v > rawMax) rawMax = v;
    }
  }
  const yMax = rawMax <= 0 ? 4 : Math.ceil(rawMax * 1.15);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(yMax * ratio));

  const getX = (idx: number) => {
    if (points.length <= 1) return padLeft + plotWidth / 2;
    return padLeft + (idx / (points.length - 1)) * plotWidth;
  };
  const getY = (val: number) => padTop + plotHeight - (Math.max(0, val) / yMax) * plotHeight;

  const labelStep = points.length <= 7 ? 1 : Math.max(1, Math.ceil(points.length / 6));
  const selectedIndex =
    activeIndex !== null && activeIndex >= 0 && activeIndex < points.length
      ? activeIndex
      : points.length - 1;
  const activePoint = points[selectedIndex];

  return (
    <div className="space-y-4">
      {/* Legend & Series Toggle Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {series.map((s) => {
            const isOn = effectiveEnabledKeys.includes(s.key);
            if (!allowSeriesToggle) {
              return (
                <div
                  key={s.key}
                  className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 px-2 py-1"
                >
                  <SeriesShapeMarker shape={s.shape} color={s.color} />
                  <span>{s.label}</span>
                </div>
              );
            }
            return (
              <button
                key={s.key}
                type="button"
                aria-pressed={isOn}
                onClick={() => toggleSeries(s.key)}
                className={`inline-flex items-center gap-2 px-3 min-h-[36px] rounded-lg border text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-2 ${
                  isOn
                    ? 'border-[#e6e4dd] bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)]'
                    : 'border-transparent bg-[#f7f6f2] text-slate-400 hover:text-slate-600'
                }`}
              >
                <SeriesShapeMarker shape={s.shape} color={isOn ? s.color : '#cbd5e1'} />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowTable((prev) => !prev)}
          aria-expanded={showTable}
          className="inline-flex items-center gap-1.5 px-3 min-h-[36px] rounded-lg border border-[#e6e4dd] bg-white text-xs font-medium text-slate-700 hover:bg-[#faf9f5] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] focus-visible:ring-offset-2"
        >
          <TableIcon className="w-3.5 h-3.5 text-slate-500" />
          <span>{showTable ? ts.chartTableToggleHide : ts.chartTableToggleShow}</span>
        </button>
      </div>

      {/* Live / Pinned Tooltip Summary Bar (supports mouse hover, touch tap, and keyboard focus) */}
      {activePoint && (
        <div
          aria-live="polite"
          className="rounded-lg border border-[#e6e4dd] bg-[#faf9f5] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
        >
          <span className="font-semibold text-slate-900 tabular-nums">
            {formatShortYmdDate(String(activePoint.date), language)}
          </span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {activeSeries.map((s) => (
              <span key={s.key} className="inline-flex items-center gap-1.5 text-slate-700">
                <SeriesShapeMarker shape={s.shape} color={s.color} size={9} />
                <span>{s.label}:</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {formatInteger(Number(activePoint[s.key] ?? 0), language)}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Responsive SVG Line Chart */}
      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none touch-manipulation"
          role="img"
          aria-label={ts.overview.dailyChartTitle}
        >
          {/* Horizontal gridlines + Y labels */}
          {yTicks.map((tick, idx) => {
            const y = getY(tick);
            return (
              <g key={`${tick}-${idx}`}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#f1efe9"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#64748b"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Crosshair guide */}
          {activePoint && (
            <line
              x1={getX(selectedIndex)}
              y1={padTop}
              x2={getX(selectedIndex)}
              y2={height - padBottom}
              stroke="#cbd5e1"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          )}

          {/* Series Polylines */}
          {activeSeries.map((s) => {
            const coords = points
              .map((pt, idx) => `${getX(idx)},${getY(Number(pt[s.key] ?? 0))}`)
              .join(' ');
            return (
              <polyline
                key={s.key}
                fill="none"
                stroke={s.color}
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={coords}
              />
            );
          })}

          {/* Series Markers (always shown on active/hovered point, and when points <= 35) */}
          {activeSeries.map((s) =>
            points.map((pt, idx) => {
              const isSelected = idx === selectedIndex;
              if (!isSelected && points.length > 35) return null;
              return (
                <ChartPointMarker
                  key={`${s.key}-${idx}`}
                  shape={s.shape}
                  cx={getX(idx)}
                  cy={getY(Number(pt[s.key] ?? 0))}
                  color={s.color}
                  r={isSelected ? 5 : 3.2}
                />
              );
            }),
          )}

          {/* X Axis Date Labels */}
          {points.map((pt, idx) => {
            const isLast = idx === points.length - 1;
            if (idx % labelStep !== 0 && !isLast) return null;
            const rawDate = String(pt.date);
            const shortLabel = rawDate.length >= 10 ? rawDate.slice(5) : rawDate;
            return (
              <text
                key={`x-${rawDate}-${idx}`}
                x={getX(idx)}
                y={height - 10}
                textAnchor={idx === 0 ? 'start' : isLast ? 'end' : 'middle'}
                fontSize="11"
                fill="#64748b"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {shortLabel}
              </text>
            );
          })}

          {/* Interactive Touch/Hover/Keyboard Hit Columns */}
          {points.map((pt, idx) => {
            const colWidth =
              points.length <= 1 ? plotWidth : plotWidth / (points.length - 1);
            const x = Math.max(padLeft, getX(idx) - colWidth / 2);
            const w = Math.min(colWidth, width - padRight - x);
            return (
              <rect
                key={`hit-${pt.date}-${idx}`}
                x={x}
                y={padTop}
                width={Math.max(8, w)}
                height={plotHeight}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${formatShortYmdDate(String(pt.date), language)}: ${activeSeries
                  .map((s) => `${s.label} ${pt[s.key] ?? 0}`)
                  .join(', ')}`}
                onMouseEnter={() => setActiveIndex(idx)}
                onFocus={() => setActiveIndex(idx)}
                onClick={() => setActiveIndex(idx)}
                onTouchStart={() => setActiveIndex(idx)}
                className="cursor-pointer outline-none"
              />
            );
          })}
        </svg>
      </div>

      {/* Accompanying Data Table */}
      {showTable && (
        <div className="border border-[#e6e4dd] rounded-lg overflow-hidden">
          <div className="max-h-[280px] overflow-y-auto overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#faf9f5] border-b border-[#e6e4dd] sticky top-0">
                <tr>
                  <th className="px-3 py-2 font-semibold text-slate-700">
                    {ts.chartDateColumn}
                  </th>
                  {series.map((s) => (
                    <th
                      key={s.key}
                      className="px-3 py-2 font-semibold text-slate-700 text-right whitespace-nowrap"
                    >
                      <span className="inline-flex items-center justify-end gap-1.5">
                        <SeriesShapeMarker shape={s.shape} color={s.color} size={8} />
                        <span>{s.label}</span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2f0ea] bg-white">
                {points.map((pt) => (
                  <tr key={String(pt.date)} className="hover:bg-[#faf9f5]">
                    <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap tabular-nums">
                      {formatShortYmdDate(String(pt.date), language)}
                    </td>
                    {series.map((s) => (
                      <td
                        key={s.key}
                        className="px-3 py-2 text-right font-semibold text-slate-900 tabular-nums whitespace-nowrap"
                      >
                        {formatInteger(Number(pt[s.key] ?? 0), language)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export interface HorizontalBarItem {
  key: string;
  label: string;
  count: number;
  barColor?: string;
  marker?: ReactNode;
}

export function HorizontalDistributionBars({
  items,
  language,
  emptyLabel,
}: {
  items: HorizontalBarItem[];
  language: Language;
  emptyLabel: string;
}) {
  const [focusedKey, setFocusedKey] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#e6e4dd] bg-[#faf9f5] px-4 py-6 text-center text-sm text-slate-500">
        {emptyLabel}
      </div>
    );
  }

  const total = items.reduce((sum, item) => sum + Math.max(0, item.count), 0);
  const maxVal = items.reduce((m, item) => Math.max(m, item.count), 0);

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const widthPct = maxVal > 0 ? Math.max(2, (item.count / maxVal) * 100) : 0;
        const sharePct = total > 0 ? Math.round((item.count / total) * 1000) / 10 : 0;
        const isHighlighted = focusedKey === item.key;

        return (
          <div
            key={item.key}
            tabIndex={0}
            onMouseEnter={() => setFocusedKey(item.key)}
            onMouseLeave={() => setFocusedKey((prev) => (prev === item.key ? null : prev))}
            onFocus={() => setFocusedKey(item.key)}
            onBlur={() => setFocusedKey((prev) => (prev === item.key ? null : prev))}
            onClick={() => setFocusedKey(item.key)}
            className={`rounded-lg px-2.5 py-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a] ${
              isHighlighted ? 'bg-[#faf9f5]' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-3 text-xs mb-1.5">
              <span className="inline-flex items-center gap-2 font-medium text-slate-800 min-w-0">
                {item.marker}
                <span className="truncate">{item.label}</span>
              </span>
              <span className="font-semibold text-slate-900 tabular-nums shrink-0">
                {formatInteger(item.count, language)}{' '}
                <span className="text-slate-400 font-normal">({sharePct}%)</span>
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[#f1efe9] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${item.count > 0 ? widthPct : 0}%`,
                  backgroundColor: item.barColor || '#16a34a',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export interface ResponsiveTableColumn<T> {
  key: string;
  title: string;
  align?: 'left' | 'right';
  primaryOnMobile?: boolean;
  render: (row: T) => ReactNode;
}

export function ResponsiveExpandableTable<T>({
  rows,
  rowKey,
  columns,
  language,
  emptyLabel,
}: {
  rows: T[];
  rowKey: (row: T, index: number) => string;
  columns: ResponsiveTableColumn<T>[];
  language: Language;
  emptyLabel: string;
}) {
  const ts = translations[language].adminStatistics;
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#e6e4dd] bg-[#faf9f5] px-4 py-8 text-center text-sm text-slate-500">
        {emptyLabel}
      </div>
    );
  }

  const primaryCols = columns.filter((c) => c.primaryOnMobile);
  const mobilePrimary = primaryCols.length > 0 ? primaryCols : columns.slice(0, 2);
  const mobileSecondary = columns.filter((c) => !mobilePrimary.includes(c));

  const toggleRow = (key: string) => {
    setExpandedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto border border-[#e6e4dd] rounded-xl bg-white">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-[#faf9f5] border-b border-[#e6e4dd]">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f2f0ea]">
            {rows.map((row, idx) => (
              <tr key={rowKey(row, idx)} className="hover:bg-[#faf9f5] transition-colors">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-slate-800 ${
                      col.align === 'right' ? 'text-right tabular-nums whitespace-nowrap' : ''
                    }`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile / Tablet Expandable Cards (Zero horizontal scroll on 360px) */}
      <div className="lg:hidden divide-y divide-[#f2f0ea] border border-[#e6e4dd] rounded-xl bg-white overflow-hidden">
        {rows.map((row, idx) => {
          const key = rowKey(row, idx);
          const isExpanded = Boolean(expandedKeys[key]);

          return (
            <div key={key} className="p-3.5 space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  {mobilePrimary.map((col, colIdx) => (
                    <div
                      key={col.key}
                      className={
                        colIdx === 0
                          ? 'text-sm font-semibold text-slate-900 break-words'
                          : 'text-xs text-slate-600 break-words'
                      }
                    >
                      {colIdx > 0 && (
                        <span className="text-slate-400 mr-1">{col.title}:</span>
                      )}
                      {col.render(row)}
                    </div>
                  ))}
                </div>

                {mobileSecondary.length > 0 && (
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() => toggleRow(key)}
                    className="inline-flex items-center gap-1 px-2.5 min-h-[36px] rounded-lg border border-[#e6e4dd] bg-[#faf9f5] text-xs font-medium text-slate-700 hover:bg-[#f2f0ea] transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a34a]"
                  >
                    <span>{isExpanded ? ts.tableCollapseDetails : ts.tableExpandDetails}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>

              {isExpanded && mobileSecondary.length > 0 && (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 pt-2.5 border-t border-[#f2f0ea] text-xs">
                  {mobileSecondary.map((col) => (
                    <div key={col.key} className="flex items-center justify-between gap-2">
                      <dt className="text-slate-500">{col.title}</dt>
                      <dd className="font-medium text-slate-900 tabular-nums text-right">
                        {col.render(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
