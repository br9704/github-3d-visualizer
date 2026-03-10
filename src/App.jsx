import { useState, useCallback, useRef, useEffect } from 'react'
import SearchBar from './components/SearchBar'
import Visualizer from './components/Visualizer'
import RepoDetails from './components/RepoDetails'
import ColorLegend from './components/ColorLegend'
import LanguageFilter from './components/LanguageFilter'
import StatsDisplay from './components/StatsDisplay'
import ExportShare from './components/ExportShare'
import Pagination from './components/Pagination'
import Header from './components/Header'
import KeyboardHelpModal from './components/KeyboardHelpModal'
import FilterSetsManager from './components/FilterSetsManager'
import { ThemeProvider } from './contexts/ThemeContext'
import { fetchUserRepos, fetchRepoReadmeBatch } from './utils/githubApi'
import { calculatePositions } from './utils/positioning'
import './App.css'

const REPOS_PER_PAGE = 100
const MAX_REPOS = 500

function App() {
  const [repos, setRepos] = useState([])
  const [positionedRepos, setPositionedRepos] = useState([])
  const [selectedRepo, setSelectedRepo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [username, setUsername] = useState('')
  const [detectedLanguages, setDetectedLanguages] = useState([])
  const [filteredLanguage, setFilteredLanguage] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalRepos, setTotalRepos] = useState(0)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const userDataRef = useRef({}) // Store user data for pagination

  // Keyboard help modal trigger
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === '?' || e.key === '/') && !selectedRepo) {
        e.preventDefault()
        setShowHelpModal(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedRepo])

  const handleSearch = useCallback(async (searchUsername) => {
    setLoading(true)
    setError('')
    setUsername(searchUsername)
    setRepos([])
    setPositionedRepos([])
    setSelectedRepo(null)
    setCurrentPage(1)
    setFilteredLanguage(null)

    try {
      const { user, repos: fetchedRepos } = await fetchUserRepos(
        searchUsername,
        REPOS_PER_PAGE
      )

      if (fetchedRepos.length === 0) {
        setError('No public repositories found')
        return
      }

      // Store user data for pagination
      userDataRef.current = { username: searchUsername }

      // Fetch READMEs for first 20 repos
      const reposWithReadme = await fetchRepoReadmeBatch(
        searchUsername,
        fetchedRepos.slice(0, 20)
      )

      // Add READMEs to remaining repos
      const allRepos = [
        ...reposWithReadme,
        ...fetchedRepos.slice(20).map((r) => ({ ...r, readme: null }))
      ]

      // Calculate positions
      const positioned = calculatePositions(allRepos)

      // Extract unique languages
      const languages = [
        ...new Set(
          allRepos
            .map((r) => r.language)
            .filter((l) => l)
            .map((l) => l.toLowerCase())
        )
      ].sort()

      setRepos(allRepos)
      setPositionedRepos(positioned)
      setDetectedLanguages(languages)
      setTotalRepos(user.public_repos || fetchedRepos.length)
    } catch (err) {
      setError(err.message || 'Failed to fetch repositories')
      setRepos([])
      setPositionedRepos([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleLoadMore = useCallback(async () => {
    const nextPage = currentPage + 1
    const startIndex = currentPage * REPOS_PER_PAGE

    if (startIndex >= repos.length || nextPage > MAX_REPOS / REPOS_PER_PAGE) {
      return
    }

    setLoading(true)
    try {
      // Fetch next page from GitHub API
      const { repos: newRepos } = await fetchUserRepos(
        username,
        nextPage * REPOS_PER_PAGE
      )

      // Get only the new repos from this page
      const pageRepos = newRepos.slice(startIndex, startIndex + REPOS_PER_PAGE)

      // Fetch READMEs for new repos
      const reposWithReadme = await fetchRepoReadmeBatch(username, pageRepos)

      // Combine with existing repos
      const allRepos = [...repos, ...reposWithReadme]

      // Recalculate positions
      const positioned = calculatePositions(allRepos)

      setRepos(allRepos)
      setPositionedRepos(positioned)
      setCurrentPage(nextPage)
    } catch (err) {
      console.error('Error loading more repos:', err)
    } finally {
      setLoading(false)
    }
  }, [repos, username, currentPage])

  const handleRepoClick = useCallback((repoData) => {
    if (repoData && repoData.repo) {
      setSelectedRepo(repoData.repo)
    }
  }, [])

  const handleLanguageFilter = useCallback((language) => {
    setFilteredLanguage(language)
  }, [])

  /**
   * Handle loading a filter set
   * Applies saved filter combinations to current view
   */
  const handleLoadFilterSet = useCallback((filters) => {
    if (filters.languages && Array.isArray(filters.languages)) {
      // Handle language filter from set
      if (filters.languages.length > 0) {
        setFilteredLanguage(filters.languages[0])
      }
    }
    // TODO: Extend with framework, author type filters when available
  }, [])

  return (
    <ThemeProvider>
      <div className="app">
        <Header />
        <KeyboardHelpModal
          isOpen={showHelpModal}
          onClose={() => setShowHelpModal(false)}
        />
        <Visualizer
          repos={positionedRepos}
          onRepoClick={handleRepoClick}
          detectedLanguages={detectedLanguages}
        />
        <SearchBar onSearch={handleSearch} loading={loading} error={error} />
        <StatsDisplay
          loading={loading}
          error={error}
          repoCount={repos.length}
          username={username}
        />
        {repos.length > 0 && (
          <FilterSetsManager
            currentFilters={{ languages: filteredLanguage ? [filteredLanguage] : [] }}
            onLoadSet={handleLoadFilterSet}
          />
        )}
        {username && detectedLanguages.length > 0 && (
          <LanguageFilter
            languages={detectedLanguages}
            onLanguageChange={handleLanguageFilter}
          />
        )}
        {selectedRepo && (
          <RepoDetails repo={selectedRepo} onClose={() => setSelectedRepo(null)} />
        )}
        {repos.length > 0 && (
          <>
            <ExportShare
              repos={positionedRepos}
              username={username}
              filters={{ language: filteredLanguage }}
            />
            {totalRepos > REPOS_PER_PAGE && (
              <Pagination
                currentPage={currentPage}
                totalRepos={totalRepos}
                reposPerPage={REPOS_PER_PAGE}
                onLoadMore={handleLoadMore}
                isLoading={loading}
                maxRepos={MAX_REPOS}
              />
            )}
          </>
        )}
      </div>
    </ThemeProvider>
  )
}

export default App
