import React from 'react';

interface PillarSpec {
  id: string;
  height: number;
  x: number;
  y: number;
  isIndigo?: boolean;
  tag?: string;
}

const HERO_PILLARS: PillarSpec[] = [
  { id: 'p1', height: 70, x: 56, y: 248 },
  { id: 'p2', height: 120, x: 124, y: 196, tag: 'SQL' },
  { id: 'p3', height: 170, x: 192, y: 144, tag: 'Python' },
  { id: 'p4', height: 100, x: 248, y: 232 },
  { id: 'p5', height: 210, x: 268, y: 76, isIndigo: true, tag: 'Power BI' },
];

const LOGIN_PILLARS: PillarSpec[] = [
  { id: 'lp1', height: 95, x: 76, y: 204, tag: 'SQL' },
  { id: 'lp2', height: 145, x: 164, y: 156, tag: 'Python' },
  { id: 'lp3', height: 200, x: 246, y: 98, isIndigo: true, tag: 'Power BI' },
];

export const Hero3DScene: React.FC = () => {
  return (
    <div
      className="hero-3d-viewport"
      aria-hidden="true"
      style={{ perspective: '1400px' }}
    >
      <div
        className="hero-3d-platform"
        style={{
          width: '380px',
          height: '380px',
          backgroundSize: '38px 38px',
          transform: 'rotateX(58deg) rotateZ(45deg)',
        }}
      >
        {HERO_PILLARS.map((p) => {
          const topColor = p.isIndigo
            ? 'linear-gradient(135deg, #A5B4FC 0%, #818CF8 100%)'
            : 'linear-gradient(135deg, #67E8F9 0%, #22D3EE 100%)';
          const leftColor = p.isIndigo
            ? 'linear-gradient(180deg, #818CF8 0%, #4F46E5 100%)'
            : 'linear-gradient(180deg, #22D3EE 0%, #0891B2 100%)';
          const rightColor = p.isIndigo
            ? 'linear-gradient(180deg, #6366F1 0%, #3730A3 100%)'
            : 'linear-gradient(180deg, #06B6D4 0%, #0E7490 100%)';

          return (
            <div
              key={p.id}
              className="hero-3d-pillar"
              style={{
                width: '48px',
                height: '48px',
                left: `${p.x}px`,
                top: `${p.y}px`,
                ['--h' as string]: `${p.height}px`,
              }}
            >
              {/* Shaded Face 1: Top */}
              <div
                className="hero-3d-pillar-face hero-3d-pillar-top"
                style={{
                  width: '48px',
                  height: '48px',
                  background: topColor,
                  transform: `translateZ(${p.height}px)`,
                }}
              />
              {/* Shaded Face 2: Left/SW */}
              <div
                className="hero-3d-pillar-face hero-3d-pillar-left"
                style={{
                  width: `${p.height}px`,
                  height: '48px',
                  background: leftColor,
                }}
              />
              {/* Shaded Face 3: Right/SE */}
              <div
                className="hero-3d-pillar-face hero-3d-pillar-right"
                style={{
                  width: '48px',
                  height: `${p.height}px`,
                  background: rightColor,
                }}
              />

              {/* Billboard Tag */}
              {p.tag && (
                <div
                  className="hero-3d-billboard"
                  style={{
                    ['--z' as string]: `${p.height + 26}px`,
                    left: '-8px',
                    top: '-8px',
                    borderColor: p.isIndigo ? 'rgba(129, 140, 248, 0.55)' : 'rgba(34, 211, 238, 0.45)',
                  }}
                >
                  {p.tag}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const Login3DPillarScene: React.FC = () => {
  return (
    <div
      className="hero-3d-viewport"
      aria-hidden="true"
      style={{ perspective: '1400px', minHeight: '360px' }}
    >
      <div
        className="hero-3d-platform"
        style={{
          width: '340px',
          height: '340px',
          backgroundSize: '34px 34px',
          transform: 'rotateX(58deg) rotateZ(45deg)',
        }}
      >
        {LOGIN_PILLARS.map((p) => {
          const topColor = p.isIndigo
            ? 'linear-gradient(135deg, #A5B4FC 0%, #818CF8 100%)'
            : 'linear-gradient(135deg, #67E8F9 0%, #22D3EE 100%)';
          const leftColor = p.isIndigo
            ? 'linear-gradient(180deg, #818CF8 0%, #4F46E5 100%)'
            : 'linear-gradient(180deg, #22D3EE 0%, #0891B2 100%)';
          const rightColor = p.isIndigo
            ? 'linear-gradient(180deg, #6366F1 0%, #3730A3 100%)'
            : 'linear-gradient(180deg, #06B6D4 0%, #0E7490 100%)';

          return (
            <div
              key={p.id}
              className="hero-3d-pillar"
              style={{
                width: '48px',
                height: '48px',
                left: `${p.x}px`,
                top: `${p.y}px`,
                ['--h' as string]: `${p.height}px`,
              }}
            >
              <div
                className="hero-3d-pillar-face hero-3d-pillar-top"
                style={{
                  width: '48px',
                  height: '48px',
                  background: topColor,
                  transform: `translateZ(${p.height}px)`,
                }}
              />
              <div
                className="hero-3d-pillar-face hero-3d-pillar-left"
                style={{
                  width: `${p.height}px`,
                  height: '48px',
                  background: leftColor,
                }}
              />
              <div
                className="hero-3d-pillar-face hero-3d-pillar-right"
                style={{
                  width: '48px',
                  height: `${p.height}px`,
                  background: rightColor,
                }}
              />
              {p.tag && (
                <div
                  className="hero-3d-billboard"
                  style={{
                    ['--z' as string]: `${p.height + 24}px`,
                    left: '-6px',
                    top: '-6px',
                    borderColor: p.isIndigo ? 'rgba(129, 140, 248, 0.55)' : 'rgba(34, 211, 238, 0.45)',
                  }}
                >
                  {p.tag}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
