import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { screensApi, Screen, ScreenList, Tile, tilesApi, TileList } from '../api'
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

function FolderChildPicker({ folderId, allTiles, onChanged, screenId, allScreens }: {
  folderId: number
  allTiles: TileList[]
  onChanged: () => void
  screenId: number
  allScreens: ScreenList[]
}) {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [busy, setBusy] = useState<number | null>(null)

  const screenName = allScreens.find(s => s.id === screenId)?.name || ''
  const childIds = useMemo(() => new Set(
    allTiles.filter(t => t.parentTileId === folderId && t.assignedScreens.includes(screenName)).map(t => t.id)
  ), [allTiles, folderId, screenName])
  const contentTypes = useMemo(() => [...new Set(allTiles.filter(t => t.id !== folderId && t.contentType !== 'Folder').map(t => t.contentType))].sort(), [allTiles, folderId])

  const filtered = useMemo(() => {
    let list = allTiles.filter(t => t.id !== folderId && t.contentType !== 'Folder')
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(t => t.title.toLowerCase().includes(q))
    }
    if (filterType) list = list.filter(t => t.contentType === filterType)
    // assigned children first
    list.sort((a, b) => {
      const aIn = childIds.has(a.id) ? 0 : 1
      const bIn = childIds.has(b.id) ? 0 : 1
      if (aIn !== bIn) return aIn - bIn
      return a.title.localeCompare(b.title)
    })
    return list
  }, [allTiles, folderId, childIds, search, filterType])

  const toggle = async (tile: TileList) => {
    setBusy(tile.id)
    try {
      const isChild = childIds.has(tile.id)
      // Compute current screenIds from assignedScreens names
      const currentScreenIds = allScreens
        .filter(s => tile.assignedScreens.includes(s.name))
        .map(s => s.id)
      let newScreenIds: number[]
      if (isChild) {
        // Remove from this screen
        newScreenIds = currentScreenIds.filter(id => id !== screenId)
      } else {
        // Add to this screen
        newScreenIds = currentScreenIds.includes(screenId)
          ? currentScreenIds
          : [...currentScreenIds, screenId]
      }
      await tilesApi.update(tile.id, {
        title: tile.title, description: tile.description || undefined,
        imageUrl: tile.imageUrl || undefined, linkUrl: tile.linkUrl || undefined,
        linkTarget: tile.linkTarget, contentType: tile.contentType,
        articleBody: tile.articleBody || undefined, sortOrder: tile.sortOrder,
        isActive: tile.isActive, activeFrom: tile.activeFrom || undefined,
        activeTo: tile.activeTo || undefined,
        parentTileId: isChild ? undefined : folderId,
        categoryId: tile.categoryId || undefined,
        screenIds: newScreenIds,
      })
      onChanged()
    } catch (err) {
      alert('Fehler: ' + (err as Error).message)
    } finally { setBusy(null) }
  }

  return (
    <div style={{ margin: '4px 0 8px', border: '1px solid #e0e0e0', borderRadius: 8, background: '#fafafa' }}>
      <div className="folder-picker-toolbar" style={{ padding: '8px 10px', gap: 6 }}>
        <input
          type="text"
          placeholder="Suche..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="folder-picker-toolbar__search"
          style={{ fontSize: '0.8rem' }}
        />
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ fontSize: '0.8rem' }}>
          <option value="">Alle Typen</option>
          {contentTypes.map(ct => <option key={ct} value={ct}>{ct}</option>)}
        </select>
      </div>
      <div className="folder-picker-list" style={{ maxHeight: 220, padding: '0 4px 4px' }}>
        {filtered.map(t => (
          <div
            key={t.id}
            className="folder-child-row"
            onClick={() => { if (busy === null) toggle(t) }}
            style={{ cursor: busy === t.id ? 'wait' : 'pointer', padding: '4px 8px', fontSize: '0.82rem' }}
          >
            <input
              type="checkbox"
              checked={childIds.has(t.id)}
              onChange={() => {}}
              onClick={e => e.stopPropagation()}
              style={{ width: 'auto', flexShrink: 0 }}
            />
            <span className="folder-child-row__icon" style={{ fontSize: '0.8rem' }}>
              {CONTENT_ICONS[t.contentType] || '📎'}
            </span>
            <span className="folder-child-row__title" style={{ color: childIds.has(t.id) ? 'var(--primary)' : 'var(--text)', fontSize: '0.82rem' }}>{t.title}</span>
            <span className="folder-child-row__type" style={{ fontSize: '0.7rem' }}>{t.contentType}</span>
            {busy === t.id && <span style={{ fontSize: '0.7rem', color: '#888' }}>...</span>}
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 12, textAlign: 'center', color: '#999', fontSize: '0.8rem' }}>Keine Inhalte gefunden.</div>
        )}
      </div>
    </div>
  )
}

function TreeNodeRow({ node, depth, expanded, onToggle, allTiles, onTilesChanged, screenId, allScreens }: {
  node: TreeNode
  depth: number
  expanded: Set<number>
  onToggle: (id: number) => void
  allTiles: TileList[]
  onTilesChanged: () => void
  screenId: number
  allScreens: ScreenList[]
}) {
  const t = node.tile
  const hasChildren = node.children.length > 0
  const isExpanded = expanded.has(t.id)
  const icon = CONTENT_ICONS[t.contentType] || '📎'
  const summary = contentSummary(t)
  const [showPicker, setShowPicker] = useState(false)

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

        {t.contentType === 'Folder' && (
          <button
            className="btn btn--small"
            style={{ marginLeft: 4, padding: '1px 8px', fontSize: '0.8rem', lineHeight: 1.4 }}
            onClick={(e) => { e.stopPropagation(); setShowPicker(p => !p) }}
            title="Inhalte zuweisen"
          >
            {showPicker ? '−' : '+'}
          </button>
        )}
      </div>

      {summary && (
        <div className="tree-node__content" style={{ paddingLeft: depth * 28 + 52 }}>
          {summary}
        </div>
      )}

      {showPicker && (
        <div style={{ paddingLeft: depth * 28 + 52, paddingRight: 12 }}>
          <FolderChildPicker folderId={t.id} allTiles={allTiles} onChanged={onTilesChanged} screenId={screenId} allScreens={allScreens} />
        </div>
      )}

      {hasChildren && isExpanded && node.children.map((child) => (
        <TreeNodeRow
          key={child.tile.id}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          onToggle={onToggle}
          allTiles={allTiles}
          onTilesChanged={onTilesChanged}
          screenId={screenId}
          allScreens={allScreens}
        />
      ))}
    </>
  )
}

function ScreenSection({ screenSummary, allScreens }: { screenSummary: ScreenList; allScreens: ScreenList[] }) {
  const [screen, setScreen] = useState<Screen | null>(null)
  const [allTiles, setAllTiles] = useState<TileList[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([
      screensApi.get(screenSummary.id),
      tilesApi.list(),
    ]).then(([s, tiles]) => {
      setScreen(s)
      setAllTiles(tiles)
      setOpen(true)
    }).finally(() => setLoading(false))
  }, [screenSummary.id])

  const toggle = useCallback(() => {
    if (screen) { setOpen(o => !o); return }
    loadData()
  }, [screen, loadData])

  const reloadTiles = useCallback(() => {
    Promise.all([
      screensApi.get(screenSummary.id),
      tilesApi.list(),
    ]).then(([s, tiles]) => {
      setScreen(s)
      setAllTiles(tiles)
    })
  }, [screenSummary.id])

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
                      <TreeNodeRow key={node.tile.id} node={node} depth={0} expanded={expanded} onToggle={toggleNode} allTiles={allTiles} onTilesChanged={reloadTiles} screenId={screenSummary.id} allScreens={allScreens} />
                    ))}
                  </div>
                ))}
                {orphans.length > 0 && (
                  <div className="tree-category">
                    <div className="tree-category__header" style={{ color: '#c62828' }}>Verwaiste Inhalte</div>
                    {orphans.map(node => (
                      <TreeNodeRow key={node.tile.id} node={node} depth={0} expanded={expanded} onToggle={toggleNode} allTiles={allTiles} onTilesChanged={reloadTiles} screenId={screenSummary.id} allScreens={allScreens} />
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
            <ScreenSection key={s.id} screenSummary={s} allScreens={screens} />
          ))}
        </div>
      )}
    </div>
  )
}
