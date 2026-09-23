// Wire types for the native API (/api), mirroring the JSON tags in model/*.go

export interface Annotations {
  playCount?: number
  playDate?: string
  rating?: number
  ratedAt?: string
  starred?: boolean
  starredAt?: string
  averageRating?: number
}

/** Per-entity artwork state (model.ItemImage) */
export interface ItemImage {
  imageHash?: string
  imageAbsent?: boolean
  thumbHash?: string
  /** "#rrggbb", the flat colour the artwork-tinted backgrounds use */
  dominantColor?: string
  imageWidth?: number
  imageHeight?: number
}

export interface Genre {
  id?: string
  name: string
}

export type Tags = Record<string, string[]>

export type Role =
  | 'albumartist'
  | 'artist'
  | 'composer'
  | 'conductor'
  | 'lyricist'
  | 'arranger'
  | 'producer'
  | 'director'
  | 'engineer'
  | 'mixer'
  | 'remixer'
  | 'djmixer'
  | 'performer'
  | 'maincredit'

export interface Participant {
  id: string
  name: string
  subRole?: string
}

export type Participants = Partial<Record<Role, Participant[]>>

export interface Album extends Annotations, ItemImage {
  id: string
  libraryId: number
  libraryPath?: string
  libraryName?: string
  name: string
  albumArtistId: string
  albumArtist: string
  maxYear: number
  minYear: number
  date?: string
  maxOriginalYear: number
  minOriginalYear: number
  originalDate?: string
  releaseDate?: string
  compilation: boolean
  comment?: string
  songCount: number
  duration: number
  size: number
  discs?: Record<string, string>
  sortAlbumName?: string
  catalogNum?: string
  mbzAlbumId?: string
  mbzAlbumArtistId?: string
  mbzAlbumType?: string
  mbzAlbumComment?: string
  mbzReleaseGroupId?: string
  explicitStatus: string
  rgAlbumGain?: number
  rgAlbumPeak?: number
  description?: string
  smallImageUrl?: string
  mediumImageUrl?: string
  largeImageUrl?: string
  externalUrl?: string
  genre: string
  genres?: Genre[]
  tags?: Tags
  participants?: Participants
  missing: boolean
  importedAt: string
  createdAt: string
  updatedAt: string
}

export interface Song extends Annotations, ItemImage {
  id: string
  libraryId: number
  libraryPath?: string
  libraryName?: string
  folderId: string
  path: string
  title: string
  album: string
  artistId: string
  artist: string
  albumArtistId: string
  albumArtist: string
  albumId: string
  hasCoverArt: boolean
  trackNumber: number
  discNumber: number
  discSubtitle?: string
  year: number
  date?: string
  originalYear: number
  originalDate?: string
  releaseYear: number
  releaseDate?: string
  size: number
  suffix: string
  duration: number
  bitRate: number
  sampleRate: number
  bitDepth?: number
  channels: number
  codec: string
  genre: string
  genres?: Genre[]
  compilation: boolean
  comment?: string
  /** JSON-encoded structured lyrics */
  lyrics: string
  bpm?: number
  explicitStatus: string
  catalogNum?: string
  mbzRecordingID?: string
  mbzReleaseTrackId?: string
  mbzAlbumId?: string
  mbzReleaseGroupId?: string
  mbzArtistId?: string
  mbzAlbumArtistId?: string
  mbzAlbumType?: string
  mbzAlbumComment?: string
  rgAlbumGain?: number
  rgAlbumPeak?: number
  rgTrackGain?: number
  rgTrackPeak?: number
  tags?: Tags
  participants?: Participants
  missing: boolean
  birthTime: string
  createdAt: string
  updatedAt: string
}

/** A playlist entry: the song plus its position in the playlist */
export interface PlaylistTrack extends Song {
  /** Row id within the playlist (position), not the media file id */
  id: string
  mediaFileId: string
  playlistId: string
}

export interface ArtistStats {
  songCount: number
  albumCount: number
  size: number
}

export interface Artist extends Annotations, ItemImage {
  id: string
  name: string
  sortArtistName?: string
  mbzArtistId?: string
  stats?: Partial<Record<Role, ArtistStats>>
  size?: number
  albumCount?: number
  songCount?: number
  biography?: string
  smallImageUrl?: string
  mediumImageUrl?: string
  largeImageUrl?: string
  externalUrl?: string
  missing: boolean
  uploadedImage?: string
  createdAt?: string
  updatedAt?: string
}

export interface Playlist extends Annotations, ItemImage {
  id: string
  name: string
  comment: string
  duration: number
  size: number
  songCount: number
  ownerName: string
  ownerId: string
  public: boolean
  path: string
  sync: boolean
  uploadedImage: string
  externalImageUrl?: string
  createdAt: string
  updatedAt: string
  rules?: unknown
  evaluatedAt?: string
}

export interface Radio extends ItemImage {
  id: string
  streamUrl: string
  name: string
  homePageUrl: string
  uploadedImage?: string
  createdAt: string
  updatedAt: string
}

export interface Share {
  id: string
  userId?: string
  username?: string
  description?: string
  downloadable: boolean
  expiresAt?: string
  lastVisitedAt?: string
  resourceIds?: string
  resourceType?: string
  contents?: string
  format?: string
  maxBitRate?: number
  visitCount?: number
  createdAt: string
  updatedAt: string
  tracks?: Song[]
  albums?: Album[]
}

export interface Library {
  id: number
  name: string
  path: string
  remotePath: string
  lastScanAt: string
  lastScanStartedAt: string
  fullScanInProgress: boolean
  updatedAt: string
  createdAt: string
  totalSongs: number
  totalAlbums: number
  totalArtists: number
  totalFolders: number
  totalFiles: number
  totalMissingFiles: number
  totalSize: number
  totalDuration: number
  defaultNewUsers: boolean
}

export interface User {
  id: string
  userName: string
  name: string
  email: string
  isAdmin: boolean
  lastLoginAt?: string
  lastAccessAt?: string
  createdAt: string
  updatedAt: string
  scrobbleFilter?: string
  libraries?: Library[]
  password?: string
  currentPassword?: string
}

export interface Player {
  id: string
  name: string
  userAgent: string
  userId: string
  userName: string
  client: string
  ip: string
  lastSeen: string
  transcodingId: string
  maxBitRate: number
  reportRealPath: boolean
  scrobbleEnabled: boolean
}

export interface Transcoding {
  id: string
  name: string
  targetFormat: string
  command: string
  defaultBitRate: number
}

export interface Tag {
  id: string
  tagName: string
  tagValue: string
  albumCount?: number
  songCount?: number
}

export interface Translation {
  id: string
  name: string
  /** JSON-encoded language file */
  data: string
}

export type MissingFile = Song

/** Everything the generic REST resource client can address */
export interface ResourceMap {
  album: Album
  song: Song
  artist: Artist
  playlist: Playlist
  playlistTrack: PlaylistTrack
  radio: Radio
  share: Share
  library: Library
  user: User
  player: Player
  transcoding: Transcoding
  tag: Tag
  genre: Genre & { id: string }
  translation: Translation
  missing: MissingFile
  plugin: Plugin
}

export type ResourceName = keyof ResourceMap

export interface Plugin {
  id: string
  name?: string
  path?: string
  manifest: string
  config?: string
  users?: string
  allUsers?: boolean
  libraries?: string
  allLibraries?: boolean
  allowWriteAccess?: boolean
  enabled: boolean
  lastError?: string
  sha256?: string
  createdAt: string
  updatedAt: string
}
