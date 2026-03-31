import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { screensApi, Screen, Tile } from '../api'
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

export default function ScreenOverviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [screen, setScreen] = useState<Screen | null>(null)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (id) {
      screensApi.get(Number(id)).then(setScreen).catch(() => navigate('/'))
    }
  }, [id, navigate])

  const { roots, orphans } = useMemo(() => {
    if (!screen) return { roots: [], orphans: [] }
    return buildTree(screen.tiles)
  }, [screen])

  const expandAll = () => {
    if (!screen) return
    const allIds = new Set(screen.tiles.filter(t => t.contentType === 'Folder' || screen.tiles.some(c => c.parentTileId === t.id)).map(t => t.id))
    setExpanded(allIds)
  }

  const collapseAll = () => setExpanded(new Set())

  const toggleNode = (nodeId: number) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }

  // Group roots by category
  const groupedRoots = useMemo(() => {
    const groups: { name: string; nodes: TreeNode[] }[] = []
    const catMap = new Map<string, TreeNode[]>()
    for (const node of roots) {
      const catName = node.tile.categoryName || 'Allgemein'
      if (!catMap.has(catName)) catMap.set(catName, [])
      catMap.get(catName)!.push(node)
    }
    for (const [name, nodes] of catMap) {
      groups.push({ name, nodes })
    }
    return groups
  }, [roots])

  if (!screen) {
    return <div className="page"><p>Laden...</p></div>
  }

  const totalTiles = screen.tiles.length
  const activeTiles = screen.tiles.filter(t => t.isActive).length
  const folders = screen.tiles.filter(t => t.contentType === 'Folder').length

  return (
    <div className="page">
      <div className="page__header">
        <h1>Übersicht: {screen.name}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn--small" onClick={() => navigate(`/screens/${id}`)}>Bearbeiten</button>
          <a className="btn btn--small" href={`/kiosk/${screen.slug}`} target="_blank" rel="noopener noreferrer">Kiosk ansehen</a>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-card__number">{totalTiles}</div>
          <div className="stat-card__label">Inhalte gesamt</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__number">{activeTiles}</div>
          <div className="stat-card__label">Aktiv</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__number">{folders}</div>
          <div className="stat-card__label">Ordner</div>
        </div>
      </div>

      <div className="tree-toolbar">
        <button className="btn btn--small" onClick={expandAll}>Alle aufklappen</button>
        <button className="btn btn--small" onClick={collapseAll}>Alle einklappen</button>
      </div>

      <div className="tree-container">
        {groupedRoots.length === 0 && orphans.length === 0 ? (
          <div className="empty-state">
            <p>Diesem Screen sind keine Inhalte zugewiesen.</p>
            <Link to={`/screens/${id}`} className="btn btn--primary">Inhalte zuweisen</Link>
          </div>
        ) : (
          <>
            {groupedRoots.map((group) => (
              <div key={group.name} className="tree-category">
                <div className="tree-category__header">{group.name}</div>
                {group.nodes.map((node) => (
                  <TreeNodeRow
                    key={node.tile.id}
                    node={node}
                    depth={0}
                    expanded={expanded}
                    onToggle={toggleNode}
                  />
                ))}
              </div>
            ))}
            {orphans.length > 0 && (
              <div className="tree-category">
                <div className="tree-category__header" style={{ color: '#c62828' }}>Verwaiste Inhalte</div>
                {orphans.map((node) => (
                  <TreeNodeRow
                    key={node.tile.id}
                    node={node}
                    depth={0}
                    expanded={expanded}
                    onToggle={toggleNode}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
