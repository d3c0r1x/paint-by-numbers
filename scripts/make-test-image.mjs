// Generates a synthetic "photo" (sky/sun/house/grass) for GUI smoke tests.
// Pure Node PNG encoder (same approach as make-icons.mjs). Output goes to
// the OS temp dir: node scripts/make-test-image.mjs [out.png]
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const W = 480
const H = 480
const rgba = Buffer.alloc(W * H * 4)
const put = (x, y, c) => {
  const o = (y * W + x) * 4
  rgba[o] = c[0]; rgba[o + 1] = c[1]; rgba[o + 2] = c[2]; rgba[o + 3] = 255
}
const SKY = [110, 160, 235]
const SUN = [245, 200, 60]
const WALL = [200, 90, 80]
const ROOF = [110, 60, 50]
const GRASS = [100, 165, 90]

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    let c = SKY
    // sun
    if ((x - 380) ** 2 + (y - 80) ** 2 <= 45 ** 2) c = SUN
    // grass
    if (y >= 330) c = GRASS
    // house walls
    if (x >= 120 && x <= 300 && y >= 190 && y <= 330) c = WALL
    // roof (triangle)
    if (y >= 130 && y < 190 && Math.abs(x - 210) <= (190 - y) * (100 / 60)) c = ROOF
    put(x, y, c)
  }
}

const out = process.argv[2] ?? join(tmpdir(), 'pbn-test-image.png')
writeFileSync(out, encodePng(W, H, rgba))
console.log(out)
