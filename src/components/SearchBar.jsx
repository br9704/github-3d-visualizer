import { useState } from 'react'

export default function SearchBar({ onSearch, loading, error }) {
  const [username, setUsername] = useState('')
  const [localError, setLocalError] = useState('')

  const handleSearch = async () => {
    setLocalError('')
    if (!username.trim()) {
      setLocalError('Please enter a GitHub username')
      return
    }
    onSearch(username)
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.9)',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #7c3aed',
        textAlign: 'center',
        minWidth: '400px',
        maxWidth: '600px'
      }}
    >
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        placeholder="Enter GitHub username..."
        disabled={loading}
        style={{
          padding: '10px 15px',
          fontSize: '14px',
          marginRight: '10px',
          borderRadius: '4px',
          border: '1px solid #7c3aed',
          background: '#111',
          color: '#fff',
          width: '300px'
        }}
      />
      <button
        onClick={handleSearch}
        disabled={loading}
        style={{
          padding: '10px 20px',
          fontSize: '14px',
          background: loading ? '#555' : '#7c3aed',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: 'bold'
        }}
      >
        {loading ? 'Searching...' : 'Visualize'}
      </button>
      {(error || localError) && (
        <p style={{ color: '#ff6b6b', marginTop: '10px', margin: '10px 0 0 0' }}>
          ❌ {error || localError}
        </p>
      )}
    </div>
  )
}
