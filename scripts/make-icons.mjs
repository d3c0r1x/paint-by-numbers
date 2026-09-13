// Generates public/icon-192.png and public/icon-512.png (SPEC Task 18).
// Pure Node (zlib + hand-rolled PNG chunks) so no native deps are needed.
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function crc32(buf) {
  let table = crc32.t
  if (!table) {
    table = crc32.t = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c
    }
  }
  let crc = -1
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff]
  return (crc ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function encodePng(width, height, rgba) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // no filter
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4)
  const put = (x, y, r, g, b, a = 255) => {
    const o = (y * size + x) * 4
    rgba[o] = r
    rgba[o + 1] = g
    rgba[o + 2] = b
    rgba[o + 3] = a
  }
  const radius = size * 0.22
  const inRoundedSquare = (x, y) => {
    const cx = Math.min(Math.max(x, radius), size - radius)
    const cy = Math.min(Math.max(y, radius), size - radius)
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2
  }
  const circles = [
    { cx: 0.31, cy: 0.31, r: 0.125, c: [225, 29, 72] },
    { cx: 0.69, cy: 0.31, r: 0.125, c: [37, 99, 235] },
    { cx: 0.31, cy: 0.69, r: 0.125, c: [245, 158, 11] },
    { cx: 0.69, cy: 0.69, r: 0.125, c: [22, 163, 74] },
  ]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!inRoundedSquare(x, y)) {
        put(x, y, 0, 0, 0, 0)
        continue
      }
      put(x, y, 255, 255, 255)
      const nx = x / size
      const ny = y / size
      for (const { cx, cy, r, c } of circles) {
        const dx = nx - cx
        const dy = ny - cy
        if (dx * dx + dy * dy <= r * r) {
          put(x, y, c[0], c[1], c[2])
          break
        }
      }
    }
  }
  return rgba
}

for (const size of [192, 512]) {
  writeFileSync(join(root, 'public', `icon-${size}.png`), encodePng(size, size, drawIcon(size)))
  console.log(`icon-${size}.png written`)
}
