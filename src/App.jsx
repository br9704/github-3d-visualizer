import { useState, useCallback } from 'react'
import SearchBar from './components/SearchBar'
import Visualizer from './components/Visualizer'
import RepoDetails from './components/RepoDetails'
import ColorLegend from './components/ColorLegend'
import StatsDisplay from './components/StatsDisplay'
import { fetchUserRepos, fetchRepoReadmeBatch } from './utils/githubApi'
import { calculatePositions } from './utils/positioning'
import './App.css'

function App() {
  const [repos, setRepos] = useState([])
  const [positionedRepos, setPositionedRepos] = useState([])
  const [selectedRepo, setSelectedRepo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [username, setUsername] = useState('')
  const [detectedLanguages, setDetectedLanguages] = useState([])

  const handleSearch = useCallback(async (searchUsername) => {
    setLoading(true)
    setError('')
    setUsername(searchUsername)
    setRepos([])
    setPositionedRepos([])
    setSelectedRepo(null)

    try {
      const { user, repos: fetchedRepos } = await fetchUserRepos(
        searchUsername,
        100
      )

      if (fetchedRepos.length === 0) {
        setError('No public repositories found')
        return
      }

      // Fetch READMEs for first 20 repos
      const reposWithReadme = await fetchRepoReadmeBatch(
        searchUsername,
        fetchedRepos.slice(0, 20)
      )

      // Add READMEs to remaining repos (without fetching)
      const allRepos = [
        ...reposWithReadme,
        ...fetchedRepos.slice(20).map((r) => ({ ...r, readme: null }))
      ]

      // Calculate positions
      const positioned = calculatePositions(allRepos)

      // Extract unique languages from repos
      const languages = [
        ...new Set(
          allRepos
            .map((r) => r.language)
            .filter((l) => l)
            .map((l) => l.toLowerCase())
        )
      ]

      setRepos(allRepos)
      setPositionedRepos(positioned)
      setDetectedLanguages(languages)
    } catch (err) {
      setError(err.message || 'Failed to fetch repositories')
      setRepos([])
      setPositionedRepos([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleRepoClick = useCallback((repoData) => {
    if (repoData && repoData.repo) {
      setSelectedRepo(repoData.repo)
    }
  }, [])

  return (
    <div className="app">
      <Visualizer repos={positionedRepos} onRepoClick={handleRepoClick} />
      <SearchBar onSearch={handleSearch} loading={loading} error={error} />
      <StatsDisplay
        loading={loading}
        error={error}
        repoCount={repos.length}
        username={username}
      />
      {username && <ColorLegend languages={detectedLanguages} />}
      {selectedRepo && (
        <RepoDetails repo={selectedRepo} onClose={() => setSelectedRepo(null)} />
      )}
    </div>
  )
}

export default App
