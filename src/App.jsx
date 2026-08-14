/**
 * App.jsx - Main Application Component
 * GitHub 3D Repository Visualizer — v4
 *
 * v4 Features integrated:
 *  1. Custom Filter Sets  - Save/load filter combinations (FilterSetsManager)
 *  2. Data Export Formats - JSON, CSV, snapshots (DataExportPanel)
 *  3. Advanced Heatmaps   - Activity/contribution heatmaps (AdvancedHeatmaps)
 *  4. User Preferences    - Persistent settings, themes, defaults (UserPreferencesPanel)
 *  5. Collaboration       - Share links, snapshots, annotations (CollaborationPanel)
 */

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
import HudLayout from './components/HudLayout'
import KeyboardHelpModal from './components/KeyboardHelpModal'
import FilterSetsManager from './components/FilterSetsManager'
import DataExportPanel from './components/DataExportPanel'
import AdvancedHeatmaps from './components/AdvancedHeatmaps'
import UserPreferencesPanel from './components/UserPreferencesPanel'
import CollaborationPanel from './components/CollaborationPanel'
import { userPreferences } from './services/userPreferences'
import { collaborationService } from './services/collaborationService'
import { fetchUserRepos, fetchRepoReadmeBatch } from './utils/githubApi'
import { calculatePositions } from './utils/positioning'
import './styles/signal.css'
import './App.css'

const REPOS_PER_PAGE = 100
const MAX_REPOS = 500

/**
 * Main App component.
 * Owns global state: repos, filters, preferences, selected repo.
 */
function App() {
  // ─── Core state ─────────────────────────────────────────────────────────────
  const [repos, setRepos]                         = useState([])
  const [positionedRepos, setPositionedRepos]     = useState([])
  const [selectedRepo, setSelectedRepo]           = useState(null)
  const [loading, setLoading]                     = useState(false)
  const [loadingPhase, setLoadingPhase]           = useState('')
  const [error, setError]                         = useState('')
  const [username, setUsername]                   = useState('')
  const [detectedLanguages, setDetectedLanguages] = useState([])
  const [filteredLanguage, setFilteredLanguage]   = useState(null)
  const [currentPage, setCurrentPage]             = useState(1)
  const [totalRepos, setTotalRepos]               = useState(0)
  const [showHelpModal, setShowHelpModal]         = useState(false)

  /** Measured, never estimated — feeds the HUD readout and the honesty rules. */
  const [starCount, setStarCount] = useState(null)
  const [renderMs, setRenderMs]   = useState(null)

  /** MOTION.md: the demo galaxy eases from 50% to 25% on the first keystroke. */
  const [isTyping, setIsTyping] = useState(false)

  /** Fired when the entrance sequence finishes, so the readout can print a
      measured settle time rather than an estimate. */
  const handleSettled = useCallback(() => {}, [])

  /** Store user data for pagination */
  const userDataRef = useRef({})

  // ─── User preferences (v4 Feature 4) ─────────────────────────────────────
  const [prefs, setPrefs] = useState(() => userPreferences.loadAll())

  // Extract commonly used preference values
  const { minStars, excludeArchived, excludeForks } = prefs.filters
  const { colorScheme } = prefs.visualization

  /**
   * Called by UserPreferencesPanel when settings change.
   * @param {Object} updatedPrefs - Full preferences object
   */
  const handlePreferencesChange = useCallback((updatedPrefs) => {
    setPrefs(updatedPrefs)
  }, [])

  // ─── Inbound share link detection (v4 Feature 5) ─────────────────────────

  useEffect(() => {
    /**
     * On mount, check if the URL contains a ?viz= share param.
     * If found, auto-populate the UI with the shared state.
     */
    const sharedState = collaborationService.parseShareUrl()
    if (sharedState?.username) {
      // Silently pre-fill username so user can trigger the search
      setUsername(sharedState.username)
      if (sharedState.language) setFilteredLanguage(sharedState.language)
    }
  }, []) // run once on mount

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────

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

  // ─── Search / fetch ───────────────────────────────────────────────────────

  /**
   * Fetch repositories for a given GitHub username.
   * Applies stored preference defaults (minStars, excludeArchived, etc.).
   *
   * @param {string} searchUsername - GitHub username to search
   */
  const handleSearch = useCallback(async (searchUsername) => {
    const startedAt = performance.now()
    setLoading(true)
    setLoadingPhase(`fetching @${searchUsername}`)
    setError('')
    setStarCount(null)
    setRenderMs(null)
    setUsername(searchUsername)
    setRepos([])
    setPositionedRepos([])
    setSelectedRepo(null)
    setCurrentPage(1)
    setFilteredLanguage(prefs.filters.defaultLanguage || null)

    try {
      const { user, repos: fetchedRepos } = await fetchUserRepos(
        searchUsername,
        REPOS_PER_PAGE
      )

      if (fetchedRepos.length === 0) {
        setError('no public repositories')
        return
      }

      userDataRef.current = { username: searchUsername }

      // Apply preference filters
      let filtered = fetchedRepos
      if (prefs.filters.excludeArchived) {
        filtered = filtered.filter(r => !r.archived)
      }
      if (prefs.filters.excludeForks) {
        filtered = filtered.filter(r => !r.fork)
      }
      if (prefs.filters.minStars > 0) {
        filtered = filtered.filter(r => (r.stargazers_count || 0) >= prefs.filters.minStars)
      }
      // Cap by maxRepos preference
      const maxRepos = prefs.performance.maxRepos || MAX_REPOS
      filtered = filtered.slice(0, maxRepos)

      // Fetch READMEs for first 20 repos
      setLoadingPhase(`reading ${Math.min(filtered.length, 20)} readmes`)
      const reposWithReadme = await fetchRepoReadmeBatch(
        searchUsername,
        filtered.slice(0, 20)
      )

      const allRepos = [
        ...reposWithReadme,
        ...filtered.slice(20).map((r) => ({ ...r, readme: null }))
      ]

      setLoadingPhase('building scene')
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
      setStarCount(
        allRepos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0)
      )
      setRenderMs(performance.now() - startedAt)
    } catch (err) {
      setError(err.message || 'failed to fetch repositories')
      setRepos([])
      setPositionedRepos([])
    } finally {
      setLoading(false)
      setLoadingPhase('')
    }
  }, [prefs])

  /**
   * Load next page of repositories and append to the scene.
   */
  const handleLoadMore = useCallback(async () => {
    const nextPage = currentPage + 1
    const startIndex = currentPage * REPOS_PER_PAGE

    if (startIndex >= repos.length || nextPage > MAX_REPOS / REPOS_PER_PAGE) {
      return
    }

    setLoading(true)
    try {
      const { repos: newRepos } = await fetchUserRepos(
        username,
        nextPage * REPOS_PER_PAGE
      )

      const pageRepos = newRepos.slice(startIndex, startIndex + REPOS_PER_PAGE)
      const reposWithReadme = await fetchRepoReadmeBatch(username, pageRepos)
      const allRepos = [...repos, ...reposWithReadme]
      const positioned = calculatePositions(allRepos)

      setRepos(allRepos)
      setPositionedRepos(positioned)
      setCurrentPage(nextPage)
    } catch (err) {
      // Silently fail pagination errors — not critical
    } finally {
      setLoading(false)
    }
  }, [repos, username, currentPage])

  // ─── Event handlers ───────────────────────────────────────────────────────

  const handleRepoClick = useCallback((repoData) => {
    if (repoData && repoData.repo) {
      setSelectedRepo(repoData.repo)
    }
  }, [])

  const handleLanguageFilter = useCallback((language) => {
    setFilteredLanguage(language)
  }, [])

  /**
   * Handle loading a saved filter set (v4 Feature 1).
   * Applies stored filter combinations to the current view.
   *
   * @param {Object} filters - Filter set object from FilterSetsManager
   */
  const handleLoadFilterSet = useCallback((filters) => {
    if (filters.languages && Array.isArray(filters.languages)) {
      if (filters.languages.length > 0) {
        setFilteredLanguage(filters.languages[0])
      }
    }
    if (typeof filters.minStars === 'number') {
      userPreferences.set('filters', 'minStars', filters.minStars)
      setPrefs(prev => ({
        ...prev,
        filters: { ...prev.filters, minStars: filters.minStars }
      }))
    }
  }, [])

  /**
   * Handle loading a collaboration snapshot (v4 Feature 5).
   * Restores username + filter state from a saved snapshot.
   *
   * @param {Object} state - ShareableState from a snapshot
   */
  const handleLoadSnapshot = useCallback((state) => {
    if (state.language !== undefined) setFilteredLanguage(state.language)
    if (state.username) {
      // Trigger a new search for the snapshot's username
      handleSearch(state.username)
    }
  }, [handleSearch])

  // ─── Filtered repos for display ────────────────────────────────────────────

  /**
   * Count of repos matching the active language filter.
   *
   * NOTE: this is NOT what the scene renders. The scene receives every
   * positioned repo plus the active filter, and dims non-matching spheres in
   * the render loop. Filtering the prop instead would tear the scene down and
   * replay the whole entrance sequence on every filter change.
   */
  const displayedRepos = filteredLanguage
    ? positionedRepos.filter(
        (r) => r.language && r.language.toLowerCase() === filteredLanguage.toLowerCase()
      )
    : positionedRepos

  // ─── Render ───────────────────────────────────────────────────────────────

  const hasScene = repos.length > 0

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">
        skip to main content
      </a>

      {/* MOTION.md 0-400ms: a 1px grid plane fades to 8% opacity. Structure
          under the scene, not decoration. */}
      <div className="scene-grid" data-visible="true" aria-hidden="true" />

      {/* ── Scene layer (z-index 0) ────────────────────────────────────────
          The canvas MUST stay below the HUD. It previously mounted as
          position:fixed with no z-index and painted over the header, which
          is what made this app render as a blank page. */}
      <div id="main-content">
        <Visualizer
          repos={positionedRepos}
          filteredLanguage={filteredLanguage}
          onRepoClick={handleRepoClick}
          isTyping={isTyping}
          onSettled={handleSettled}
        />
      </div>

      {/* ── HUD layer (z-index 10+) ───────────────────────────────────────
          HudLayout owns every fixed position. No component below it sets
          `position: fixed` for itself — see src/styles/HudLayout.css. */}
      <HudLayout
        compact={hasScene}
        search={
          <SearchBar
            onSearch={handleSearch}
            loading={loading}
            loadingPhase={loadingPhase}
            error={error}
            compact={hasScene}
            onFirstKeystroke={() => setIsTyping(true)}
          />
        }
        railLeft={
          <>
            <StatsDisplay
              loading={loading}
              error={error}
              repoCount={repos.length}
              username={username}
              starCount={starCount}
              renderMs={renderMs}
            />

            <UserPreferencesPanel onPreferencesChange={handlePreferencesChange} />

            {hasScene && (
              <>
                <FilterSetsManager
                  currentFilters={{
                    languages: filteredLanguage ? [filteredLanguage] : []
                  }}
                  onLoadSet={handleLoadFilterSet}
                />

                <DataExportPanel repos={repos} username={username} />

                <AdvancedHeatmaps repos={repos} />

                {/* Share & Annotate (local) — localStorage + URL params,
                    no server, no multi-user sync. */}
                <CollaborationPanel
                  username={username}
                  currentLanguage={filteredLanguage}
                  currentMinStars={prefs.filters.minStars}
                  currentColorScheme={colorScheme}
                  selectedRepo={selectedRepo}
                  onLoadSnapshot={handleLoadSnapshot}
                />
              </>
            )}
          </>
        }
        railRight={
          hasScene ? (
            <>
              {detectedLanguages.length > 0 && (
                <LanguageFilter
                  languages={detectedLanguages}
                  onLanguageChange={handleLanguageFilter}
                />
              )}
              <ColorLegend languages={detectedLanguages} />
            </>
          ) : null
        }
        dockBottom={
          hasScene ? (
            <>
              {totalRepos > REPOS_PER_PAGE ? (
                <Pagination
                  currentPage={currentPage}
                  totalRepos={totalRepos}
                  reposPerPage={REPOS_PER_PAGE}
                  onLoadMore={handleLoadMore}
                  isLoading={loading}
                  maxRepos={MAX_REPOS}
                />
              ) : (
                <span />
              )}

              <ExportShare
                repos={positionedRepos}
                username={username}
                filters={{ language: filteredLanguage }}
              />
            </>
          ) : null
        }
        drawer={
          selectedRepo && (
            <RepoDetails repo={selectedRepo} onClose={() => setSelectedRepo(null)} />
          )
        }
      >
        <Header
          status={loading ? 'busy' : hasScene ? 'live' : 'idle'}
          repoCount={repos.length}
          onHelp={() => setShowHelpModal(true)}
        />

        <KeyboardHelpModal
          isOpen={showHelpModal}
          onClose={() => setShowHelpModal(false)}
        />

        {/* Screen-reader announcements */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {loading && loadingPhase}
          {!loading && hasScene && `Loaded ${repos.length} repositories for ${username}`}
        </div>
      </HudLayout>
    </div>
  )
}

export default App
