function stripOneId3AtStart(buf: Buffer): Buffer | null {
  if (buf.length < 10) {
    return null;
  }
  if (buf[0] !== 0x49 || buf[1] !== 0x44 || buf[2] !== 0x33) {
    return null;
  }
  const flags = buf[5] ?? 0;
  const size =
    ((buf[6] ?? 0) << 21) |
    ((buf[7] ?? 0) << 14) |
    ((buf[8] ?? 0) << 7) |
    (buf[9] ?? 0);
  const hasFooter = (flags & 0x10) !== 0;
  const headerTotal = 10 + size + (hasFooter ? 10 : 0);
  if (headerTotal >= buf.length) {
    return null;
  }
  return buf.subarray(headerTotal);
}

export function stripId3v2(buf: Buffer): Buffer {
  let current = buf;
  while (true) {
    const stripped = stripOneId3AtStart(current);
    if (!stripped) {
      return current;
    }
    current = stripped;
  }
}

function findFirstMpegSync(buf: Buffer, start = 0): number {
  for (let i = start; i < buf.length - 1; i++) {
    if (buf[i] === 0xff && (buf[i + 1] ?? 0) >= 0xe0) {
      return i;
    }
  }
  return -1;
}

export function toMpegFrames(buf: Buffer): Buffer {
  const stripped = stripId3v2(buf);
  const syncAt = findFirstMpegSync(stripped);
  if (syncAt <= 0) {
    return stripped;
  }
  return stripped.subarray(syncAt);
}

export function concatMp3(intro: Buffer, voice: Buffer, outro: Buffer): Buffer {
  return Buffer.concat([intro, toMpegFrames(voice), toMpegFrames(outro)]);
}

export function countId3v2(buf: Buffer): number {
  let count = 0;
  const id3 = Buffer.from("ID3");
  let offset = 0;
  while (offset + 3 <= buf.length) {
    const idx = buf.indexOf(id3, offset);
    if (idx === -1) {
      break;
    }
    count += 1;
    offset = idx + 3;
  }
  return count;
}
