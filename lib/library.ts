import { getPassage, verses } from './kieu'

export type Library = { saved: number[]; progress: number; fontSize: number }
const validIds = new Set(verses.map(verse => verse.id))
const fontSizes = new Set([18, 22, 26, 30])

export function emptyLibrary(): Library {
  return { saved: [], progress: 1, fontSize: 22 }
}

export function parseLibrary(value: unknown): Library {
  if (!value || typeof value !== 'object') return emptyLibrary()
  const data = value as Partial<Library>
  return {
    saved: Array.isArray(data.saved)
      ? [...new Set(data.saved.filter(id => validIds.has(id)).map(id => getPassage(id)[0].id))]
      : [],
    progress: typeof data.progress === 'number' && validIds.has(data.progress) ? data.progress : 1,
    fontSize:
      typeof data.fontSize === 'number' && fontSizes.has(data.fontSize) ? data.fontSize : 22,
  }
}

export function canonicalSavedId(id: number): number | null {
  return validIds.has(id) ? getPassage(id)[0].id : null
}

export function changeLibraryProgress(library: Library, progress: number): Library {
  return validIds.has(progress) && progress !== library.progress
    ? { ...library, progress }
    : library
}

export function changeLibraryFontSize(library: Library, fontSize: number): Library {
  return fontSizes.has(fontSize) && fontSize !== library.fontSize
    ? { ...library, fontSize }
    : library
}
