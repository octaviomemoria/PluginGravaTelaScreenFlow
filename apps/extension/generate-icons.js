const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

function makePng(size, pixelFn) {
  const rows = []
  for (let y = 0; y < size; y++) {
    const row = Buffer.allocUnsafe(1 + size * 4)
    row[0] = 0 // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelFn(x, y, size)
      const off = 1 + x * 4
      row[off] = r; row[off + 1] = g; row[off + 2] = b; row[off + 3] = a
    }
    rows.push(row)
  }
  const raw = Buffer.concat(rows)
  const compressed = zlib.deflateSync(raw, { level: 9 })

  const crcTable = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crcTable[i] = c
  }
  function crc32(buf) {
    let crc = 0xffffffff
    for (const b of buf) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8)
    return (crc ^ 0xffffffff) >>> 0
  }
  function chunk(type, data) {
    const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length)
    const t = Buffer.from(type, 'ascii')
    const c = Buffer.allocUnsafe(4); c.writeUInt32BE(crc32(Buffer.concat([t, data])))
    return Buffer.concat([len, t, data, c])
  }

  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function makeIcon(size) {
  const radius = Math.round(size * 0.22)
  // bg: #22C55E
  const bgR = 0x22, bgG = 0xC5, bgB = 0x5E

  // Render "S" via bezier-free approach: define the shape as pixel coverage
  // S occupies the center 60% of the icon
  const s = Math.round(size * 0.60)  // letter bounding box size
  const ox = Math.round((size - s) / 2)  // offset x
  const oy = Math.round((size - s) / 2)  // offset y
  const t = Math.max(1, Math.round(s * 0.18))  // stroke thickness

  function inRoundedRect(x, y) {
    if (x < radius && y < radius) return Math.hypot(x - radius, y - radius) <= radius
    if (x >= size - radius && y < radius) return Math.hypot(x - (size - radius - 1), y - radius) <= radius
    if (x < radius && y >= size - radius) return Math.hypot(x - radius, y - (size - radius - 1)) <= radius
    if (x >= size - radius && y >= size - radius) return Math.hypot(x - (size - radius - 1), y - (size - radius - 1)) <= radius
    return true
  }

  // Draw "S" as three horizontal bars + two vertical strokes
  // The "S" shape:
  //   top bar (top)
  //   left vertical (top half)
  //   middle bar (center)
  //   right vertical (bottom half)
  //   bottom bar (bottom)
  function isS(px, py) {
    const x = px - ox
    const y = py - oy
    if (x < 0 || x >= s || y < 0 || y >= s) return false

    const topBarY0 = 0, topBarY1 = t
    const midBarY0 = Math.round(s / 2) - Math.ceil(t / 2), midBarY1 = Math.round(s / 2) + Math.floor(t / 2)
    const botBarY0 = s - t, botBarY1 = s
    const innerX0 = t, innerX1 = s - t

    // top bar (full width)
    if (y >= topBarY0 && y < topBarY1) return true
    // bottom bar (full width)
    if (y >= botBarY0 && y < botBarY1) return true
    // middle bar (inner width)
    if (y >= midBarY0 && y < midBarY1 && x >= innerX0 && x < innerX1) return true
    // left vertical: top half (from top bar to middle bar)
    if (x < t && y >= topBarY1 && y < midBarY0) return true
    // right vertical: bottom half (from middle bar to bottom bar)
    if (x >= s - t && y >= midBarY1 && y < botBarY0) return true

    return false
  }

  return makePng(size, (x, y) => {
    if (!inRoundedRect(x, y)) return [0, 0, 0, 0]
    if (isS(x, y)) return [255, 255, 255, 255]
    return [bgR, bgG, bgB, 255]
  })
}

const dir = path.join(__dirname, 'icons')
fs.writeFileSync(path.join(dir, 'icon16.png'), makeIcon(16))
fs.writeFileSync(path.join(dir, 'icon48.png'), makeIcon(48))
fs.writeFileSync(path.join(dir, 'icon128.png'), makeIcon(128))
console.log('Icons generated: icon16.png, icon48.png, icon128.png')
