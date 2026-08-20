// Browser-side image downscale, run before an upload reaches a server action.
// A phone photo is several megabytes, which blows past the server action body
// limit and fails before any server-side validation can answer. Resizing first
// keeps the request small; the server checks stay as the backstop for anything
// that skipped this path.
//
// Canvas only, no dependency. Browser APIs throughout, so import this from
// client components only.

// Avatars render at 96px today. 512 leaves retina headroom and room to show
// them larger later without a re-upload.
const MAX_EDGE = 512;
const QUALITY = 0.85;

// Long edge down to `maxEdge`, aspect preserved, never upscaled. Exported for
// its own tests: this is the only part of the resize with arithmetic in it.
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number = MAX_EDGE,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

// EXIF orientation: createImageBitmap with imageOrientation "from-image"
// applies it, so a portrait phone photo does not land sideways. Older engines
// without the options argument fall back to an <img>, which current browsers
// also orient from EXIF.
type Decoded = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
};

async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // Fall through to the element path.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

function toBlob(
  canvas: HTMLCanvasElement,
  type: string,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

function renamed(name: string, ext: string): string {
  const base = name.replace(/\.[^./\\]+$/, "") || "avatar";
  return `${base}.${ext}`;
}

/**
 * Returns a downscaled WebP copy of `file`, or a JPEG copy where WebP encoding
 * is unavailable. Returns the original file untouched if the image cannot be
 * decoded or encoded, so the caller always has something to upload and the
 * server validation decides.
 */
export async function resizeImageForUpload(file: File): Promise<File> {
  let decoded: Decoded;
  try {
    decoded = await decode(file);
  } catch {
    return file;
  }

  try {
    const { width, height } = fitWithin(decoded.width, decoded.height);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(decoded.source, 0, 0, width, height);

    let blob = await toBlob(canvas, "image/webp");
    let ext = "webp";

    // Safari before 14 ignores the requested type and hands back a PNG, so
    // trust the blob's own type rather than the request.
    if (!blob || blob.type !== "image/webp") {
      // JPEG has no alpha, so a transparent source would flatten to black.
      // Paint a white ground first, only on this path.
      ctx.fillStyle = "#FFFFFF";
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillRect(0, 0, width, height);
      blob = await toBlob(canvas, "image/jpeg");
      ext = "jpg";
    }

    if (!blob) return file;

    return new File([blob], renamed(file.name, ext), {
      type: blob.type,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    decoded.release();
  }
}
