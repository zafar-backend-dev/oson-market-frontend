import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, FolderTree, LayoutGrid } from 'lucide-react';
import { Modal } from 'antd';
import { translations } from '../i18n/translations';
import type { Language } from '../types/auth';
import type { CatalogCategoryNode } from '../types/catalog';
import { PublicCatalogImage } from './PublicCatalogImage';

interface CatalogCategoryBarProps {
  nonEmptyRootCategories: CatalogCategoryNode[];
  categoryCounts: Record<string, number>;
  totalProductsCount: number;
  uncategorizedCount: number;
  activeCategory: CatalogCategoryNode | null;
  activeCategoryPath: CatalogCategoryNode[];
  visibleSubcategories: CatalogCategoryNode[];
  selectedUncategorized: boolean;
  language: Language;
  onSelectCategory: (categoryId: string | null) => void;
  onSelectUncategorized: () => void;
}

export function CatalogCategoryBar({
  nonEmptyRootCategories,
  categoryCounts,
  totalProductsCount,
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

  // Desktop adaptive row measurement so overflowing root categories roll into "Barcha kategoriyalar"
  const desktopContainerRef = useRef<HTMLDivElement | null>(null);
  const measureItemsRef = useRef<Array<HTMLDivElement | null>>([]);
  const allCatsTriggerMeasureRef = useRef<HTMLDivElement | null>(null);
  const allProductsMeasureRef = useRef<HTMLDivElement | null>(null);
  const uncatMeasureRef = useRef<HTMLDivElement | null>(null);

  const [visibleRootCount, setVisibleRootCount] = useState<number>(
    nonEmptyRootCategories.length,
  );

  useEffect(() => {
    setVisibleRootCount(nonEmptyRootCategories.length);
  }, [nonEmptyRootCategories]);

  useEffect(() => {
    const container = desktopContainerRef.current;
    if (!container) return;

    const calculate = () => {
      const containerWidth = container.clientWidth;
      if (containerWidth <= 0) return;

      const gapPx = 8;
      const allProductsWidth = allProductsMeasureRef.current?.offsetWidth ?? 130;
      const allCatsTriggerWidth = allCatsTriggerMeasureRef.current?.offsetWidth ?? 170;
      const uncatWidth =
        uncategorizedCount > 0 ? (uncatMeasureRef.current?.offsetWidth ?? 140) + gapPx : 0;

      const widths = nonEmptyRootCategories.map(
        (_, idx) => measureItemsRef.current[idx]?.offsetWidth ?? 120,
      );

      // Check if everything fits without the "All categories" overflow button
      const totalRootsWidth = widths.reduce(
        (sum, w, idx) => sum + w + (idx > 0 ? gapPx : 0),
        0,
      );
      const totalNeededWithoutTrigger =
        allProductsWidth +
        (nonEmptyRootCategories.length > 0 ? gapPx + totalRootsWidth : 0) +
        uncatWidth;

      if (totalNeededWithoutTrigger <= containerWidth) {
        setVisibleRootCount(nonEmptyRootCategories.length);
        return;
      }

      // Reserve width for All Products button + "All categories" trigger + optional uncategorized button
      const available =
        containerWidth - allProductsWidth - gapPx - allCatsTriggerWidth - gapPx - uncatWidth;

      let used = 0;
      let count = 0;
      for (let i = 0; i < widths.length; i += 1) {
        const nextWidth = widths[i] + (i > 0 ? gapPx : 0);
        if (used + nextWidth <= available) {
          used += nextWidth;
          count += 1;
        } else {
          break;
        }
      }
      setVisibleRootCount(count);
    };

    calculate();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', calculate);
      return () => window.removeEventListener('resize', calculate);
    }

    const observer = new ResizeObserver(calculate);
    observer.observe(container);
    return () => observer.disconnect();
  }, [nonEmptyRootCategories, uncategorizedCount, language, totalProductsCount]);

  const visibleDesktopRoots = useMemo(
    () => nonEmptyRootCategories.slice(0, visibleRootCount),
    [nonEmptyRootCategories, visibleRootCount],
  );
  const hiddenDesktopRoots = useMemo(
    () => nonEmptyRootCategories.slice(visibleRootCount),
    [nonEmptyRootCategories, visibleRootCount],
  );

  const hasSubcategoriesInTree = useMemo(
    () => nonEmptyRootCategories.some((cat) => cat.children.length > 0),
    [nonEmptyRootCategories],
  );

  const isSelectedInsideHidden = useMemo(() => {
    if (!activeCategory) return false;
    return hiddenDesktopRoots.some(
      (cat) =>
        cat.id === activeCategory.id ||
        activeCategoryPath.some((node) => node.id === cat.id),
    );
  }, [activeCategory, activeCategoryPath, hiddenDesktopRoots]);

  const handleModalSelectCategory = (categoryId: string | null) => {
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
                className="w-7 h-7 rounded-md overflow-hidden bg-[#faf9f5] border border-[#e6e4dd] shrink-0 flex items-center justify-center"
                imgClassName="w-full h-full object-contain p-0.5"
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
      {/* Hidden measurement row for accurate desktop overflow calculation */}
      <div
        aria-hidden="true"
        className="hidden md:flex items-center gap-2 h-0 overflow-hidden invisible pointer-events-none select-none"
      >
        <div
          ref={allProductsMeasureRef}
          className="inline-flex items-center gap-1.5 px-3.5 h-10 text-sm font-medium whitespace-nowrap shrink-0"
        >
          <span>{tc.allCategories}</span>
          <span className="text-xs">({totalProductsCount})</span>
        </div>

        {nonEmptyRootCategories.map((category, idx) => (
          <div
            key={category.id}
            ref={(el) => {
              measureItemsRef.current[idx] = el;
            }}
            className="inline-flex items-center gap-2 px-3 h-10 text-sm font-medium whitespace-nowrap shrink-0"
          >
            <span className="w-6 h-6 shrink-0" />
            <span>{category.name || category.slug}</span>
            <span className="text-xs">({categoryCounts[category.id] ?? 0})</span>
          </div>
        ))}

        <div
          ref={uncatMeasureRef}
          className="inline-flex items-center gap-1.5 px-3 h-10 text-sm font-medium whitespace-nowrap shrink-0"
        >
          <span>{tc.uncategorizedLabel}</span>
          <span className="text-xs">({uncategorizedCount})</span>
        </div>

        <div
          ref={allCatsTriggerMeasureRef}
          className="inline-flex items-center gap-1.5 px-3.5 h-10 text-sm font-medium whitespace-nowrap shrink-0"
        >
          <span className="w-4 h-4 shrink-0" />
          <span>{tc.allCategoriesButton}</span>
        </div>
      </div>

      {/* Desktop: Adaptive single-row strip + "Barcha kategoriyalar" menu button when overflowing or tree has subcategories */}
      <div ref={desktopContainerRef} className="hidden md:flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={() => onSelectCategory(null)}
          className={`inline-flex items-center gap-1.5 px-3.5 h-10 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
            !activeCategory && !selectedUncategorized
              ? 'bg-[#16a34a] border-[#16a34a] text-white'
              : 'bg-[#faf9f5] border-[#e6e4dd] text-slate-700 hover:border-[#86efac] hover:text-slate-900'
          }`}
        >
          <span>{tc.allCategories}</span>
          <span className="text-xs opacity-80 tabular-nums">({totalProductsCount})</span>
        </button>

        {visibleDesktopRoots.map((category) => {
          const isSelected =
            activeCategory?.id === category.id ||
            activeCategoryPath.some((node) => node.id === category.id);
          const count = categoryCounts[category.id] ?? 0;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelectCategory(category.id)}
              className={`inline-flex items-center gap-2 px-3 h-10 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-[#f0fdf4] border-[#16a34a] text-[#15803d] font-semibold ring-1 ring-[#16a34a]/20'
                  : 'bg-white border-[#e6e4dd] text-slate-700 hover:border-[#86efac] hover:text-slate-900'
              }`}
            >
              <PublicCatalogImage
                url={category.imageUrl}
                alt={category.name || category.slug}
                fallbackVariant="category"
                className="w-6 h-6 rounded overflow-hidden bg-[#faf9f5] border border-[#e6e4dd] shrink-0 flex items-center justify-center"
                imgClassName="w-full h-full object-contain p-0.5"
              />
              <span>{category.name || category.slug}</span>
              <span className="text-xs text-slate-500 tabular-nums">({count})</span>
            </button>
          );
        })}

        {uncategorizedCount > 0 && (
          <button
            type="button"
            onClick={onSelectUncategorized}
            className={`inline-flex items-center gap-1.5 px-3 h-10 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
              selectedUncategorized
                ? 'bg-[#f0fdf4] border-[#16a34a] text-[#15803d] font-semibold ring-1 ring-[#16a34a]/20'
                : 'bg-white border-[#e6e4dd] text-slate-700 hover:border-[#86efac] hover:text-slate-900'
            }`}
          >
            <span>{tc.uncategorizedLabel}</span>
            <span className="text-xs text-slate-500 tabular-nums">({uncategorizedCount})</span>
          </button>
        )}

        {(hiddenDesktopRoots.length > 0 || hasSubcategoriesInTree) && (
          <button
            type="button"
            onClick={() => setAllModalOpen(true)}
            className={`ml-auto inline-flex items-center gap-1.5 px-3.5 h-10 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
              isSelectedInsideHidden
                ? 'bg-[#f0fdf4] border-[#16a34a] text-[#15803d] font-semibold'
                : 'bg-[#faf9f5] border-[#e6e4dd] text-slate-700 hover:border-[#86efac] hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
            <span>{tc.allCategoriesButton}</span>
          </button>
        )}
      </div>

      {/* Mobile: Horizontal scrollable row (scrollbar hidden) + pinned "Barcha kategoriyalar" full-list button */}
      <div className="flex md:hidden items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={() => setAllModalOpen(true)}
          aria-label={tc.allCategoriesButton}
          className={`inline-flex items-center gap-1.5 px-2.5 h-9 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
            activeCategory
              ? 'bg-[#f0fdf4] border-[#16a34a] text-[#15803d]'
              : 'bg-[#faf9f5] border-[#e6e4dd] text-slate-800 hover:border-[#86efac]'
          }`}
        >
          <FolderTree className="w-3.5 h-3.5 shrink-0 text-[#16a34a]" />
          <span>{tc.allCategoriesButton}</span>
        </button>

        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto oson-scrollbar-none min-w-0 py-0.5">
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
              !activeCategory && !selectedUncategorized
                ? 'bg-[#16a34a] border-[#16a34a] text-white'
                : 'bg-[#faf9f5] border-[#e6e4dd] text-slate-700'
            }`}
          >
            <span>{tc.allCategories}</span>
            <span className="opacity-80 tabular-nums">({totalProductsCount})</span>
          </button>

          {nonEmptyRootCategories.map((category) => {
            const isSelected =
              activeCategory?.id === category.id ||
              activeCategoryPath.some((node) => node.id === category.id);
            const count = categoryCounts[category.id] ?? 0;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onSelectCategory(category.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 h-9 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#f0fdf4] border-[#16a34a] text-[#15803d] font-semibold'
                    : 'bg-white border-[#e6e4dd] text-slate-700'
                }`}
              >
                <PublicCatalogImage
                  url={category.imageUrl}
                  alt={category.name || category.slug}
                  fallbackVariant="category"
                  className="w-5 h-5 rounded overflow-hidden bg-[#faf9f5] border border-[#e6e4dd] shrink-0 flex items-center justify-center"
                  imgClassName="w-full h-full object-contain p-0.5"
                />
                <span>{category.name || category.slug}</span>
                <span className="text-[11px] text-slate-500 tabular-nums">({count})</span>
              </button>
            );
          })}

          {uncategorizedCount > 0 && (
            <button
              type="button"
              onClick={onSelectUncategorized}
              className={`inline-flex items-center gap-1.5 px-2.5 h-9 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
                selectedUncategorized
                  ? 'bg-[#f0fdf4] border-[#16a34a] text-[#15803d] font-semibold'
                  : 'bg-white border-[#e6e4dd] text-slate-700'
              }`}
            >
              <span>{tc.uncategorizedLabel}</span>
              <span className="text-[11px] text-slate-500 tabular-nums">({uncategorizedCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Category Breadcrumb & Non-Empty Subcategories */}
      {(activeCategoryPath.length > 0 || visibleSubcategories.length > 0) && (
        <div className="pt-2 border-t border-[#f2f0ea] space-y-2">
          {activeCategoryPath.length > 0 && (
            <nav
              aria-label={tc.categoryLabel}
              className="flex flex-wrap items-center gap-1 text-xs text-slate-500"
            >
              <button
                type="button"
                onClick={() => onSelectCategory(null)}
                className="hover:text-slate-900 transition-colors cursor-pointer"
              >
                {tc.allCategories}
              </button>
              {activeCategoryPath.map((node, idx) => {
                const isLast = idx === activeCategoryPath.length - 1;
                return (
                  <span key={node.id} className="inline-flex items-center gap-1">
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
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
                      className="w-4 h-4 rounded overflow-hidden bg-white border border-[#e6e4dd] shrink-0 flex items-center justify-center"
                      imgClassName="w-full h-full object-contain p-0.5"
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

      {/* Full Categories Hierarchy Modal (shared cleanly across desktop overflow & mobile "Barcha kategoriyalar") */}
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
          <button
            type="button"
            onClick={() => handleModalSelectCategory(null)}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
              !activeCategory && !selectedUncategorized
                ? 'bg-[#16a34a] border-[#16a34a] text-white font-semibold'
                : 'bg-[#faf9f5] border-[#e6e4dd] text-slate-800 hover:border-[#86efac]'
            }`}
          >
            <span className="text-sm">{tc.allCategories}</span>
            <span className="text-xs opacity-85 tabular-nums">{totalProductsCount}</span>
          </button>

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
