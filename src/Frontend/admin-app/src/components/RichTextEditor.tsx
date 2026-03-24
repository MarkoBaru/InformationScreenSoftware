import { useRef, useCallback } from 'react'
import './RichTextEditor.css'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  onInsertImage?: () => void
  placeholder?: string
}

export default function RichTextEditor({ value, onChange, onInsertImage, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)

  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value)
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }, [onChange])

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }

  return (
    <div className="rich-editor">
      <div className="rich-editor__toolbar">
        <button type="button" title="Fett" onMouseDown={e => { e.preventDefault(); exec('bold') }}>
          <strong>B</strong>
        </button>
        <button type="button" title="Kursiv" onMouseDown={e => { e.preventDefault(); exec('italic') }}>
          <em>I</em>
        </button>
        <button type="button" title="Unterstrichen" onMouseDown={e => { e.preventDefault(); exec('underline') }}>
          <u>U</u>
        </button>
        <span className="rich-editor__separator" />
        <button type="button" title="Überschrift 2" onMouseDown={e => { e.preventDefault(); exec('formatBlock', 'h2') }}>
          H2
        </button>
        <button type="button" title="Überschrift 3" onMouseDown={e => { e.preventDefault(); exec('formatBlock', 'h3') }}>
          H3
        </button>
        <button type="button" title="Absatz" onMouseDown={e => { e.preventDefault(); exec('formatBlock', 'p') }}>
          ¶
        </button>
        <span className="rich-editor__separator" />
        <button type="button" title="Aufzählung" onMouseDown={e => { e.preventDefault(); exec('insertUnorderedList') }}>
          • Liste
        </button>
        <button type="button" title="Nummerierung" onMouseDown={e => { e.preventDefault(); exec('insertOrderedList') }}>
          1. Liste
        </button>
        <span className="rich-editor__separator" />
        {onInsertImage && (
          <button type="button" title="Bild einfügen" onMouseDown={e => { e.preventDefault(); onInsertImage() }}>
            🖼 Bild
          </button>
        )}
      </div>
      <div
        ref={editorRef}
        className="rich-editor__content"
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: value }}
        onInput={handleInput}
        onPaste={handlePaste}
        data-placeholder={placeholder || 'Schreiben Sie hier Ihren Beitrag...'}
      />
    </div>
  )
}
