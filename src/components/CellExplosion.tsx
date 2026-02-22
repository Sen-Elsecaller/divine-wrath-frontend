import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  angle: number;
  speed: number;
  size: number;
  color: string;
}

interface CellExplosionProps {
  isHit: boolean;
  onComplete?: () => void;
}

const PARTICLE_COUNT = 40;
const ANIMATION_DURATION = 800;

export function CellExplosion({ isHit, onComplete }: CellExplosionProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!isHit && !isAnimating) return;

    // Generate particles
    const newParticles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
      newParticles.push({
        id: i,
        x: 50,
        y: 50,
        angle,
        speed: 30 + Math.random() * 20,
        size: 4 + Math.random() * 4,
        color: isHit
          ? i % 2 === 0 ? 'var(--color-danger)' : 'var(--color-gold)'
          : 'var(--color-ink-muted)',
      });
    }

    setParticles(newParticles);
    setIsAnimating(true);

    const timer = setTimeout(() => {
      setIsAnimating(false);
      setParticles([]);
      onComplete?.();
    }, ANIMATION_DURATION);

    return () => clearTimeout(timer);
  }, [isHit]);

  if (!isAnimating || particles.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Central flash */}
      <div
        className="absolute inset-0 rounded-sm"
        style={{
          background: isHit
            ? 'radial-gradient(circle, var(--color-danger) 0%, transparent 70%)'
            : 'radial-gradient(circle, var(--color-gold) 0%, transparent 70%)',
          animation: 'explosion-flash 300ms ease-out forwards',
        }}
      />

      {/* Expanding ring */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
        style={{
          borderColor: isHit ? 'var(--color-danger)' : 'var(--color-gold)',
          animation: 'explosion-ring 400ms ease-out forwards',
        }}
      />

      {/* Particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            animation: `explosion-particle ${ANIMATION_DURATION}ms ease-out forwards`,
            '--particle-x': `${Math.cos(particle.angle) * particle.speed}px`,
            '--particle-y': `${Math.sin(particle.angle) * particle.speed}px`,
          } as React.CSSProperties}
        />
      ))}

      <style>{`
        @keyframes explosion-flash {
          0% { opacity: 0.8; transform: scale(0.5); }
          100% { opacity: 0; transform: scale(1.5); }
        }

        @keyframes explosion-ring {
          0% { width: 0; height: 0; opacity: 1; }
          100% { width: 120%; height: 120%; opacity: 0; }
        }

        @keyframes explosion-particle {
          0% {
            transform: translate(-50%, -50%) translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) translate(var(--particle-x), var(--particle-y)) scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
