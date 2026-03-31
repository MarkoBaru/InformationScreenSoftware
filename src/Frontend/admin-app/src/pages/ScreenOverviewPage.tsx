import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { screensApi, Screen, ScreenList, Tile } from '../api'
import './PageStyles.css'

const CONTENT_ICONS: Record<string, string> = {
  Link: '🔗',
  FullscreenImage: '🖼️',
  Video: '🎬',
  Pdf: '📄',
  Article: '📰',
  Schichtplan: '📋',
  Stream: '📡',
  Folder: '📂',
}

interface TreeNode {
  tile: Tile
  children: TreeNode[]
}

function buildTree(tiles: Tile[]): { roots: TreeNode[]; orphans: TreeNode[] } {
  const map = new Map<number, TreeNode>()
  for (const tile of tiles) {
    map.set(tile.id, { tile, children: [] })
  }

  const roots: TreeNode[] = []
  const orphans: TreeNode[] = []

  for (const tile of tiles) {
    const node = map.get(tile.id)!
    if (tile.parentTileId === null) {
      roots.push(node)
    } else {
      const parent = map.get(tile.parentTileId)
      if (parent) {
        parent.children.push(node)
      } else {
        orphans.push(node)
      }
    }
  }

  // Sort by sortOrder within each level
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.tile.sortOrder - b.tile.sortOrder)
    for (const node of nodes) sortNodes(node.children)
  }
  sortNodes(roots)
  sortNodes(orphans)

  return { roots, orphans }
}

function contentSummary(t: Tile): string | null {
  if (['Link', 'Stream', 'Video', 'Pdf'].includes(t.contentType)) return t.linkUrl || null
  if (t.contentType === 'FullscreenImage') return t.imageUrl || null
  if (t.contentType === 'Article' && t.articleBody) {
    return t.articleBody.replace(/<[^>]*>/g, '').slice(0, 120)
  }
  return t.description || null
}

function TreeNodeRow({ node, depth, expanded, onToggle }: {
  node: TreeNode
  depth: number
  expanded: Set<number>
  onToggle: (id: number) => void
}) {
  const t = node.tile
  const hasChildren = node.children.length > 0
  const isExpanded = expanded.has(t.id)
  const icon = CONTENT_ICONS[t.contentType] || '📎'
  const summary = contentSummary(t)

  return (
    <>
      <div
        className="tree-node"
        style={{ paddingLeft: depth * 28 + 12 }}
      >
        {hasChildren ? (
          <button
            className="tree-node__toggle"
            onClick={() => onToggle(t.id)}
            aria-label={isExpanded ? 'Einklappen' : 'Aufklappen'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        ) : (
          <span className="tree-node__toggle tree-node__toggle--leaf" />
        )}

        <span className="tree-node__icon">{icon}</span>

        <Link to={`/tiles/${t.id}`} className="tree-node__title">
          {t.title}
        </Link>

        <span className="tree-node__type">{t.contentType}</span>

        {t.categoryName && (
          <span className="tree-node__category">{t.categoryName}</span>
        )}

        <span className={`badge ${t.isActive ? 'badge--success' : 'badge--muted'}`} style={{ fontSize: '0.7rem' }}>
          {t.isActive ? 'Aktiv' : 'Inaktiv'}
        </span>
      </div>

      {summary && (
        <div className="tree-node__content" style={{ paddingLeft: depth * 28 + 52 }}>
          {summary}
        </div>
      )}

      {hasChildren && isExpanded && node.children.map((child) => (
        <TreeNodeRow
          key={child.tile.id}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          onToggle={onToggle}
        />
      ))}
    </>
  )
}

function ScreenSection({ screenSummary }: { screenSummary: ScreenList }) {
  const [screen, setScreen] = useState<Screen | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const toggle = useCallback(() => {
    if (screen) { setOpen(o => !o); return }
    setLoading(true)
    screensApi.get(screenSummary.id).then(s => {
      setScreen(s)
      setOpen(true)
    }).finally(() => setLoading(false))
  }, [screen, screenSummary.id])

  const { roots, orphans } = useMemo(() => {
    if (!screen) return { roots: [], orphans: [] }
    return buildTree(screen.tiles)
  }, [screen])

  const groupedRoots = useMemo(() => {
    const catMap = new Map<string, TreeNode[]>()
    for (const node of roots) {
      const catName = node.tile.categoryName || 'Allgemein'
      if (!catMap.has(catName)) catMap.set(catName, [])
      catMap.get(catName)!.push(node)
    }
    return [...catMap.entries()].map(([name, nodes]) => ({ name, nodes }))
  }, [roots])

  const expandAll = () => {
    if (!screen) return
    setExpanded(new Set(screen.tiles.filter(t =>
      t.contentType === 'Folder' || screen.tiles.some(c => c.parentTileId === t.id)
    ).map(t => t.id)))
  }

  const toggleNode = (nodeId: number) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId)
      return next
    })
  }

  const s = screenSummary
  return (
    <div className="overview-screen">
      <div className="overview-screen__header" onClick={toggle}>
        <span className="overview-screen__toggle">{open ? '▼' : '▶'}</span>
        <span className={`badge ${s.isActive ? 'badge--success' : 'badge--muted'}`} style={{ fontSize: '0.7rem' }}>
          {s.isActive ? 'Aktiv' : 'Inaktiv'}
        </span>
        <h3 className="overview-screen__name">{s.name}</h3>
        <span className="overview-screen__slug">/{s.slug}</span>
        <span className="overview-screen__count">{s.tileCount} Inhalte</span>
        <Link to={`/screens/${s.id}`} className="btn btn--small" onClick={e => e.stopPropagation()}>Bearbeiten</Link>
      </div>

      {loading && <div style={{ padding: '12px 24px', color: '#888' }}>Laden...</div>}

      {open && screen && (
        <div className="overview-screen__body">
          <div className="tree-toolbar">
            <button className="btn btn--small" onClick={expandAll}>Alle aufklappen</button>
            <button className="btn btn--small" onClick={() => setExpanded(new Set())}>Alle einklappen</button>
          </div>
          <div className="tree-container" style={{ boxShadow: 'none' }}>
            {groupedRoots.length === 0 && orphans.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                <p>Keine Inhalte zugewiesen.</p>
              </div>
            ) : (
              <>
                {groupedRoots.map(g => (
                  <div key={g.name} className="tree-category">
                    <div className="tree-category__header">{g.name}</div>
                    {g.nodes.map(node => (
                      <TreeNodeRow key={node.tile.id} node={node} depth={0} expanded={expanded} onToggle={toggleNode} />
                    ))}
                  </div>
                ))}
                {orphans.length > 0 && (
                  <div className="tree-category">
                    <div className="tree-category__header" style={{ color: '#c62828' }}>Verwaiste Inhalte</div>
                    {orphans.map(node => (
                      <TreeNodeRow key={node.tile.id} node={node} depth={0} expanded={expanded} onToggle={toggleNode} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ScreenOverviewPage() {
  const [screens, setScreens] = useState<ScreenList[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    screensApi.list().then(setScreens).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page"><p>Laden...</p></div>

  const totalTiles = screens.reduce((sum, s) => sum + s.tileCount, 0)
  const activeScreens = screens.filter(s => s.isActive).length

  return (
    <div className="page">
      <div className="page__header">
        <h1>Übersicht</h1>
      </div>

      <div className="stats-grid" style={{ marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-card__number">{screens.length}</div>
          <div className="stat-card__label">Screens</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__number">{activeScreens}</div>
          <div className="stat-card__label">Aktive Screens</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__number">{totalTiles}</div>
          <div className="stat-card__label">Inhalte gesamt</div>
        </div>
      </div>

      {screens.length === 0 ? (
        <div className="empty-state">
          <p>Keine Screens vorhanden.</p>
          <Link to="/screens/new" className="btn btn--primary">Screen erstellen</Link>
        </div>
      ) : (
        <div className="overview-screens-list">
          {screens.map(s => (
            <ScreenSection key={s.id} screenSummary={s} />
          ))}
        </div>
      )}
    </div>
  )
}
