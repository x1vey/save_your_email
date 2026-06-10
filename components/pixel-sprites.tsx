import React from 'react';

// Helper to convert ascii grids to simple pixel SVGs
const PixelSprite = ({ template, colorMap, scale = 1, className = "" }: { template: string[], colorMap: Record<string, string>, scale?: number, className?: string }) => {
  const width = template[0].length;
  const height = template.length;

  return (
    <svg 
      viewBox={`0 0 ${width} ${height}`} 
      width={width * scale} 
      height={height * scale} 
      className={`pixelated ${className}`}
      shapeRendering="crispEdges"
    >
      {template.map((row, y) => 
        row.split('').map((char, x) => {
          if (char === ' ' || !colorMap[char]) return null;
          return <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={colorMap[char]} />
        })
      )}
    </svg>
  );
};

// 1. Two-headed Ogre (Based on provided image)
export const OgreSprite = ({ scale = 4, className = "" }) => {
  // Simple 16x16 approximation of the two-headed ogre
  const template = [
    "  GG  GG  ",
    " GgGGgGG  ",
    " gYggYgg  ",
    " GgGGgGG  ",
    "  GGGG    ",
    " GGGGGG   ",
    " GGGGGG   ",
    " GGGGGG   ",
    " GG  GG   ",
    " GG  GG   ",
  ];
  const colorMap = {
    'G': '#4a5d23', // Dark olive green
    'g': '#6b8e23', // Olive drab (skin highlights)
    'Y': '#ffcc00', // Yellow eyes
  };
  return <PixelSprite template={template} colorMap={colorMap} scale={scale} className={className} />;
};

// 2. Mail with Red Badge (Based on provided image)
export const MailSprite = ({ scale = 4, className = "" }) => {
  const template = [
    "   RRR  ",
    "  R111R ",
    "WWWWWWWW",
    "WbbbbbbW",
    "WWbbbbWW",
    "WWWbbWWW",
    "WWWWWWWW",
  ];
  const colorMap = {
    'W': '#ffffff', // White envelope
    'b': '#cccccc', // light grey shadow
    'R': '#e63946', // Red badge
    '1': '#ffffff', // '1' text
  };
  return <PixelSprite template={template} colorMap={colorMap} scale={scale} className={className} />;
};

// 3. Snake Monster (Based on provided image)
export const SnakeSprite = ({ scale = 4, className = "" }) => {
  const template = [
    "  GGGG  ",
    " GGWwGG ",
    " GGyyGG ",
    "  RyyG  ",
    "   yG   ",
    "  GyG   ",
    " GGGGG  ",
  ];
  const colorMap = {
    'G': '#2a9d8f', // Green snake
    'y': '#e9c46a', // Yellow underbelly
    'W': '#ffffff', // Eye
    'w': '#000000', // Pupil
    'R': '#e63946', // Tongue
  };
  return <PixelSprite template={template} colorMap={colorMap} scale={scale} className={className} />;
};

// 4. Grey Monster (Based on provided image)
export const GreyMonsterSprite = ({ scale = 4, className = "" }) => {
  const template = [
    "  ggg   ",
    " gRgRg  ",
    " ggggg  ",
    "gg   gg ",
    "g     g ",
    "gg   gg ",
    " g   g  ",
  ];
  const colorMap = {
    'g': '#6c757d', // Grey
    'R': '#e63946', // Red eyes
  };
  return <PixelSprite template={template} colorMap={colorMap} scale={scale} className={className} />;
};

// 5. Black Monster (Based on provided image)
export const BlackMonsterSprite = ({ scale = 4, className = "" }) => {
  const template = [
    "b b  b  ",
    " bbbbb  ",
    "b WbWb  ",
    " bbbbb  ",
    " bb bb  ",
    "  b b   ",
  ];
  const colorMap = {
    'b': '#000000', // Pure black silhouette
    'W': '#ffffff', // White eyes
  };
  return <PixelSprite template={template} colorMap={colorMap} scale={scale} className={className} />;
};
