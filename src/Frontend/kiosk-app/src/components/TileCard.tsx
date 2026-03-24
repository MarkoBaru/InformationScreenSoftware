import { TileData } from '../api'
import './TileCard.css'

interface TileCardProps {
  tile: TileData
  onClick: () => void
}

export default function TileCard({ tile, onClick }: TileCardProps) {
  return (
    <button className="tile-card" onClick={onClick} type="button">
      {tile.imageUrl && (
        <div className="tile-card__image">
          <img src={tile.imageUrl} alt={tile.title} loading="lazy" />
        </div>
      )}
      <div className="tile-card__content">
        <h3 className="tile-card__title">{tile.title}</h3>
        {tile.description && (
          <p className="tile-card__desc">{tile.description}</p>
        )}
        {tile.categoryName && (
          <span className="tile-card__category">{tile.categoryName}</span>
        )}
      </div>
    </button>
  )
}
