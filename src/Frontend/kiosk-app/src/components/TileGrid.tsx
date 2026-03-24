import { TileData } from '../api'
import TileCard from './TileCard'
import './TileGrid.css'

interface TileGridProps {
  tiles: TileData[]
  onTileClick: (tile: TileData) => void
}

export default function TileGrid({ tiles, onTileClick }: TileGridProps) {
  return (
    <div className="tile-grid">
      {tiles.map((tile) => (
        <TileCard key={tile.id} tile={tile} onClick={() => onTileClick(tile)} />
      ))}
    </div>
  )
}
