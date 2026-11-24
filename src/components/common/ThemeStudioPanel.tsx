import React, { useState, useEffect } from 'react';
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  RotateCcw,
  Check,
  Sparkles,
  Eye,
  Sliders,
  X,
} from 'lucide-react';
import {
  ACCENT_PRESETS,
  AccentPresetId,
  DensityPreset,
  GlassIntensity,
  RadiusPreset,
  ThemeStudioConfig,
  GeneratedThemeTokens,
  loadThemeStudioConfig,
  saveThemeStudioConfig,
  resetThemeStudioConfig,
  generateThemeTokens,
} from '../../utils/themeStudio';
import { usePlatform } from '../../store/usePlatformStore';
import { useFirebaseAuth } from '../../store/useFirebaseAuth';

export interface ThemeStudioPanelProps {
  onClose?: () => void;
  compact?: boolean;
}

export const ThemeStudioPanel: React.FC<ThemeStudioPanelProps> = ({
  onClose,
  compact = false,
}) => {
  const { themeMode, setThemeMode } = usePlatform();
  const { currentUser } = useFirebaseAuth();

  const [config, setConfig] = useState<ThemeStudioConfig>(() => loadThemeStudioConfig());
  const [tokens, setTokens] = useState<GeneratedThemeTokens>(() =>
    generateThemeTokens(loadThemeStudioConfig(), themeMode)
  );
  const [customHexDraft, setCustomHexDraft] = useState<string>(() => config.customAccentHex);

  useEffect(() => {
    const handleSync = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.config && detail?.tokens) {
        setConfig(detail.config);
        setTokens(detail.tokens);
        setCustomHexDraft(detail.config.customAccentHex);
      } else {
        const nextCfg = loadThemeStudioConfig();
        setConfig(nextCfg);
        setTokens(generateThemeTokens(nextCfg, themeMode));
      }
    };
    window.addEventListener('dataanalytix:theme-studio-updated', handleSync);
    return () => window.removeEventListener('dataanalytix:theme-studio-updated', handleSync);
  }, [themeMode]);

  const applyAndSave = (nextConfig: ThemeStudioConfig) => {
    setConfig(nextConfig);
    const resolved =
      nextConfig.mode === 'system'
        ? themeMode
        : nextConfig.mode === 'light'
        ? 'light'
        : 'dark';
    if (nextConfig.mode === 'light' || nextConfig.mode === 'dark') {
      setThemeMode(nextConfig.mode);
    } else if (nextConfig.mode === 'system') {
      const sysLight =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-color-scheme: light)').matches;
      setThemeMode(sysLight ? 'light' : 'dark');
    }
    const nextTokens = saveThemeStudioConfig(nextConfig, resolved);
    setTokens(nextTokens);

    // Also persist to signed-in user profile key if authenticated
    if (currentUser?.uid && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(
          `dataanalytix_user_theme_${currentUser.uid}`,
          JSON.stringify(nextConfig)
        );
      } catch {
        // ignore storage quota errors
      }
    }
  };

  const handleReset = () => {
    const nextTokens = resetThemeStudioConfig();
    const defCfg = loadThemeStudioConfig();
    setConfig(defCfg);
    setCustomHexDraft(defCfg.customAccentHex);
    setTokens(nextTokens);
    setThemeMode('dark');
  };

  return (
    <div
      data-testid="theme-studio-panel"
      className={`rounded-2xl border border-subtle bg-card text-primary ${
        compact ? 'p-4 space-y-4 shadow-2xl' : 'p-5 sm:p-6 space-y-5 shadow-xs'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-subtle">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-xl bg-accent-soft text-accent flex items-center justify-center shrink-0">
            <Palette className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <h3 className="font-heading text-sm sm:text-base font-bold text-primary leading-tight">
              Theme Studio
            </h3>
            <p className="text-xs text-secondary truncate">
              One source of truth for surfaces, glass, radius, and chart palette
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            data-testid="theme-studio-reset-btn"
            onClick={handleReset}
            className="px-2.5 py-1.5 rounded-xl bg-input hover:bg-elevated border border-subtle text-xs font-semibold text-secondary hover:text-primary inline-flex items-center gap-1.5 cursor-pointer"
            title="Reset all theme tokens to default"
          >
            <RotateCcw className="w-3.5 h-3.5 text-accent" />
            <span>Reset to default</span>
          </button>
          {onClose && (
            <button
              type="button"
              data-testid="theme-studio-close-btn"
              onClick={onClose}
              aria-label="Close Theme Studio"
              className="p-1.5 rounded-xl bg-input hover:bg-elevated border border-subtle text-secondary hover:text-primary cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 1. Appearance Mode: Light / Dark / Auto */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-secondary">
          1. Appearance Mode
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'dark', label: 'Dark', icon: Moon },
              { id: 'system', label: 'Auto', icon: Monitor },
            ] as const
          ).map((m) => {
            const Icon = m.icon;
            const isSelected = config.mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                data-testid={`theme-mode-${m.id}`}
                aria-pressed={isSelected}
                onClick={() => applyAndSave({ ...config, mode: m.id })}
                className={`min-h-[38px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-accent text-on-accent border-subtle font-bold shadow-xs'
                    : 'bg-input hover:bg-elevated text-primary border-subtle'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Accent Presets + Custom Picker + Auto-Contrast Note */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-semibold text-secondary">
            2. Accent Preset &amp; Custom Colour
          </label>
          <span
            data-testid="theme-contrast-ratio-badge"
            className="text-xs font-mono text-accent"
          >
            Contrast {tokens.contrastRatioOnCard.toFixed(1)}:1 (AA Pass)
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {ACCENT_PRESETS.map((preset) => {
            const isSelected = config.accentPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                data-testid={`theme-preset-${preset.id}`}
                aria-pressed={isSelected}
                onClick={() =>
                  applyAndSave({
                    ...config,
                    accentPreset: preset.id,
                    customAccentHex:
                      tokens.resolvedMode === 'light' ? preset.lightHex : preset.darkHex,
                  })
                }
                className={`min-h-[38px] px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-accent text-on-accent border-strong font-bold shadow-xs'
                    : 'bg-input hover:bg-elevated text-primary border-subtle'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full border border-subtle shrink-0"
                  style={{ backgroundColor: preset.swatchHex }}
                />
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>

        {/* Custom Colour Picker Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <label
              htmlFor="theme-custom-color-picker"
              className="text-xs text-secondary font-medium"
            >
              Custom accent:
            </label>
            <input
              id="theme-custom-color-picker"
              type="color"
              data-testid="theme-custom-color-input"
              aria-label="Custom accent colour picker"
              value={config.customAccentHex}
              onChange={(e) => {
                const nextHex = e.target.value;
                setCustomHexDraft(nextHex);
                applyAndSave({
                  ...config,
                  accentPreset: 'custom' as AccentPresetId,
                  customAccentHex: nextHex,
                });
              }}
              className="w-8 h-8 rounded-lg border border-subtle bg-input cursor-pointer p-0.5"
            />
            <input
              type="text"
              data-testid="theme-custom-hex-input"
              aria-label="Custom accent hex code"
              value={customHexDraft}
              onChange={(e) => {
                const val = e.target.value;
                setCustomHexDraft(val);
                if (/^#?[0-9a-fA-F]{6}$/.test(val.trim())) {
                  applyAndSave({
                    ...config,
                    accentPreset: 'custom',
                    customAccentHex: val.trim().startsWith('#') ? val.trim() : `#${val.trim()}`,
                  });
                }
              }}
              className="w-24 px-2.5 py-1 rounded-lg bg-input border border-subtle text-xs font-mono text-primary"
            />
          </div>

          {/* Colour-blind-safe Accessible Palette Toggle */}
          <button
            type="button"
            data-testid="theme-accessible-palette-toggle"
            aria-pressed={config.accessiblePalette}
            onClick={() =>
              applyAndSave({ ...config, accessiblePalette: !config.accessiblePalette })
            }
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
              config.accessiblePalette
                ? 'bg-accent text-on-accent border-subtle font-bold'
                : 'bg-input hover:bg-elevated text-secondary hover:text-primary border-subtle'
            }`}
            title="Use Okabe-Ito colour-blind-safe chart hues (--chart-1 .. --chart-8)"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Accessible palette</span>
            {config.accessiblePalette && <Check className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Readability Auto-Adjustment Note */}
        {tokens.wasContrastAdjusted && (
          <div
            data-testid="theme-contrast-adjusted-note"
            className="px-3 py-1.5 rounded-xl bg-accent-soft border border-subtle text-xs text-primary flex items-center justify-between gap-2"
          >
            <span className="font-medium">
              Adjusted for readability ({tokens.rawAccentHex} → {tokens.accent})
            </span>
            <span className="font-mono text-accent font-bold">
              {tokens.contrastRatioOnCard.toFixed(1)}:1 ≥ 4.5:1
            </span>
          </div>
        )}
      </div>

      {/* 3. Glass Intensity, Radius & Density */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Glass Intensity */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-secondary">
            3. Glass Intensity
          </label>
          <div className="grid grid-cols-3 gap-1">
            {(['low', 'medium', 'high'] as GlassIntensity[]).map((g) => {
              const isSelected = config.glassIntensity === g;
              return (
                <button
                  key={g}
                  type="button"
                  data-testid={`theme-glass-${g}`}
                  aria-pressed={isSelected}
                  onClick={() => applyAndSave({ ...config, glassIntensity: g })}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-semibold capitalize cursor-pointer ${
                    isSelected
                      ? 'bg-accent text-on-accent border-subtle font-bold'
                      : 'bg-input hover:bg-elevated text-secondary border-subtle'
                  }`}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>

        {/* Radius */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-secondary">
            4. Corner Radius
          </label>
          <div className="grid grid-cols-3 gap-1">
            {(['sharp', 'rounded', 'pill'] as RadiusPreset[]).map((r) => {
              const isSelected = config.radius === r;
              return (
                <button
                  key={r}
                  type="button"
                  data-testid={`theme-radius-${r}`}
                  aria-pressed={isSelected}
                  onClick={() => applyAndSave({ ...config, radius: r })}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-semibold capitalize cursor-pointer ${
                    isSelected
                      ? 'bg-accent text-on-accent border-subtle font-bold'
                      : 'bg-input hover:bg-elevated text-secondary border-subtle'
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        {/* Density */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-secondary">
            5. Layout Density
          </label>
          <div className="grid grid-cols-2 gap-1">
            {(['comfortable', 'compact'] as DensityPreset[]).map((d) => {
              const isSelected = config.density === d;
              return (
                <button
                  key={d}
                  type="button"
                  data-testid={`theme-density-${d}`}
                  aria-pressed={isSelected}
                  onClick={() => applyAndSave({ ...config, density: d })}
                  className={`py-1.5 px-2 rounded-lg border text-xs font-semibold capitalize cursor-pointer ${
                    isSelected
                      ? 'bg-accent text-on-accent border-subtle font-bold'
                      : 'bg-input hover:bg-elevated text-secondary border-subtle'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Live Preview Card (KPI + 8-Color Chart Palette Swatches) */}
      <div
        data-testid="theme-studio-live-preview"
        className="p-3.5 rounded-2xl border border-subtle bg-input space-y-2.5"
      >
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-primary inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Live Token &amp; Chart Palette Preview</span>
          </span>
          <span className="font-mono text-accent">{tokens.accent}</span>
        </div>

        <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-card border border-subtle">
          <div>
            <div className="text-xs text-secondary">Closed-Won Revenue</div>
            <div className="text-base font-heading font-bold text-primary tabular-nums">
              $4.75M
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-accent text-on-accent text-xs font-bold">
            Active Pill
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-secondary">
            <span>Generated Chart Palette (--chart-1 .. --chart-8)</span>
            <span className="font-mono">
              {config.accessiblePalette ? 'Accessible (Color-Blind Safe)' : 'Accent-Led Harmonic'}
            </span>
          </div>
          <div className="grid grid-cols-8 gap-1.5" data-testid="theme-chart-palette-swatches">
            {tokens.chartPalette.map((hex, idx) => (
              <div
                key={idx}
                data-testid={`theme-chart-swatch-${idx + 1}`}
                className="h-5 rounded-md border border-subtle"
                style={{ backgroundColor: hex }}
                title={`--chart-${idx + 1}: ${hex}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
