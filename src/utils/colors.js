// Language to color mapping
const languageColors = {
  javascript: { color: 0xf1e05a, name: 'JavaScript' },
  python: { color: 0x3572a5, name: 'Python' },
  typescript: { color: 0x2b7489, name: 'TypeScript' },
  java: { color: 0xb07219, name: 'Java' },
  cpp: { color: 0xf34b7d, name: 'C++' },
  csharp: { color: 0x239120, name: 'C#' },
  go: { color: 0x00add8, name: 'Go' },
  rust: { color: 0xce422b, name: 'Rust' },
  swift: { color: 0xfa7343, name: 'Swift' },
  kotlin: { color: 0x7f52ff, name: 'Kotlin' },
  ruby: { color: 0xcc342d, name: 'Ruby' },
  php: { color: 0x777bb4, name: 'PHP' },
  c: { color: 0xa2b0d8, name: 'C' },
  groovy: { color: 0x4298b8, name: 'Groovy' },
  scala: { color: 0xdc322f, name: 'Scala' },
  html: { color: 0xe34c26, name: 'HTML' },
  css: { color: 0x563d7c, name: 'CSS' }
}

export function getLanguageInfo(language) {
  if (!language) {
    return { color: 0x888888, name: 'Other' }
  }

  const key = language.toLowerCase().replace(/\s+/g, '')
  return languageColors[key] || { color: 0x888888, name: 'Other' }
}

export function getAllLanguageColors() {
  return languageColors
}
