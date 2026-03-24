import { useSearchParams, useNavigate, useParams } from 'react-router-dom'
import ContentViewer from '../components/ContentViewer'

export default function ContentScreen() {
  const [searchParams] = useSearchParams()
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const url = searchParams.get('url')

  if (!url) {
    navigate(`/kiosk/${slug}`)
    return null
  }

  return (
    <ContentViewer
      url={url}
      contentType="Link"
      onBack={() => navigate(`/kiosk/${slug}`)}
    />
  )
}
