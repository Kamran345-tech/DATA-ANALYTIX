import React, { useState, useMemo, useEffect } from 'react';
import {
  Presentation,
  Download,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Maximize2,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Layers,
  Loader2,
  BarChart3,
  Compass,
  ShieldCheck,
  Activity,
  LineChart,
  Lightbulb,
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { useToast } from '../../store/useToast';
import { loadFeatureFlags } from '../../config/features';
import { ANALYTICS_PACKS, pickBestPackForDataset } from '../../analytics';
import {
  buildPresentationSlides,
  PresentationAudience,
  PresentationSlideSpec,
} from '../../engine/pptxGenerator';

export const SlideDeckPreviewPanel: React.FC = () => {
  const {
    project,
    brand,
    filteredRows,
    cleanRows,
    columns,
    analytics,
    qualityReport,
    customVisuals,
    themeMode,
  } = usePlatform();
  const { addToast } = useToast();
  const flags = loadFeatureFlags();

  const activeRows = filteredRows && filteredRows.length > 0 ? filteredRows : cleanRows;

  // Auto-select active or best pack with highest active-KPI count for loaded dataset (FIX 3)
  const detectedTopPackId = useMemo(() => {
    if (typeof window !== 'undefined') {
      const saved =
        localStorage.getItem('dataanalytix_active_pack_id') ||
        localStorage.getItem('dataanalytix_active_pack');
      if (saved && ANALYTICS_PACKS.some((p) => p.id === saved)) {
        return saved;
      }
    }
    return (
      pickBestPackForDataset({
        columns,
        rows: activeRows,
        datasetId: project?.id || 'default',
      }) || 'operations'
    );
  }, [columns, activeRows, project?.id]);

  const [selectedPackId, setSelectedPackId] = useState<string>(detectedTopPackId);
  const [audience, setAudience] = useState<PresentationAudience>('manager');
  const [viewMode, setViewMode] = useState<'storyboard' | 'stage'>('storyboard');
  const [activeSlideIdx, setActiveSlideIdx] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  useEffect(() => {
    setSelectedPackId(detectedTopPackId);
  }, [detectedTopPackId]);

  const slides = useMemo<PresentationSlideSpec[]>(() => {
    return buildPresentationSlides({
      datasetName: project?.name || 'Enterprise Dataset',
      companyName: brand.companyName,
      department: brand.department,
      author: brand.author,
      scope: 'pack',
      packId: selectedPackId,
      audience,
      rows: activeRows,
      columns,
      kpis: analytics.kpis,
      insights: analytics.insights,
      qualityReport,
      customVisuals,
      themeMode: themeMode === 'light' ? 'light' : 'dark',
    });
  }, [
    project?.name,
    brand.companyName,
    brand.department,
    brand.author,
    selectedPackId,
    audience,
    activeRows,
    columns,
    analytics.kpis,
    analytics.insights,
    qualityReport,
    customVisuals,
    themeMode,
  ]);

  // Select 3 representative slides for the 3-Slide Storyboard:
  // 1) Title & Executive Takeaways, 2) Domain KPI Scorecard (6-8 active tiles), 3) Native Chart & 4-Lens Directives
  const storyboardSlides = useMemo<PresentationSlideSpec[]>(() => {
    const coverSlide = slides.find((s) => s.kind === 'cover') || slides[0];
    const kpiSlide =
      slides.find((s) => s.kind === 'kpis') ||
      slides.find((s) => s.kind === 'executive_summary') ||
      slides[1] ||
      slides[0];
    const chartSlide =
      slides.find((s) => s.kind === 'charts') ||
      slides.find((s) => s.kind === 'diagnostic') ||
      slides[2] ||
      slides[0];
    return [coverSlide, kpiSlide, chartSlide].filter(Boolean);
  }, [slides]);

  const currentStageSlide =
    slides[Math.min(activeSlideIdx, Math.max(0, slides.length - 1))] || slides[0];

  const handleDownloadPptx = async () => {
    setIsDownloading(true);
    try {
      const { generatePresentationPptxBlob } = await import('../../engine/pptxGenerator');
      const { blob, slideCount } = await generatePresentationPptxBlob({
        datasetName: project?.name || 'Enterprise Dataset',
        companyName: brand.companyName,
        department: brand.department,
        author: brand.author,
        scope: 'pack',
        packId: selectedPackId,
        audience,
        rows: activeRows,
        columns,
        kpis: analytics.kpis,
        insights: analytics.insights,
        qualityReport,
        customVisuals,
        themeMode: themeMode === 'light' ? 'light' : 'dark',
      });

      const dsSlug =
        (project?.name || 'dataset')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || 'dataset';
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `${dsSlug}_${selectedPackId}_presentation-pptx_${dateStr}.pptx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);

      addToast({
        type: 'success',
        title: 'PPTX Presentation Downloaded',
        message: `Generated ${slideCount}-slide 16:9 PowerPoint deck with native charts: ${filename}`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'PPTX Export Failed',
        message: err?.message || 'Unable to generate PPTX presentation.',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (!flags.analyticsPacks && !flags.depthUI && !flags.unifiedTheme) {
    return null;
  }

  const renderSlideCard = (slide: PresentationSlideSpec, testId: string, badgeLabel: string) => {
    const activeKpisOnly = slide.kpis.filter((k) => k.status === 'available');

    return (
      <div
        key={`${testId}-${slide.id}`}
        data-testid={testId}
        aria-label={slide.altText}
        style={
          {
            '--pack-from': slide.accentToken,
            '--pack-to': slide.gradientToToken,
          } as React.CSSProperties
        }
        className="relative rounded-2xl border border-subtle bg-card shadow-card overflow-hidden flex flex-col justify-between min-w-0"
      >
        {/* 16:9 Top Pack Gradient Bar */}
        <div
          aria-hidden="true"
          className="h-1.5 w-full shrink-0"
          style={{
            backgroundImage: `linear-gradient(90deg, ${slide.accentToken} 0%, ${slide.gradientToToken} 100%)`,
          }}
        />

        <div className="p-4 sm:p-5 space-y-3 flex-1 flex flex-col justify-between min-w-0">
          {/* Slide Top Meta Header */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: slide.accentToken }}
                />
                <span className="truncate" style={{ color: slide.accentToken }}>
                  {slide.packName}
                </span>
                <span className="text-muted">•</span>
                <span className="text-secondary">{slide.audience.toUpperCase()} DECK</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-elevated border border-subtle text-[10px] font-mono font-semibold text-secondary shrink-0">
                {badgeLabel} · 16:9
              </span>
            </div>

            <h3 className="font-heading text-sm sm:text-base font-bold text-primary leading-snug line-clamp-2 break-words">
              {slide.title}
            </h3>
            <p className="text-[11px] font-sans text-secondary line-clamp-2 leading-relaxed">
              {slide.soWhat}
            </p>
          </div>

          {/* Slide Body according to slide.kind */}
          {(slide.kind === 'cover' || slide.kind === 'executive_summary') && (
            <div className="space-y-3 my-auto">
              {slide.headlineMetrics.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {slide.headlineMetrics.slice(0, 3).map((m, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-elevated border border-subtle flex flex-col justify-between gap-1 min-w-0"
                    >
                      <span className="text-[9.5px] font-semibold uppercase tracking-wide text-secondary line-clamp-2 leading-tight break-words">
                        {m.label}
                      </span>
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        <span className="text-sm sm:text-base font-bold font-mono tabular-nums text-primary whitespace-nowrap">
                          {m.value}
                        </span>
                        {m.delta && (
                          <span
                            className={`text-[10px] font-mono font-semibold whitespace-nowrap ${
                              m.isFavorable ? 'text-success' : 'text-danger'
                            }`}
                          >
                            {m.delta}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-3 rounded-xl bg-elevated border border-subtle space-y-1.5">
                <div
                  className="text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5"
                  style={{ color: slide.accentToken }}
                >
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>
                    {slide.hasData ? 'Key Executive Takeaways' : 'Template Instructions'}
                  </span>
                </div>
                <ul className="space-y-1 text-[11px] font-sans text-primary">
                  {slide.bullets.slice(0, 4).map((b, idx) => (
                    <li key={idx} className="line-clamp-2 leading-snug">
                      • {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {slide.kind === 'kpis' && (
            <div className="space-y-2 my-auto">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-secondary">
                KPI Scorecard ({activeKpisOnly.length} Active Domain Metrics)
              </div>
              <div className="grid grid-cols-2 gap-2">
                {activeKpisOnly.slice(0, 6).map((k) => {
                  const hasDelta =
                    typeof k.deltaPercent === 'number' && Number.isFinite(k.deltaPercent);
                  return (
                    <div
                      key={k.id}
                      className="p-2.5 rounded-xl bg-elevated border border-subtle flex flex-col justify-between gap-1 min-w-0"
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-secondary line-clamp-2 leading-tight break-words">
                        {k.label}
                      </span>
                      <div className="flex items-baseline justify-between gap-1.5 flex-wrap">
                        <span className="text-sm sm:text-base font-bold font-mono tabular-nums text-primary whitespace-nowrap">
                          {k.formattedValue}
                        </span>
                        {hasDelta && (
                          <span
                            className={`inline-flex items-center gap-0.5 text-[9.5px] font-mono font-bold shrink-0 ${
                              k.isFavorable ? 'text-success' : 'text-danger'
                            }`}
                          >
                            {k.deltaPercent! >= 0 ? (
                              <TrendingUp className="w-2.5 h-2.5" />
                            ) : (
                              <TrendingDown className="w-2.5 h-2.5" />
                            )}
                            {k.deltaPercent! > 0 ? '+' : ''}
                            {k.deltaPercent!.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(slide.kind === 'charts' ||
            slide.kind === 'diagnostic' ||
            slide.kind === 'predictive' ||
            slide.kind === 'insights') && (
            <div className="grid grid-cols-1 gap-2.5 my-auto">
              {/* Top: Native Chart Data Distribution */}
              <div className="p-2.5 rounded-xl bg-elevated border border-subtle space-y-2 min-w-0">
                <div className="flex items-center justify-between gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-primary">
                  <span className="inline-flex items-center gap-1 min-w-0">
                    {slide.kind === 'predictive' ? (
                      <LineChart className="w-3 h-3 shrink-0" style={{ color: slide.accentToken }} />
                    ) : slide.kind === 'diagnostic' ? (
                      <Activity className="w-3 h-3 shrink-0" style={{ color: slide.accentToken }} />
                    ) : (
                      <BarChart3 className="w-3 h-3 shrink-0" style={{ color: slide.accentToken }} />
                    )}
                    <span className="truncate">{slide.chartTitle}</span>
                  </span>
                  <span className="text-muted shrink-0">Native PPTX Chart</span>
                </div>
                {slide.chartBars.length > 0 ? (
                  <div className="space-y-1.5">
                    {slide.chartBars.slice(0, 3).map((b, i) => (
                      <div key={i} className="space-y-0.5">
                        <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                          <span className="text-primary font-medium truncate min-w-0 flex-1">
                            {b.category}
                          </span>
                          <span className="text-secondary tabular-nums shrink-0 whitespace-nowrap">
                            {b.formattedValue} ({b.sharePct}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-card overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(8, Math.min(100, b.sharePct))}%`,
                              backgroundColor: slide.accentToken,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-secondary py-2">
                    Load dataset rows to render native editable PowerPoint chart series.
                  </div>
                )}
              </div>

              {/* Bottom: 4-Lens Strategic Matrix */}
              <div className="p-2.5 rounded-xl bg-elevated border border-subtle space-y-1.5 min-w-0">
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                  <Compass className="w-3 h-3 shrink-0" style={{ color: slide.accentToken }} />
                  <span>4-Lens Strategic Directives</span>
                </div>
                <div className="space-y-1">
                  {slide.lensBullets.map((lb, i) => (
                    <div key={i} className="text-[10px] leading-snug">
                      <span
                        className="font-mono font-bold uppercase mr-1"
                        style={{ color: slide.accentToken }}
                      >
                        {lb.lens}:
                      </span>
                      <span className="text-primary font-sans line-clamp-1">{lb.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {slide.kind === 'recommendations' && (
            <div className="p-3 rounded-xl bg-elevated border border-subtle space-y-2 my-auto">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 shrink-0" style={{ color: slide.accentToken }} />
                <span>Prescriptive Action Roadmap ({slide.bullets.length} Actions)</span>
              </div>
              <ul className="space-y-1.5 text-[11px] font-sans text-primary">
                {slide.bullets.slice(0, 5).map((b, idx) => (
                  <li key={idx} className="line-clamp-2 leading-snug">
                    <span className="font-mono font-bold mr-1" style={{ color: slide.accentToken }}>
                      {idx + 1}.
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(slide.kind === 'data_quality' || slide.kind === 'appendix') && (
            <div className="p-2.5 rounded-xl bg-elevated border border-subtle space-y-2 my-auto">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 shrink-0" style={{ color: slide.accentToken }} />
                <span>
                  {slide.kind === 'data_quality'
                    ? `Data Hygiene (${slide.qualitySummary.overallScore}%) & Assumptions`
                    : 'Audited KPI Definitions & Column Mapping Appendix'}
                </span>
              </div>

              {slide.kind === 'data_quality' && slide.unavailableKpis.length > 0 && (
                <div className="p-2 rounded-lg bg-card border border-subtle space-y-1">
                  <div className="text-[10px] font-mono font-bold text-secondary">
                    Skipped KPIs & Missing Columns ({slide.unavailableKpis.length})
                  </div>
                  {slide.unavailableKpis.slice(0, 3).map((u) => (
                    <div key={u.id} className="text-[10px] font-mono text-secondary truncate">
                      • {u.label}: Add column [{u.missingColumn || 'unmapped'}]
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {slide.kind === 'data_quality'
                  ? slide.qualitySummary.schemaPreview.slice(0, 4).map((col, idx) => (
                      <div
                        key={idx}
                        className="px-2 py-1.5 rounded-lg bg-card border border-subtle flex items-center justify-between text-[10px] font-mono"
                      >
                        <span className="text-primary font-semibold truncate">{col.name}</span>
                        <span className="text-secondary shrink-0">
                          {col.dataType} · {100 - col.nullPct}%
                        </span>
                      </div>
                    ))
                  : slide.kpis.slice(0, 4).map((k) => (
                      <div
                        key={k.id}
                        className="px-2 py-1.5 rounded-lg bg-card border border-subtle text-[10px]"
                      >
                        <div className="font-mono font-bold text-primary truncate">{k.label}</div>
                        <div className="font-sans text-secondary truncate">
                          {k.source || k.formulaText}
                        </div>
                      </div>
                    ))}
              </div>
            </div>
          )}

          {/* Slide Footer */}
          <div className="pt-2 border-t border-subtle flex items-center justify-between gap-2 text-[10px] font-mono text-muted">
            <span className="truncate">{slide.sourceFootnote}</span>
            <span className="shrink-0">
              Slide {slide.slideNumber}/{slide.totalSlides}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section
      data-testid="pptx-slide-deck-preview-panel"
      aria-label="16:9 Presentation Slide Deck Preview"
      className="rounded-2xl border border-subtle bg-card p-4 sm:p-6 space-y-4 shadow-card print:hidden"
    >
      {/* Top Toolbar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-subtle pb-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-elevated border border-subtle text-[10px] font-mono font-bold uppercase tracking-wider text-accent">
              <Presentation className="w-3.5 h-3.5" />
              <span>16:9 Widescreen PPTX Studio</span>
            </span>
            <span
              data-testid="pptx-preview-slide-count"
              className="text-xs font-mono text-secondary"
            >
              {slides.length} Slides Ready · Native Editable PowerPoint Charts
            </span>
          </div>
          <h2 className="font-heading text-base sm:text-lg font-bold text-primary">
            Executive Presentation Slide Deck Preview
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Domain Pack Selector */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-elevated border border-subtle text-xs">
            <Layers className="w-3.5 h-3.5 text-accent shrink-0" />
            <select
              aria-label="Presentation analytics pack scope"
              data-testid="pptx-preview-pack-select"
              value={selectedPackId}
              onChange={(e) => {
                setSelectedPackId(e.target.value);
                setActiveSlideIdx(0);
              }}
              className="bg-transparent text-xs font-semibold text-primary focus:outline-none cursor-pointer"
            >
              {ANALYTICS_PACKS.map((p) => (
                <option key={p.id} value={p.id} className="bg-card text-primary">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Audience Template Switcher */}
          <div
            role="group"
            aria-label="Presentation audience template"
            className="inline-flex items-center rounded-xl bg-elevated border border-subtle p-0.5"
          >
            {(['board', 'manager', 'analyst'] as const).map((aud) => (
              <button
                key={aud}
                type="button"
                data-testid={`pptx-preview-audience-${aud}`}
                onClick={() => {
                  setAudience(aud);
                  setActiveSlideIdx(0);
                }}
                className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  audience === aud
                    ? 'bg-accent text-on-accent shadow-2xs'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                {aud}
              </button>
            ))}
          </div>

          {/* View Mode Toggle: 3-Slide Storyboard vs Single Stage */}
          <div className="inline-flex items-center rounded-xl bg-elevated border border-subtle p-0.5">
            <button
              type="button"
              data-testid="pptx-view-storyboard"
              onClick={() => setViewMode('storyboard')}
              className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'storyboard'
                  ? 'bg-card text-primary border border-subtle shadow-2xs'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>3-Slide Storyboard</span>
            </button>
            <button
              type="button"
              data-testid="pptx-view-stage"
              onClick={() => setViewMode('stage')}
              className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'stage'
                  ? 'bg-card text-primary border border-subtle shadow-2xs'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>All Slides ({slides.length})</span>
            </button>
          </div>

          {/* 1-Click PPTX Download */}
          <button
            type="button"
            data-testid="pptx-preview-download-btn"
            disabled={isDownloading}
            onClick={handleDownloadPptx}
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-accent text-on-accent font-bold text-xs inline-flex items-center gap-1.5 shadow-xs hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {isDownloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Download .PPTX</span>
          </button>
        </div>
      </div>

      {/* 3-Slide Rendered Storyboard Grid */}
      {viewMode === 'storyboard' ? (
        <div
          data-testid="pptx-three-slide-storyboard"
          className="grid grid-cols-1 xl:grid-cols-3 gap-4"
        >
          {storyboardSlides.map((slide, idx) =>
            renderSlideCard(
              slide,
              `rendered-slide-${idx + 1}`,
              idx === 0
                ? 'Slide 1 · Cover & Brief'
                : idx === 1
                ? 'Slide 3 · KPI Scorecard'
                : 'Slide 4 · Native Chart & 4-Lens'
            )
          )}
        </div>
      ) : (
        <div data-testid="pptx-single-slide-stage" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {slides.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  data-testid={`pptx-stage-slide-tab-${idx + 1}`}
                  onClick={() => setActiveSlideIdx(idx)}
                  className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-mono font-semibold whitespace-nowrap border transition-all cursor-pointer ${
                    activeSlideIdx === idx
                      ? 'bg-elevated text-primary border-strong'
                      : 'bg-card text-secondary hover:text-primary border-subtle'
                  }`}
                >
                  {idx + 1}. {s.kind.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                aria-label="Previous slide"
                onClick={() =>
                  setActiveSlideIdx((prev) => (prev - 1 + slides.length) % slides.length)
                }
                className="min-h-[34px] px-2.5 py-1 rounded-lg bg-elevated border border-subtle text-primary hover:bg-card-hover cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Next slide"
                onClick={() => setActiveSlideIdx((prev) => (prev + 1) % slides.length)}
                className="min-h-[34px] px-2.5 py-1 rounded-lg bg-elevated border border-subtle text-primary hover:bg-card-hover cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {currentStageSlide &&
            renderSlideCard(
              currentStageSlide,
              `rendered-stage-slide-${currentStageSlide.slideNumber}`,
              `Slide ${currentStageSlide.slideNumber} of ${currentStageSlide.totalSlides}`
            )}
        </div>
      )}
    </section>
  );
};
