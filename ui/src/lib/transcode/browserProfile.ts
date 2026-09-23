// Probes which codecs this browser can decode, so the server can choose between direct play and
// transcoding per track (getTranscodeDecision).

interface CodecProbe {
  codec: string
  container: string
  mime: string[]
}

export const CODEC_PROBES: CodecProbe[] = [
  { codec: 'mp3', container: 'mp3', mime: ['audio/mpeg; codecs="mp3"'] },
  { codec: 'opus', container: 'ogg', mime: ['audio/ogg; codecs="opus"'] },
  { codec: 'vorbis', container: 'ogg', mime: ['audio/ogg; codecs="vorbis"'] },
  { codec: 'flac', container: 'flac', mime: ['audio/flac', 'audio/flac; codecs="flac"'] },
  { codec: 'wav', container: 'wav', mime: ['audio/wav; codecs="1"'] },
  { codec: 'alac', container: 'mp4', mime: ['audio/mp4; codecs="alac"'] },
  { codec: 'aac', container: 'mp4', mime: ['audio/mp4; codecs="mp4a.40.2"'] },
]

// Transcode targets in preference order, lossless first. MP3 is always offered as the fallback.
const TRANSCODE_CODECS = ['flac', 'opus', 'mp3']

// Safari claims Ogg support but fails on non-seekable transcoded streams, and FLAC transcoding
// fails in practice too, so it only gets MP3.
const SAFARI_TRANSCODE_CODECS = ['mp3']

export interface BrowserProfile {
  name: string
  platform: string
  directPlayProfiles: { containers: string[]; audioCodecs: string[]; protocols: string[] }[]
  transcodingProfiles: { container: string; audioCodec: string; protocol: string }[]
  codecProfiles: unknown[]
}

const canPlay = (audio: HTMLAudioElement, mimes: string[]) =>
  mimes.some((m) => {
    const result = audio.canPlayType(m)
    return result === 'probably' || result === 'maybe'
  })

const isSafari = () => {
  const ua = navigator.userAgent
  return ua.includes('Safari') && !ua.includes('Chrome') && !ua.includes('Chromium')
}

export function detectBrowserProfile(): BrowserProfile {
  const audio = new Audio()

  const directPlayProfiles = CODEC_PROBES.filter(({ mime }) => canPlay(audio, mime)).map(
    ({ codec, container }) => ({
      containers: [container],
      audioCodecs: [codec],
      protocols: ['http'],
    }),
  )

  const transcodingProfiles = (isSafari() ? SAFARI_TRANSCODE_CODECS : TRANSCODE_CODECS).flatMap(
    (codec) => {
      const probe = CODEC_PROBES.find((p) => p.codec === codec)
      if (!probe || !(canPlay(audio, probe.mime) || codec === 'mp3')) return []
      return [{ container: probe.container, audioCodec: codec, protocol: 'http' }]
    },
  )

  return {
    name: 'NavidromeUI',
    platform: navigator.userAgent,
    directPlayProfiles,
    transcodingProfiles,
    codecProfiles: [],
  }
}
