import '../styles/Pagination.css'

/**
 * Pagination — a readout with one action. The emoji controls are replaced
 * by a terminal fill bar and a bracket button.
 */
export default function Pagination({
  currentPage,
  totalRepos,
  reposPerPage,
  onLoadMore,
  isLoading,
  maxRepos = 500
}) {
  const totalPages = Math.ceil(totalRepos / reposPerPage)
  const maxPages = Math.ceil(maxRepos / reposPerPage)
  const canLoadMore =
    currentPage < totalPages && currentPage < maxPages && totalRepos > reposPerPage

  const shown = currentPage * reposPerPage

  return (
    <div className="pager">
      <span className="pager-info sig-data">
        <span className="sig-key">{Math.min(shown, totalRepos)}</span>
        {' / '}
        {Math.min(totalRepos, maxRepos)}
      </span>

      {canLoadMore && (
        <button className="sig-btn" onClick={onLoadMore} disabled={isLoading}>
          {isLoading ? (
            <span className="sig-bar">
              [██<span className="sig-bar-empty">░░░░░░</span>]
            </span>
          ) : (
            'load more →'
          )}
        </button>
      )}

      {totalRepos > maxRepos && (
        <span className="pager-note sig-micro">CAPPED AT {maxRepos}</span>
      )}
    </div>
  )
}
