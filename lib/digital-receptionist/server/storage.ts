import path from 'node:path'

export function storageDir() {
  const configured = process.env.STORAGE_DIR ?? './storage'
  return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured)
}

export function absoluteStoragePath(relativePath: string) {
  return path.join(storageDir(), relativePath)
}
