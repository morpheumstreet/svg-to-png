/** decode base64 data URL to Uint8Array */
const dataUrlToBytes = (dataUrl: string): Uint8Array => {
  const base64 = dataUrl.split(",")[1];
  if (!base64) throw new Error("Invalid data URL");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

/** create Windows ICO file from PNG data URLs (embeds PNGs, Vista+ format) */
export const createIcoFromPngs = (
  pngDataUrls: Array<{ dataUrl: string; size: number }>,
): Uint8Array => {
  const pngBytes = pngDataUrls.map((p) => dataUrlToBytes(p.dataUrl));
  const count = pngBytes.length;

  const header = new ArrayBuffer(6);
  const headerView = new DataView(header);
  headerView.setUint16(0, 0, true); // reserved
  headerView.setUint16(2, 1, true); // type: ICO
  headerView.setUint16(4, count, true); // count

  const dirEntries: ArrayBuffer[] = [];
  let offset = 6 + 16 * count;

  for (let i = 0; i < count; i++) {
    const size = pngBytes[i].length;
    const w = pngDataUrls[i].size;
    const width = w >= 256 ? 0 : w;
    const height = width;

    const dir = new ArrayBuffer(16);
    const dirView = new DataView(dir);
    dirView.setUint8(0, width);
    dirView.setUint8(1, height);
    dirView.setUint8(2, 0);
    dirView.setUint8(3, 0);
    dirView.setUint16(4, 1, true); // planes
    dirView.setUint16(6, 32, true); // bpp
    dirView.setUint32(8, size, true);
    dirView.setUint32(12, offset, true);

    dirEntries.push(dir);
    offset += size;
  }

  const total = 6 + 16 * count + pngBytes.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(total);
  let pos = 0;
  result.set(new Uint8Array(header), pos);
  pos += 6;
  for (const dir of dirEntries) {
    result.set(new Uint8Array(dir), pos);
    pos += 16;
  }
  for (const png of pngBytes) {
    result.set(png, pos);
    pos += png.length;
  }
  return result;
};
