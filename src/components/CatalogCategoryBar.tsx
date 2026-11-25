import { useLayoutEffect, useRef, useState } from 'react';
import { Check, ChevronRight, FolderTree } from 'lucide-react';
import { Modal } from 'antd';
import { translations } from '../i18n/translations';
import type { Language } from '../types/auth';
import type { CatalogCategoryNode } from '../types/catalog';
import { PublicCatalogImage } from './PublicCatalogImage';

interface CatalogCategoryBarProps {
  nonEmptyRootCategories: CatalogCategoryNode[];
  categoryCounts: Record<string, number>;
  uncategorizedCount: number;
  activeCategory: CatalogCategoryNode | null;
  activeCategoryPath: CatalogCategoryNode[];
  visibleSubcategories: CatalogCategoryNode[];
  selectedUncategorized: boolean;
  language: Language;
  onSelectCategory: (categoryId: string) => void;
  onSelectUncategorized: () => void;
}

export function CatalogCategoryBar({
  nonEmptyRootCategories,
  categoryCounts,
  uncategorizedCount,
  activeCategory,
  activeCategoryPath,
  visibleSubcategories,
  selectedUncategorized,
  language,
  onSelectCategory,
  onSelectUncategorized,
}: CatalogCategoryBarProps) {
  const tc = translations[language].catalog;
  const [allModalOpen, setAllModalOpen] = useState(false);

  const rowRef = useRef<HTMLDivElement>(null);
  const selectedRootId = activeCategoryPath[0]?.id ?? activeCategory?.id;

  useLayoutEffect(() => {
    const row = rowRef.current;
    const selected = row?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]');
    if (!row || !selected) return;

    const centerSelected = () => {
      const tile = selected.getBoundingClientRect();
      row.scrollLeft += tile.left + tile.width / 2
        - row.getBoundingClientRect().left - row.clientWidth / 2;
    };

    centerSelected();
    const observer = new ResizeObserver(centerSelected);
    observer.observe(row);
    observer.observe(selected);
    return () => observer.disconnect();
  }, [selectedRootId, nonEmptyRootCategories]);

  const handleModalSelectCategory = (categoryId: string) => {
    onSelectCategory(categoryId);
    setAllModalOpen(false);
  };

  const handleModalSelectUncategorized = () => {
    onSelectUncategorized();
    setAllModalOpen(false);
  };

  if (nonEmptyRootCategories.length === 0 && uncategorizedCount === 0) {
    return null;
  }

  const renderTreeNodes = (nodes: CatalogCategoryNode[], depth = 0) => {
    return nodes.map((node) => {
      const isActive = activeCategory?.id === node.id;
      const isAncestor = !isActive && activeCategoryPath.some((p) => p.id === node.id);
      const count = categoryCounts[node.id] ?? 0;

      return (
        <div key={node.id} className="space-y-1">
          <button
            type="button"
            onClick={() => handleModalSelectCategory(node.id)}
            style={{ paddingLeft: `${12 + depth * 18}px` }}
            className={`w-full flex items-center justify-between gap-2.5 pr-3 py-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
              isActive
                ? 'bg-[#f0fdf4] border-[#16a34a] text-[#15803d] font-semibold'
                : isAncestor
                  ? 'bg-[#faf9f5] border-[#86efac] text-slate-900 font-medium'
                  : 'bg-white border-[#e6e4dd] text-slate-700 hover:border-[#86efac] hover:bg-[#faf9f5]'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <PublicCatalogImage
                url={node.imageUrl}
                alt={node.name || node.slug}
                fallbackVariant="category"
                className="size-7 shrink-0 overflow-hidden rounded-lg bg-white"
                imgClassName="block size-full rounded-[inherit] object-cover"
              />
              <span className="text-sm truncate">{node.name || node.slug}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-500 tabular-nums">{count}</span>
              {isActive && <Check className="w-4 h-4 text-[#16a34a]" />}
            </div>
          </button>

          {node.children.length > 0 && (
            <div className="space-y-1">{renderTreeNodes(node.children, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <section
      aria-label={tc.categoryLabel}
      className="bg-white border border-[#e6e4dd] rounded-xl p-2.5 sm:p-3.5 space-y-2.5"
    >
      <div
        ref={rowRef}
        className="oson-scrollbar-none flex items-center gap-2 overflow-x-auto px-1 py-1"
      >
        {nonEmptyRootCategories.map((category) => {
          const selected = selectedRootId === category.id;
          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelectCategory(category.id)}
              className={`flex min-h-12 max-w-[min(15rem,78%)] shrink-0 items-center gap-2.5 rounded-2xl border py-1.5 pl-1.5 pr-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-green-600 ${
                selected
                  ? 'border-green-300 bg-green-50 text-green-950'
                  : 'border-[#e6e4dd] bg-white text-slate-700 hover:border-green-300'
              }`}
            >
              <PublicCatalogImage
                url={category.imageUrl}
                alt=""
                fallbackVariant="category"
                className="size-9 shrink-0 overflow-hidden rounded-xl bg-white sm:size-10"
                imgClassName="block size-full rounded-[inherit] object-cover"
              />
              <span className="line-clamp-2 text-sm font-semibold leading-tight">
                {category.name || category.slug}
              </span>
              {selected && (
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-green-700 text-white">
                  <Check className="size-3" aria-hidden="true" />
                </span>
              )}
            </button>
          );
        })}
        {(uncategorizedCount > 0 || nonEmptyRootCategories.some(category => category.children.length > 0)) && (
          <button
            type="button"
            onClick={() => setAllModalOpen(true)}
            aria-label={tc.allCategoriesModalTitle}
            aria-haspopup="dialog"
            aria-expanded={allModalOpen}
            className="grid size-12 shrink-0 place-items-center rounded-2xl border border-[#e6e4dd] text-slate-600 transition-colors hover:border-green-300 hover:text-green-800 focus-visible:outline-2 focus-visible:outline-green-600"
          >
            <FolderTree className="size-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Active Category Breadcrumb & Non-Empty Subcategories */}
      {(activeCategoryPath.length > 1 || visibleSubcategories.length > 0) && (
        <div className="space-y-2 border-t border-[#f2f0ea] pt-2">
          {activeCategoryPath.length > 1 && (
            <nav
              aria-label={tc.categoryLabel}
              className="flex flex-wrap items-center gap-1 text-xs text-slate-500"
            >
              {activeCategoryPath.map((node, idx) => {
                const isLast = idx === activeCategoryPath.length - 1;
                return (
                  <span key={node.id} className="inline-flex items-center gap-1">
                    {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                    {isLast ? (
                      <span className="font-semibold text-slate-900">
                        {node.name || node.slug}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectCategory(node.id)}
                        className="hover:text-slate-900 transition-colors cursor-pointer"
                      >
                        {node.name || node.slug}
                      </button>
                    )}
                  </span>
                );
              })}
            </nav>
          )}

          {visibleSubcategories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto oson-scrollbar-none py-0.5">
              <span className="text-xs font-medium text-slate-500 shrink-0">
                {tc.subcategoriesLabel}:
              </span>
              {visibleSubcategories.map((child) => {
                const activeChild = activeCategory?.id === child.id;
                const count = categoryCounts[child.id] ?? 0;
                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => onSelectCategory(child.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 h-8 sm:h-9 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
                      activeChild
                        ? 'bg-[#16a34a] border-[#16a34a] text-white'
                        : 'bg-[#faf9f5] border-[#e6e4dd] text-slate-700 hover:border-[#86efac]'
                    }`}
                  >
                    <PublicCatalogImage
                      url={child.imageUrl}
                      alt={child.name || child.slug}
                      fallbackVariant="category"
                      className="size-4 shrink-0 overflow-hidden rounded bg-white"
                      imgClassName="block size-full rounded-[inherit] object-cover"
                    />
                    <span>{child.name || child.slug}</span>
                    <span className="opacity-75 tabular-nums">({count})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Full category hierarchy */}
      <Modal
        open={allModalOpen}
        onCancel={() => setAllModalOpen(false)}
        footer={null}
        mask={{ closable: true }}
        width={520}
        title={
          <span className="font-display font-semibold text-slate-900">
            {tc.allCategoriesModalTitle}
          </span>
        }
      >
        <div className="space-y-2 pt-2 max-h-[68vh] overflow-y-auto pr-1">
          {renderTreeNodes(nonEmptyRootCategories)}

          {uncategorizedCount > 0 && (
            <button
              type="button"
              onClick={handleModalSelectUncategorized}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                selectedUncategorized
                  ? 'bg-[#f0fdf4] border-[#16a34a] text-[#15803d] font-semibold'
                  : 'bg-white border-[#e6e4dd] text-slate-700 hover:border-[#86efac]'
              }`}
            >
              <span className="text-sm">{tc.uncategorizedLabel}</span>
              <span className="text-xs text-slate-500 tabular-nums">{uncategorizedCount}</span>
            </button>
          )}
        </div>
      </Modal>
    </section>
  );
}
