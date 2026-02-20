import {
  BlobReader,
  BlobWriter,
  Data64URIReader,
  TextReader,
  ZipWriter,
} from "@zip.js/zip.js";
import { createIcoFromPngs } from "@/util/ico";
import { createIcnsFromPngs } from "@/util/icns";

/** turn canvas image into data url */
const getCanvasUrl = (canvas: HTMLCanvasElement) =>
  canvas.toDataURL("image/png").replace("image/png", "octet/stream");

/** download file from url and name */
const downloadFile = (url: string, name: string) => {
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
};

type Png = { canvas: HTMLCanvasElement; name: string };

/** download single png from canvas */
export const downloadPng = ({ canvas, name }: Png) =>
  downloadFile(getCanvasUrl(canvas), name + ".png");

/** download list of pngs */
export const downloadPngs = async (pngs: Png[]) => pngs.forEach(downloadPng);

/** map pixel size to Android density folder */
const sizeToDensity = (size: number): string => {
  if (size <= 48) return "mdpi";
  if (size <= 96) return "hdpi";
  if (size <= 160) return "xhdpi";
  if (size <= 240) return "xxhdpi";
  return "xxxhdpi";
};

export type PlatformOptions = {
  android: boolean;
  windows: boolean;
  macos: boolean;
  ios: boolean;
};

type OutputItem = {
  image: { name: string; iconSet?: boolean };
  index: number;
  size: number | null;
  name: string;
};

/** download zip of pngs, optionally including platform-specific outputs */
export const downloadZip = async (
  pngs: Png[],
  options?: {
    iconSetMode?: boolean;
    platforms?: PlatformOptions;
    outputItems?: OutputItem[];
  },
) => {
  const zipWriter = new ZipWriter(new BlobWriter("application/zip"));
  const platforms = options?.platforms ?? {
    android: false,
    windows: false,
    macos: false,
    ios: false,
  };
  const outputItems = options?.outputItems ?? [];

  const entries: Promise<unknown>[] = [];

  // Add all PNGs
  for (const { canvas, name } of pngs) {
    entries.push(
      zipWriter.add(name + ".png", new Data64URIReader(getCanvasUrl(canvas))),
    );
  }

  // Group icon-set outputs by base image
  const iconSetGroups = new Map<
    string,
    Array<{ png: Png; size: number; name: string }>
  >();
  if (platforms.android || platforms.windows || platforms.macos || platforms.ios) {
    for (let i = 0; i < outputItems.length; i++) {
      const item = outputItems[i];
      if (item.image.iconSet && item.size != null && pngs[i]) {
        const baseName = item.image.name;
        const key = `${item.index}-${baseName}`;
        if (!iconSetGroups.has(key)) iconSetGroups.set(key, []);
        iconSetGroups.get(key)!.push({
          png: pngs[i],
          size: item.size,
          name: item.name,
        });
      }
    }
  }

  for (const [, items] of iconSetGroups) {
    const baseName = items[0].name.split("-").slice(0, -1).join("-");
    const pngData = items.map(({ png, size }) => ({
      dataUrl: getCanvasUrl(png.canvas),
      size,
    }));

    if (platforms.android) {
      for (const { png, size } of items) {
        const density = sizeToDensity(size);
        entries.push(
          zipWriter.add(
            `android-set/${baseName}/res/drawable-${density}/ic_${baseName}_${size}.png`,
            new Data64URIReader(getCanvasUrl(png.canvas)),
          ),
        );
      }
    }

    if (platforms.windows) {
      const ico = createIcoFromPngs(pngData);
      entries.push(
        zipWriter.add(
          `windows-set/${baseName}.ico`,
          new BlobReader(new Blob([ico])),
        ),
      );
    }

    if (platforms.macos) {
      const icns = createIcnsFromPngs(pngData);
      entries.push(
        zipWriter.add(
          `macos-set/${baseName}.icns`,
          new BlobReader(new Blob([icns])),
        ),
      );
    }

    if (platforms.ios) {
      const images = items.map(({ size, name }) => ({
        size: `${size}x${size}`,
        idiom: "universal" as const,
        filename: `${name}.png`,
        scale: "1x" as const,
      }));
      const contents = {
        images,
        info: { version: 1, author: "xcode" },
      };
      entries.push(
        zipWriter.add(
          `ios-set/${baseName}/AppIcon.appiconset/Contents.json`,
          new TextReader(JSON.stringify(contents, null, 2)),
        ),
      );
      for (const { png, name } of items) {
        entries.push(
          zipWriter.add(
            `ios-set/${baseName}/AppIcon.appiconset/${name}.png`,
            new Data64URIReader(getCanvasUrl(png.canvas)),
          ),
        );
      }
    }
  }

  await Promise.all(entries);
  const blob = await zipWriter.close();
  const url = window.URL.createObjectURL(blob);
  const zipName = options?.iconSetMode ? "export-icon-resources.zip" : "svg-to-png.zip";
  downloadFile(url, zipName);
  window.URL.revokeObjectURL(url);
};
