import { useState, useEffect, useRef, useCallback } from 'react'
import StreamPlayer from './StreamPlayer'
import './ContentViewer.css'

const MONTH_MAPPING: Record<string, { sheet: string; item: string }> = {
  Januar: { sheet: 'Jan', item: 'SchichtplanJan' },
  Februar: { sheet: 'Feb', item: 'SchichtplanFeb' },
  'März': { sheet: 'März', item: 'SchichtplanMärz' },
  April: { sheet: 'April', item: 'SchichtplanApril' },
  Mai: { sheet: 'Mai', item: 'SchichtplanMai' },
  Juni: { sheet: 'Juni', item: 'SchichtplanJuni' },
  Juli: { sheet: 'Juli', item: 'SchichtplanJuli' },
  August: { sheet: 'Aug', item: 'SchichtplanAug' },
  September: { sheet: 'Sept', item: 'SchichtplanSep' },
  Oktober: { sheet: 'Okt', item: 'SchichtplanOkt' },
  November: { sheet: 'Nov', item: 'SchichtplanNov' },
  Dezember: { sheet: 'Dez', item: 'SchichtplanDez' },
}

const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

function resolveMonthName(monthMode: string): string {
  if (monthMode === 'current') return MONTH_NAMES[new Date().getMonth()]
  if (monthMode === 'next') return MONTH_NAMES[(new Date().getMonth() + 1) % 12]
  if (monthMode === 'nextNext') return MONTH_NAMES[(new Date().getMonth() + 2) % 12]
  return monthMode // fester Monatsname
}

function buildSchichtplanUrl(baseUrl: string, monthName: string): string {
  const mapping = MONTH_MAPPING[monthName] || { sheet: monthName, item: 'Schichtplan' + monthName }
  return baseUrl +
    '&action=embedview' +
    '&wdAllowInteractivity=False' +
    "&ActiveCell='" + mapping.sheet + "'!E4" +
    '&wdHideGridlines=True' +
    '&wdHideHeaders=True' +
    '&wdInConfigurator=True' +
    '&wdInConfigurator=True' +
    '&ed1JS=true' +
    '&wdHideSheetTabs=True' +
    '&Item=' + mapping.item +
    '&wdHideHeaders=True'
}

interface ContentViewerProps {
  url?: string | null
  contentType: 'Link' | 'FullscreenImage' | 'Video' | 'Pdf' | 'Article' | 'Schichtplan' | 'Stream' | 'Folder'
  articleBody?: string | null
  title?: string
  onBack: () => void
  onHome?: () => void
}

export default function ContentViewer({ url, contentType, articleBody, title, onBack, onHome }: ContentViewerProps) {
  const [navVisible, setNavVisible] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetTimer = useCallback(() => {
    setNavVisible(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setNavVisible(false), 3000)
  }, [])

  useEffect(() => {
    resetTimer()
    const events = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'wheel'] as const
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      events.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [resetTimer])

  const renderContent = () => {
    switch (contentType) {
      case 'FullscreenImage':
        return (
          <img
            className="content-viewer__fullscreen-image"
            src={url || ''}
            alt={title || 'Bild'}
            style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
          />
        )
      case 'Video':
        return (
          <video
            className="content-viewer__video"
            src={url || ''}
            controls
            autoPlay
            loop
            style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
          />
        )
      case 'Pdf':
        return (
          <iframe
            className="content-viewer__frame"
            src={(url || '') + '#toolbar=0&navpanes=0'}
            title={title || 'PDF'}
          />
        )
      case 'Article':
        return (
          <div className="content-viewer__article">
            <h1>{title}</h1>
            <div
              className="content-viewer__article-body"
              dangerouslySetInnerHTML={{ __html: articleBody || '' }}
            />
          </div>
        )
      case 'Schichtplan': {
        try {
          const cfg = JSON.parse(articleBody || '{}')
          const monthName = resolveMonthName(cfg.monthMode || 'current')
          const embedUrl = buildSchichtplanUrl(cfg.baseUrl || '', monthName)
          return (
            <iframe
              className="content-viewer__frame"
              src={embedUrl}
              title={`Schichtplan ${monthName} ${cfg.year || ''}`}
            />
          )
        } catch {
          return <div style={{ padding: 48, textAlign: 'center' }}>Fehler: Ungültige Schichtplan-Konfiguration</div>
        }
      }
      case 'Stream':
        return (
          <StreamPlayer
            url={url || ''}
            className="content-viewer__video"
            style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
          />
        )
      default: { // Link
        let splitCfg: { splitscreen?: number; urls?: string[] } | null = null
        if (articleBody) {
          try { splitCfg = JSON.parse(articleBody) } catch { /* ignore */ }
        }
        if (splitCfg && (splitCfg.splitscreen === 2 || splitCfg.splitscreen === 4)) {
          const urls = splitCfg.urls || []
          return (
            <div className={`content-viewer__split content-viewer__split--${splitCfg.splitscreen}`}>
              {Array.from({ length: splitCfg.splitscreen }, (_, i) => (
                <iframe
                  key={i}
                  className="content-viewer__frame"
                  src={urls[i] || ''}
                  title={`Split ${i + 1}`}
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                />
              ))}
            </div>
          )
        }
        return (
          <iframe
            className="content-viewer__frame"
            src={url || ''}
            title="Content"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          />
        )
      }
    }
  }

  return (
    <div className="content-viewer">
      {renderContent()}
      <div className={`content-viewer__nav-group${navVisible ? '' : ' content-viewer__nav-group--hidden'}`}>
        {onHome && (
          <button className="content-viewer__home" onClick={onHome} type="button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10" />
            </svg>
            Home
          </button>
        )}
        <button className="content-viewer__back" onClick={onBack} type="button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Zurück zur Übersicht
        </button>
      </div>
    </div>
  )
}
