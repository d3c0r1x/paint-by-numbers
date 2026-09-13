import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { translate, saveLang } from '../i18n';
import { listProjects, getProject, deleteProject, blobToLabels } from '../storage/projects';
import type { Project } from '../storage/projects';
import type { PipelineResult, PaletteEntry } from '../engine/types';
import { getCatalogArtworks, type CatalogArtwork } from '../catalog';
import { Button } from '../ui/Button';
import { LogoMark, IconTrash, IconFolder } from '../ui/icons';
import { DarkModeToggle } from '../ui/DarkModeToggle';

type ListedProject = Project & { thumbnail: string | null };

export function HomeScreen() {
  const lang = useAppStore((s) => s.lang);
  const setLang = useAppStore((s) => s.setLang);
  const setSource = useAppStore((s) => s.setSource);
  const setPipeline = useAppStore((s) => s.setPipeline);
  const setProjectId = useAppStore((s) => s.setProjectId);
  const setRestoredProject = useAppStore((s) => s.setRestoredProject);
  const goTo = useAppStore((s) => s.goTo);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [projects, setProjects] = useState<ListedProject[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const catalog = getCatalogArtworks();
  const catalogName = (artwork: CatalogArtwork) =>
    lang === 'ru' ? artwork.title : artwork.titleEn;
  const catalogCategory = (artwork: CatalogArtwork) =>
    lang === 'ru' ? artwork.category : artwork.categoryEn;

  const t = (key: string) => translate(lang, key);

  const refresh = useCallback(() => {
    void listProjects()
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);

  const [firstVisitDismissed, setFirstVisitDismissed] = useState<boolean | null>(null);
  const dismissedKey = 'pbn.startHint.dismissed';

  useEffect(() => {
    try {
      setFirstVisitDismissed(localStorage.getItem(dismissedKey) === '1');
    } catch {
      // ignore private-mode / restricted-storage failures
    }
  }, []);

  async function dismissFirstVisit() {
    setFirstVisitDismissed(true);
    try {
      localStorage.setItem(dismissedKey, '1');
    } catch {
      // ignore persistence failures
    }
  }

  function handleFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(t('home.error.notImage'));
      return;
    }
    // A fresh import must not inherit stale state from a previous session.
    setPipeline(null);
    setProjectId(null);
    setFileName(file.name);
    setSource(file, file.name);
    goTo('processing');
  }

  async function openCatalogArtwork(artwork: CatalogArtwork) {
    setError(null);
    setRestoredProject(null);
    setPipeline(artwork.result);
    setProjectId(null);
    setSource(artwork.source, catalogName(artwork));
    goTo('coloring');
  }

  async function openProject(id: string) {
    setBusyId(id);
    try {
      const project = await getProject(id);
      if (!project) return;
      const labels = await blobToLabels(project.labels);
      const palette: PaletteEntry[] = project.palette.map((p) => ({
        index: p.colorIdx,
        lab: [0, 0, 0], // lab is only needed during conversion, not coloring
        hex: p.hex,
        pixelCount: 0,
      }));
      const result: PipelineResult = {
        width: project.width,
        height: project.height,
        labels,
        palette,
        regions: project.regions,
      };
      setPipeline(result);
      setProjectId(project.id);
      setRestoredProject({ customColors: project.customColors, strokes: project.strokes });
      setSource(project.sourceImage, project.name);
      goTo('coloring');
    } finally {
      setBusyId(null);
    }
  }

  async function removeProject(id: string) {
    if (!window.confirm(t('common.confirmDelete'))) return;
    await deleteProject(id);
    refresh();
  }

  return (
    <div className="thin-scroll mx-auto flex h-full w-full max-w-md flex-col gap-5 overflow-y-auto p-5">
      <header className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <LogoMark />
          <h1 className="text-[20px] font-bold tracking-tight">{t('app.title')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <DarkModeToggle className="h-9 w-9" />
          <div className="flex rounded-full bg-paper-deep/60 p-1 text-xs font-bold">
            {(['ru', 'en'] as const).map((l) => (
              <button
                key={l}
                onClick={() => {
                  setLang(l);
                  saveLang(l);
                }}
                className={`rounded-full px-3 py-1.5 uppercase transition-colors ${
                  lang === l ? 'bg-paper text-ink shadow-sm' : 'text-ink-soft'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Upload orb (reference screen 01) */}
      <section className="rounded-3xl border border-paper-deep bg-paper p-5 text-center shadow-sm">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <button
          onClick={() => inputRef.current?.click()}
          type="button"
          className="group relative mx-auto mt-2 mb-4 flex h-44 w-44 items-center justify-center rounded-full text-center transition-transform active:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
          style={{
            background: 'radial-gradient(circle at 30% 25%, #f3d9a8 0%, #e8b84b 55%, #c99030 100%)',
            boxShadow:
              'inset 0 -16px 32px rgb(120 78 20 / 0.3), inset 0 16px 32px rgb(255 255 255 / 0.5), 0 22px 40px -18px rgb(180 130 40 / 0.7)',
          }}
          aria-label={t('home.pickImage')}
        >
          <span className="px-6 text-[17px] font-bold leading-tight whitespace-pre-line text-[#4a3208]">
            {t('home.pickImage')}
          </span>
          {/* Rotating dashed ring */}
          <span
            className="pbn-orb-ring absolute -inset-3.5 rounded-full border-2 border-dashed border-[#c99030]/40"
            aria-hidden="true"
          />
        </button>
        <p className="-mt-1 text-xs text-ink-faint">{t('home.pickHint')}</p>
        {fileName && !error && <p className="mt-2 truncate text-xs text-ink-faint">{fileName}</p>}
        {error && <p className="mt-2 text-sm text-accent">{error}</p>}
      </section>

      {!firstVisitDismissed && projects.length === 0 && (
        <div className="rounded-3xl border border-accent/20 bg-accent/5 p-4 text-center shadow-sm">
          <h3 className="mb-1.5 text-sm font-semibold text-ink">{t('home.startHint.title')}</h3>
          <p className="text-sm text-ink-soft">{t('home.startHint.body')}</p>
          <Button variant="secondary" onClick={dismissFirstVisit} className="mt-3">
            {t('home.startHint.dismiss')}
          </Button>
        </div>
      )}

      {/* My projects */}
      <section className="rounded-3xl border border-paper-deep bg-paper p-5 shadow-sm">
        <h2 className="mb-3.5 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-ink-soft">
          <IconFolder size={15} />
          {t('home.myProjects')}
        </h2>
        {projects.length === 0 ? (
          <p className="text-sm text-ink-faint">{t('home.noProjects')}</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {projects.map((project) => (
              <li
                key={project.id}
                className="flex items-center gap-3 rounded-2xl border border-paper-deep bg-paper-warm/60 p-2.5"
              >
                {project.thumbnail ? (
                  <img
                    src={project.thumbnail}
                    alt=""
                    className="h-12 w-12 rounded-xl border border-paper-deep object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-xl border border-paper-deep bg-paper-deep/60" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{project.name}</p>
                  <p className="text-xs text-ink-faint">
                    {new Date(project.updatedAt).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US')}
                  </p>
                </div>
                <Button
                  variant="primary"
                  onClick={() => void openProject(project.id)}
                  disabled={busyId === project.id}
                  className="!px-3 !py-1.5 !text-xs"
                >
                  {t('common.open')}
                </Button>
                <button
                  onClick={() => void removeProject(project.id)}
                  type="button"
                  aria-label={t('common.delete')}
                  title={t('common.delete')}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-faint active:bg-accent/10 active:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
                >
                  <IconTrash size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Built-in catalog: instant, real numbered templates */}
      <section id="catalog" className="rounded-3xl border border-paper-deep bg-paper p-5 shadow-sm">
        <div className="mb-3.5 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-ink-soft">
            <span aria-hidden="true">✦</span>
            {t('home.catalog')}
          </h2>
          <span className="text-xs text-ink-faint">
            {catalog.length} {lang === 'ru' ? 'сюжетов' : 'paintings'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {catalog.map((artwork) => (
            <button
              key={artwork.id}
              onClick={() => void openCatalogArtwork(artwork)}
              type="button"
              className="group overflow-hidden rounded-2xl border border-paper-deep bg-paper-warm/60 text-left transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
              aria-label={`${t('common.open')}: ${catalogName(artwork)}`}
            >
              <img
                src={artwork.previewUrl}
                alt=""
                className="aspect-[3/2] w-full object-cover transition-transform group-hover:scale-[1.03]"
              />
              <span className="block truncate px-2.5 pt-2 text-sm font-semibold">
                {catalogName(artwork)}
              </span>
              <span className="block px-2.5 pb-2.5 text-xs text-ink-faint">
                {catalogCategory(artwork)} · {artwork.palette.length}{' '}
                {lang === 'ru' ? 'цветов' : 'colors'}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Catalog teaser */}
      <button
        onClick={() =>
          document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
        type="button"
        className="relative mt-auto flex aspect-[16/7] flex-col justify-end overflow-hidden rounded-3xl p-4 text-left transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        style={{
          background:
            'linear-gradient(180deg, rgba(28,25,23,.35), rgba(28,25,23,.75)), linear-gradient(160deg, #7b8ba5 0%, #4a5872 60%, #333f55 100%)',
        }}
        aria-label={t('home.catalog')}
      >
        <span className="absolute top-3 right-3 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
          {t('home.catalog')}
        </span>
        <span className="text-base font-bold text-white">{t('home.catalog')}</span>
        <span className="text-xs text-white/75">{t('home.catalogSub')}</span>
      </button>
    </div>
  );
}
