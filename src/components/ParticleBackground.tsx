import './ParticleBackground.css';

interface ParticleBackgroundProps {
  variant?: 'divine' | 'mortal' | 'default';
}

export function ParticleBackground({ variant = 'default' }: ParticleBackgroundProps) {
  const colorClass = variant === 'mortal' ? 'particles--mortal' : 'particles--divine';

  return (
    <div className="particle-background" aria-hidden="true">
      <div className={`particles-container visible ${colorClass}`}>
        <div className="particles particles--layer-1" />
        <div className="particles particles--layer-2" />
      </div>
    </div>
  );
}

export default ParticleBackground;
