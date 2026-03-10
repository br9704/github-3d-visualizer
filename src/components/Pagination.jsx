import '../styles/Pagination.css'

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
  const canLoadMore = currentPage < totalPages && currentPage < maxPages && totalRepos > reposPerPage

  const nextPage = currentPage + 1
  const itemsShown = currentPage * reposPerPage

  return (
    <div className="pagination-container">
      <div className="pagination-info">
        Showing {itemsShown} of {Math.min(totalRepos, maxRepos)} repos
      </div>

      {canLoadMore && (
        <button
          className="load-more-button"
          onClick={onLoadMore}
          disabled={isLoading}
        >
          {isLoading ? '⏳ Loading...' : '📥 Load More Repos'}
        </button>
      )}

      {totalRepos > maxRepos && (
        <div className="pagination-notice">
          Capped at {maxRepos} repos to maintain performance
        </div>
      )}
    </div>
  )
}
