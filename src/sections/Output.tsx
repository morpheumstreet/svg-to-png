import { useAtom } from "jotai";
import {
  faDownload,
  faFileZipper,
  faMoon,
  faSun,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "@/components/Button";
import { Canvas } from "@/sections/Canvas";
import { editAll, iconSetSizes, images, setImage } from "@/state";
import { downloadPng, downloadPngs, downloadZip } from "@/util/download";
import classes from "./Output.module.css";

const Output = () => {
  const [getImages] = useAtom(images);
  const [getEditAll] = useAtom(editAll);
  const [getIconSetSizes] = useAtom(iconSetSizes);

  if (!getImages.length) return <></>;

  /** build flat list of outputs for download index lookup */
  const outputItems = getImages.flatMap((image, index) =>
    image.iconSet
      ? getIconSetSizes.map((size) => ({
          image,
          index,
          size: size as number | null,
          name: `${image.name}-${size}`,
        }))
      : [{ image, index, size: null as number | null, name: image.name }],
  );

  return (
    <section>
      <h2>Output</h2>

      <div className={classes.grid}>
        {outputItems.map(({ image, index, size, name }, i) => (
          <div
            key={size ? `${index}-${size}` : index}
            className={classes.cell}
            role="group"
            aria-label={name + ".png"}
          >
            <div className={classes.name}>{name}.png</div>

            <Canvas
              {...image}
              tooltip="PNG preview"
              overrideSize={size ?? undefined}
              canvasTitle={name}
            />

            <div className={classes.actions}>
              <Button
                onClick={() => downloadPng(getPngs()[i])}
                data-tooltip="Download this PNG"
                data-square
              >
                <FontAwesomeIcon icon={faDownload} />
              </Button>
              <Button
                onClick={() =>
                  setImage(
                    getEditAll ? -1 : index,
                    "darkCheckers",
                    !image.darkCheckers,
                  )
                }
                data-tooltip={`Show ${
                  image.darkCheckers ? "light" : "dark"
                } checkerboard background for transparency preview.`}
                data-square
              >
                <FontAwesomeIcon icon={image.darkCheckers ? faMoon : faSun} />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className={classes.buttons}>
        <Button
          onClick={() => downloadPngs(getPngs())}
          data-tooltip="Download all PNGs as individual downloads."
        >
          Download All
          <FontAwesomeIcon icon={faDownload} />
        </Button>

        <Button
          onClick={() => downloadZip(getPngs())}
          data-tooltip="Zip PNGs together into single download."
        >
          Download Zip
          <FontAwesomeIcon icon={faFileZipper} />
        </Button>
      </div>
    </section>
  );
};

export default Output;

/** get list of canvases and names to download as pngs */
const getPngs = () =>
  [...document.querySelectorAll("canvas")].map((canvas) => ({
    canvas,
    name: canvas.getAttribute("title") || "",
  }));
