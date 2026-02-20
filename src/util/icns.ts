/** decode base64 data URL to Uint8Array */
const dataUrlToBytes = (dataUrl: string): Uint8Array => {
  const base64 = dataUrl.split(",")[1];
  if (!base64) throw new Error("Invalid data URL");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

/** ICNS type codes for PNG (size in pixels) */
const SIZE_TO_ICNS_TYPE: Record<number, string> = {
  16: "icp4",
  32: "icp5",
  48: "icp6",
  64: "ic12",
  96: "ic07",
  128: "ic07",
  256: "ic08",
  512: "ic09",
  1024: "ic10",
};

/** create macOS ICNS file from PNG data URLs */
export const createIcnsFromPngs = (
  pngDataUrls: Array<{ dataUrl: string; size: number }>,
): Uint8Array => {
  const entries: { type: string; data: Uint8Array }[] = [];

  for (const p of pngDataUrls) {
    const type = SIZE_TO_ICNS_TYPE[p.size] ?? "ic07"; // fallback for unmapped sizes
    entries.push({ type, data: dataUrlToBytes(p.dataUrl) });
  }

  let dataSize = 0;
  for (const e of entries) {
    dataSize += 8 + e.data.length; // type(4) + length(4) + data
  }

  const headerSize = 8;
  const totalSize = headerSize + dataSize;

  const result = new Uint8Array(totalSize);
  const view = new DataView(result.buffer);

  // Header: "icns" + file size (big endian)
  result.set([0x69, 0x63, 0x6e, 0x73], 0);
  view.setUint32(4, totalSize, false);

  let offset = headerSize;
  for (const e of entries) {
    const typeBytes = new TextEncoder().encode(e.type);
    result.set(typeBytes, offset);
    view.setUint32(offset + 4, 8 + e.data.length, false);
    result.set(e.data, offset + 8);
    offset += 8 + e.data.length;
  }

  return result;
};
