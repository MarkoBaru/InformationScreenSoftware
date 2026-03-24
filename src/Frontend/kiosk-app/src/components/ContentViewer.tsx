import './ContentViewer.css'

interface ContentViewerProps {
  url?: string | null
  contentType: 'Link' | 'Video' | 'Pdf' | 'Article'
  articleBody?: string | null
  title?: string
  onBack: () => void
}

export default function ContentViewer({ url, contentType, articleBody, title, onBack }: ContentViewerProps) {
  const renderContent = () => {
    switch (contentType) {
      case 'Video':
        return (
          <video
            className="content-viewer__video"
            src={url || ''}
            controls
            autoPlay
            style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
          />
        )
      case 'Pdf':
        return (
          <iframe
            className="content-viewer__frame"
            src={url || ''}
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
      default: // Link
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

  return (
    <div className="content-viewer">
      {renderContent()}
      <button className="content-viewer__back" onClick={onBack} type="button">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Zurück zur Übersicht
      </button>
    </div>
  )
}
