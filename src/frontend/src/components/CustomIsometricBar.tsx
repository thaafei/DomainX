import React from 'react';

interface IsometricBarProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  // Recharts passes the total height of the chart area via 'background' or we can infer it
  background?: { y: number; height: number }; 
}

const CustomIsometricBar: React.FC<IsometricBarProps> = (props) => {
  const { x = 0, y = 0, width = 0, height = 0, fill = '#8884d8', background } = props;
  
  if (!height || height <= 0) return null;

  // 1. DIMENSIONS: Make bar thinner
  const barWidth = width * 0.4; // 40% of the available slot width
  const xOffset = (width - barWidth) / 2;
  const leftX = x + xOffset;
  const rightX = leftX + barWidth;
  const centerX = leftX + barWidth / 2;
  const topHeight = 8; // Smaller diamond for thinner bars

  // 2. BACKGROUND TRACK (The Shadow Pillar)
  // This uses the height of the entire Y-Axis area
  const fullY = background?.y || 0;
  const fullHeight = background?.height || 0;

  return (
    <g>
      {/* --- STEP 1: BACKGROUND PILLAR (Shadow) --- */}
      <rect 
        x={leftX} y={fullY} width={barWidth} height={fullHeight} 
        fill="rgba(255, 255, 255, 0.05)" // Very subtle white/gray shadow
      />
      <path
        d={`M ${leftX} ${fullY} L ${centerX} ${fullY - topHeight} L ${rightX} ${fullY} L ${centerX} ${fullY + topHeight} Z`}
        fill="rgba(255, 255, 255, 0.1)"
      />

      {/* --- STEP 2: ACTIVE 3D BAR --- */}
      {/* Main Pillar */}
      <rect 
        x={leftX} y={y} width={barWidth} height={height} 
        fill={fill} fillOpacity={0.9} 
      />
      
      {/* 3D Top Diamond */}
      <path
        d={`M ${leftX} ${y} L ${centerX} ${y - topHeight} L ${rightX} ${y} L ${centerX} ${y + topHeight} Z`}
        fill={fill}
        filter="brightness(1.3)"
      />

      {/* 3D Side Depth */}
      <path
        d={`M ${rightX} ${y} L ${rightX + 4} ${y - 3} L ${rightX + 4} ${y + height - 3} L ${rightX} ${y + height} Z`}
        fill={fill}
        filter="brightness(0.6)"
        opacity={0.5}
      />
    </g>
  );
};

export default CustomIsometricBar;