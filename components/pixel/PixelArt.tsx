"use client";
// Tiny pixel-art renderer: each char in `grid` is a palette key; "." = transparent.
// Produces an inline SVG of crisp rects — true 8-bit, no fuzzy raster sprites.

interface Props {
  grid: string[];
  palette: Record<string, string>;
  pixel?: number; // px per cell
  className?: string;
  style?: React.CSSProperties;
}

export function PixelArt({ grid, palette, pixel = 6, className, style }: Props) {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  return (
    <svg
      width={w * pixel}
      height={h * pixel}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      className={className}
      style={style}
    >
      {grid.flatMap((row, y) =>
        row.split("").map((c, x) =>
          c === "." || !palette[c] ? null : (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={palette[c]} />
          ),
        ),
      )}
    </svg>
  );
}

// --- Sprite library ---------------------------------------------------------

// Ogre — chunky 12x14 green creature carrying envelope
export const OGRE_RUN_A = [
  "....gggggg..",
  "...gggggggg.",
  "..gg.gg.gg.g",
  "..gggggggggg",
  "..gKggggggKg", // eyes
  "..gggggggggg",
  "..gg.gg.gg.g", // teeth
  ".ggggggggggg",
  "ggggwwwwgggg", // envelope held up - shown as torso highlight
  "gg.gggggg.gg",
  "gg.gggggg.gg",
  ".gg......gg.",
  ".gg......gg.",
  "bbb......bbb", // feet
];

export const OGRE_RUN_B = [
  "....gggggg..",
  "...gggggggg.",
  "..gg.gg.gg.g",
  "..gggggggggg",
  "..gKggggggKg",
  "..gggggggggg",
  "..gg.gg.gg.g",
  ".ggggggggggg",
  "ggggwwwwgggg",
  "gg.gggggg.gg",
  ".gggggggggg.",
  "gg........gg",
  "bb........bb",
  "bbb......bbb",
];

export const OGRE_FALL = [
  "............",
  "....gggggg..",
  "...gggggggg.",
  "..gg.gg.gg.g",
  "..gggggggggg",
  "..gXggggggXg", // X eyes
  "..gggggggggg",
  "..gg.gg.gg.g",
  ".ggggggggggg",
  "gggggwwwggggg".slice(0, 12),
  "gg.gggggg.gg",
  "gg.gggggg.gg",
  ".gg......gg.",
  "bbb......bbb",
];

// Envelope held above head
export const ENVELOPE = [
  "wwwwwwwww",
  "wKKwwwKKw",
  "wKKKwKKKw",
  "wKKKKKKKw",
  "wwwwwwwww",
];

// Spam wall — red brick with "SPAM"
export const SPAM_WALL = [
  "RRRRRRRRRR",
  "RKKRKRKRKR",
  "RKRRKRRKKR",
  "RKKRKRRKKR",
  "RKKRKRKRKR",
  "RRRRRRRRRR",
  "RKKRKKRKKR",
  "RKRRKRRRKR",
  "RKKRKRRKKR",
  "RKRRKRRKKR",
  "RRRRRRRRRR",
  "bbbbbbbbbb",
];

// Blacklist gate — taller, dark with yellow stripes
export const BLACKLIST_GATE = [
  "KKKKKKKK",
  "KYYKKYYK",
  "KYYKKYYK",
  "KKKKKKKK",
  "KKKKKKKK",
  "KYYKKYYK",
  "KYYKKYYK",
  "KKKKKKKK",
  "KKKKKKKK",
  "KYYKKYYK",
  "KYYKKYYK",
  "KKKKKKKK",
  "KKKKKKKK",
  "bbbbbbbb",
];

// Pixel cloud (terminal-style — wireframe)
export const CLOUD = [
  "..ggggg..",
  ".gK...Kg.",
  "gK.....Kg",
  "gK.....Kg",
  ".ggggggg.",
];

// Default palette: g=crt green, K=black, w=paper/white, R=red, Y=yellow, X=hazard, b=dark green
export const TERMINAL_PALETTE: Record<string, string> = {
  g: "#22c55e",
  K: "#0a0a0a",
  w: "#f4ecd8",
  R: "#ef4444",
  Y: "#facc15",
  X: "#ef4444",
  b: "#15803d",
};
