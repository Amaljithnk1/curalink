import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useResearchStore } from '@/state/store';
import { motion, AnimatePresence } from 'framer-motion';

// ── Paper grain SVG filter (injected once) ──────────────────────
function PaperGrain() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }}>
      <defs>
        <filter id="paper-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
          <feBlend in="SourceGraphic" mode="multiply" />
        </filter>
      </defs>
    </svg>
  );
}

export default function FirstRunPage() {
  const navigate = useNavigate();
  const setContext = useResearchStore((s) => s.setContext);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const mouseRef = useRef({ x: -999, y: -999 });

  const [condition, setCondition] = useState('');
  const [location, setLocation] = useState('');
  const [medications, setMedications] = useState<string[]>([]);
  const [medInput, setMedInput] = useState('');
  const [spotlightQuery, setSpotlightQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [inkPhase, setInkPhase] = useState<'bloom' | 'settle' | 'done'>('bloom');

  // ── Ink bloom sequence ────────────────────────────────────────
  useEffect(() => {
    const t1 = setTimeout(() => setInkPhase('settle'), 900);
    const t2 = setTimeout(() => setInkPhase('done'), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // ── Particle canvas ──────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    type Particle = {
      x: number; y: number;
      vx: number; vy: number;
      r: number; opacity: number;
      baseOpacity: number;
      pulseOffset: number;
      hue: 'burg' | 'sage' | 'amber' | 'blush';
    };

    let W = 0, H = 0;
    let particles: Particle[] = [];

    function resize() {
      W = canvas!.width = canvas!.offsetWidth;
      H = canvas!.height = canvas!.offsetHeight;
      init();
    }

    function init() {
      particles = [];
      // More particles, more variety
      for (let i = 0; i < 380; i++) {
        const roll = Math.random();
        const baseOp = Math.random() * 0.55 + 0.18;
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          r: Math.random() * 3.8 + 0.4,
          opacity: baseOp,
          baseOpacity: baseOp,
          pulseOffset: Math.random() * Math.PI * 2,
          hue: roll > 0.55 ? 'burg' : roll > 0.35 ? 'sage' : roll > 0.18 ? 'amber' : 'blush',
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const t = Date.now() / 1000;

      // Flowing blobs — richer, more prominent
      const blobs = [
        { x: W * 0.5 + Math.cos(t * 0.7) * W * 0.28, y: H * 0.38 + Math.sin(t * 0.5) * H * 0.28, color: 'rgba(107,29,42,', alpha: 0.09, size: W * 0.55 },
        { x: W * 0.82 + Math.cos(t * 0.4 + 2) * W * 0.12, y: H * 0.72 + Math.sin(t * 0.6 + 2) * H * 0.2, color: 'rgba(91,122,94,', alpha: 0.07, size: W * 0.42 },
        { x: W * 0.15 + Math.cos(t * 0.55 + 4) * W * 0.1, y: H * 0.28 + Math.sin(t * 0.45 + 4) * H * 0.22, color: 'rgba(184,134,11,', alpha: 0.055, size: W * 0.32 },
        { x: W * 0.75 + Math.cos(t * 0.3 + 1) * W * 0.08, y: H * 0.15 + Math.sin(t * 0.5 + 3) * H * 0.1, color: 'rgba(180,60,80,', alpha: 0.045, size: W * 0.22 },
      ];

      blobs.forEach(b => {
        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.size);
        grad.addColorStop(0, `${b.color}${b.alpha})`);
        grad.addColorStop(1, `${b.color}0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      });

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      particles.forEach((p, i) => {
        // Pulse opacity
        p.opacity = p.baseOpacity + Math.sin(t * 1.2 + p.pulseOffset) * 0.12;

        // Mouse repulsion — stronger radius
        const dx = p.x - mx, dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180 && dist > 0) {
          const force = (180 - dist) / 180;
          p.vx += (dx / dist) * force * 0.8;
          p.vy += (dy / dist) * force * 0.8;
        }

        p.vx *= 0.965;
        p.vy *= 0.965;
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;

        const color =
          p.hue === 'burg'  ? `rgba(107,29,42,${p.opacity})` :
          p.hue === 'sage'  ? `rgba(91,122,94,${p.opacity})` :
          p.hue === 'amber' ? `rgba(184,134,11,${p.opacity * 0.85})` :
                              `rgba(180,60,80,${p.opacity * 0.6})`;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Connection lines — longer reach
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const ex = p.x - q.x, ey = p.y - q.y;
          const ed = Math.sqrt(ex * ex + ey * ey);
          if (ed < 60) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(107,29,42,${0.10 * (1 - ed / 90)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      });

      animFrameRef.current = requestAnimationFrame(draw);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    draw();

    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(animFrameRef.current);
      } else {
        animFrameRef.current = requestAnimationFrame(draw);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      ro.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // ── Handlers ─────────────────────────────────────────────────
  const handleStartResearch = () => {
    if (!condition.trim()) return;
    setContext({
      condition: condition.trim(),
      location: location.trim() || undefined,
      medications: medications.length > 0 ? medications : undefined,
    });
    navigate('/research');
  };

  const handleSpotlightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spotlightQuery.trim()) return;
    setContext({ condition: spotlightQuery.trim() });
    navigate('/research');
  };

  const handleAddMedication = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && medInput.trim()) {
      e.preventDefault();
      setMedications([...medications, medInput.trim()]);
      setMedInput('');
    }
  };

  const quickStarts = [
    { label: 'Lung Cancer Treatment', query: 'Latest treatment for lung cancer' },
    { label: 'Diabetes Trials',        query: 'Clinical trials for diabetes' },
    { label: "Alzheimer's Research",   query: "Top researchers in Alzheimer's disease" },
    { label: "Parkinson's DBS",        query: "Deep brain stimulation for Parkinson's" },
  ];

  // ── Ink bloom logo styles ─────────────────────────────────────
  const inkRingStyle = (delay: number, size: number, opacity: number) => ({
    position: 'absolute' as const,
    width: size,
    height: size,
    borderRadius: '50%',
    border: `1px solid rgba(107,29,42,${opacity})`,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    animation: `inkRingExpand 1.8s ${delay}s cubic-bezier(0.19,1,0.22,1) forwards`,
    opacity: 0,
  });

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: '#FFFDF7' }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      }}
      onMouseLeave={() => { mouseRef.current = { x: -999, y: -999 }; }}
    >
      <PaperGrain />

      {/* Paper grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
          mixBlendMode: 'multiply',
          opacity: 0.6,
          zIndex: 1,
        }}
      />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(107,29,42,0.022) 1px, transparent 1px),
            linear-gradient(90deg, rgba(107,29,42,0.022) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          zIndex: 1,
        }}
      />

      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none', zIndex: 2 }}
      />

      {/* CSS for ink ring animation */}
      <style>{`
        @keyframes inkRingExpand {
          0%   { opacity: 0; transform: translate(-50%,-50%) scale(0.1); }
          20%  { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%,-50%) scale(1); }
        }
        @keyframes inkBloom {
          0%   { transform: translate(-50%,-50%) scale(0); opacity: 0.8; }
          60%  { opacity: 0.12; }
          100% { transform: translate(-50%,-50%) scale(3.5); opacity: 0; }
        }
        @keyframes inkSettle {
          0%   { filter: blur(8px); opacity: 0; transform: scale(0.92); }
          100% { filter: blur(0px); opacity: 1; transform: scale(1); }
        }
        @keyframes rotateSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes rotateSlowReverse {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        .ink-reveal {
          animation: inkSettle 1.1s cubic-bezier(0.19,1,0.22,1) forwards;
          opacity: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          .ink-reveal { animation: none; opacity: 1; }
          @keyframes inkRingExpand { 100% { opacity: 0; } }
        }
      `}</style>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-16">

        {/* Logo mark with ink bloom */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
          style={{ position: 'relative', width: 56, height: 56 }}
        >
          {/* Ink bloom pulse — expands outward */}
          <div style={{
            position: 'absolute',
            width: 56, height: 56,
            borderRadius: '50%',
            background: 'rgba(107,29,42,0.18)',
            top: '50%', left: '50%',
            animation: 'inkBloom 1.4s cubic-bezier(0.19,1,0.22,1) 0.1s forwards',
            opacity: 0,
          }} />

          {/* Expanding rings */}
          <div style={inkRingStyle(0.05, 80, 0.25)} />
          <div style={inkRingStyle(0.15, 110, 0.16)} />
          <div style={inkRingStyle(0.28, 150, 0.10)} />
          <div style={inkRingStyle(0.42, 200, 0.06)} />

          {/* Outer slow orbit ring */}
          <div style={{
            position: 'absolute',
            width: 72, height: 72,
            borderRadius: '50%',
            border: '1px dashed rgba(107,29,42,0.10)',
            top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            animation: 'rotateSlow 18s linear infinite',
          }}>
            {/* Orbiting dot */}
            <div style={{
              position: 'absolute',
              width: 4, height: 4,
              borderRadius: '50%',
              background: 'rgba(107,29,42,0.35)',
              top: -2, left: '50%',
              transform: 'translateX(-50%)',
            }} />
          </div>

          {/* Inner counter-orbit */}
          <div style={{
            position: 'absolute',
            width: 52, height: 52,
            borderRadius: '50%',
            border: '1px dashed rgba(107,29,42,0.07)',
            top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            animation: 'rotateSlowReverse 12s linear infinite',
          }}>
            <div style={{
              position: 'absolute',
              width: 3, height: 3,
              borderRadius: '50%',
              background: 'rgba(91,122,94,0.45)',
              bottom: -1.5, left: '50%',
              transform: 'translateX(-50%)',
            }} />
          </div>

          {/* Core logo box */}
          <div
            className="ink-reveal"
            style={{
              animationDelay: '0.2s',
              position: 'absolute',
              width: 56, height: 56,
              top: 0, left: 0,
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(107,29,42,0.06)',
              border: '1px solid rgba(107,29,42,0.10)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <span className="font-serif text-2xl font-bold" style={{ color: 'rgba(107,29,42,0.75)' }}>C</span>
          </div>
        </motion.div>

        {/* Wordmark */}
        <div
          className="ink-reveal text-center mb-3"
          style={{ animationDelay: '0.45s' }}
        >
          <h1
            className="font-serif leading-none font-bold tracking-tight"
            style={{ fontSize: '4rem', color: '#6B1D2A' }}
          >
            CuraLink
          </h1>
        </div>

        {/* Taglines */}
        <div
          className="ink-reveal text-center mb-1"
          style={{ animationDelay: '0.65s' }}
        >
          <p className="font-serif text-lg italic" style={{ color: 'rgba(107,29,42,0.45)' }}>
            Research-grade evidence, curated for your condition.
          </p>
        </div>

        <div
          className="ink-reveal text-center mb-10"
          style={{ animationDelay: '0.8s' }}
        >
          <p className="text-xs font-sans tracking-wide" style={{ color: 'rgba(26,26,26,0.28)' }}>
            Bridging the gap between academic depth and patient experience.
          </p>
        </div>

        {/* Main card */}
        <div
          className="ink-reveal w-full max-w-md"
          style={{ animationDelay: '0.95s' }}
        >
          <div
            className="rounded-[16px] p-8"
            style={{
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(28px)',
              boxShadow: '0 20px 50px -12px rgba(107,29,42,0.10), 0 0 0 1px rgba(255,255,255,0.8)',
              border: '1px solid rgba(255,255,255,0.9)',
            }}
          >
            <div className="flex items-center gap-3 mb-7">
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(107,29,42,0.18), transparent)' }} />
              <span className="text-[9px] font-mono uppercase tracking-[0.25em] font-medium" style={{ color: 'rgba(107,29,42,0.35)' }}>
                Clinical Context
              </span>
              <div className="h-px flex-1" style={{ background: 'linear-gradient(270deg, rgba(107,29,42,0.18), transparent)' }} />
            </div>

            {/* Condition */}
            <div className="mb-5">
              <label className="flex items-baseline gap-1.5 mb-2">
                <span className="text-[13px] font-serif italic font-medium" style={{ color: '#6B1D2A' }}>Condition</span>
                <span className="text-xs" style={{ color: '#6B1D2A' }}>*</span>
              </label>
              <input
                type="text"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStartResearch()}
                placeholder="e.g. Parkinson's disease, Lung Cancer"
                className="w-full px-4 py-3 rounded-xl text-sm font-sans transition-all duration-300"
                style={{ background: 'rgba(255,253,247,0.8)', border: '1px solid rgba(107,29,42,0.08)', color: '#1a1a1a', outline: 'none' }}
                onFocus={e => { e.target.style.boxShadow = '0 0 0 3px rgba(107,29,42,0.10)'; e.target.style.borderColor = 'rgba(107,29,42,0.22)'; e.target.style.background = '#fff'; }}
                onBlur={e => { e.target.style.boxShadow = 'none'; e.target.style.borderColor = 'rgba(107,29,42,0.08)'; e.target.style.background = 'rgba(255,253,247,0.8)'; }}
              />
            </div>

            {/* Location */}
            <div className="mb-5">
              <label className="flex items-baseline gap-2 mb-2">
                <span className="text-[13px] font-serif italic font-medium" style={{ color: '#6B1D2A' }}>Location</span>
                <span className="text-[9px] font-mono tracking-wide" style={{ color: 'rgba(107,29,42,0.4)' }}>(for trial matching)</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Toronto, Canada"
                className="w-full px-4 py-3 rounded-xl text-sm font-sans transition-all duration-300"
                style={{ background: 'rgba(255,253,247,0.8)', border: '1px solid rgba(107,29,42,0.08)', color: '#1a1a1a', outline: 'none' }}
                onFocus={e => { e.target.style.boxShadow = '0 0 0 3px rgba(107,29,42,0.10)'; e.target.style.borderColor = 'rgba(107,29,42,0.22)'; e.target.style.background = '#fff'; }}
                onBlur={e => { e.target.style.boxShadow = 'none'; e.target.style.borderColor = 'rgba(107,29,42,0.08)'; e.target.style.background = 'rgba(255,253,247,0.8)'; }}
              />
            </div>

            {/* Medications */}
            <div className="mb-7">
              <label className="flex items-baseline gap-2 mb-2">
                <span className="text-[13px] font-serif italic font-medium" style={{ color: '#6B1D2A' }}>Medications</span>
                <span className="text-[9px] font-mono tracking-wide" style={{ color: 'rgba(107,29,42,0.4)' }}>(press Enter to add)</span>
              </label>
              <AnimatePresence>
                {medications.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-wrap gap-1.5 mb-2 overflow-hidden"
                  >
                    {medications.map((med, idx) => (
                      <motion.span
                        key={med + idx}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-sans rounded-full"
                        style={{ background: 'rgba(91,122,94,0.09)', color: '#5B7A5E', border: '1px solid rgba(91,122,94,0.18)' }}
                      >
                        {med}
                        <button
                          onClick={() => setMedications(medications.filter((_, i) => i !== idx))}
                          style={{ color: 'rgba(91,122,94,0.5)', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px' }}
                        >×</button>
                      </motion.span>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              <input
                type="text"
                value={medInput}
                onChange={(e) => setMedInput(e.target.value)}
                onKeyDown={handleAddMedication}
                placeholder="+ Add medication"
                className="w-full px-4 py-3 rounded-xl text-sm font-sans transition-all duration-300"
                style={{ background: 'rgba(255,253,247,0.8)', border: '1px solid rgba(107,29,42,0.08)', color: '#1a1a1a', outline: 'none' }}
                onFocus={e => { e.target.style.boxShadow = '0 0 0 3px rgba(107,29,42,0.10)'; e.target.style.borderColor = 'rgba(107,29,42,0.22)'; e.target.style.background = '#fff'; }}
                onBlur={e => { e.target.style.boxShadow = 'none'; e.target.style.borderColor = 'rgba(107,29,42,0.08)'; e.target.style.background = 'rgba(255,253,247,0.8)'; }}
              />
            </div>

            {/* CTA */}
            <motion.button
              whileHover={condition.trim() ? { scale: 1.02, boxShadow: '0 16px 36px rgba(107,29,42,0.30)' } : undefined}
              whileTap={condition.trim() ? { scale: 0.98 } : undefined}
              onClick={handleStartResearch}
              disabled={!condition.trim()}
              className="w-full py-3.5 rounded-xl font-sans font-medium text-sm tracking-wide transition-all duration-300"
              style={{
                background: condition.trim() ? 'linear-gradient(135deg, #6B1D2A 0%, #8B2E3D 100%)' : 'rgba(107,29,42,0.15)',
                color: condition.trim() ? 'white' : 'rgba(107,29,42,0.35)',
                boxShadow: condition.trim() ? '0 8px 24px rgba(107,29,42,0.25)' : 'none',
                cursor: condition.trim() ? 'pointer' : 'not-allowed',
                border: 'none',
              }}
            >
              Start Research →
            </motion.button>
          </div>
        </div>

        {/* Divider */}
        <div
          className="ink-reveal flex items-center gap-4 my-8 w-full max-w-md"
          style={{ animationDelay: '1.1s' }}
        >
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(107,29,42,0.1), transparent)' }} />
          <span className="text-[8px] font-mono uppercase tracking-[0.3em]" style={{ color: 'rgba(26,26,26,0.18)' }}>or ask directly</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(107,29,42,0.1), transparent)' }} />
        </div>

        {/* Spotlight */}
        <div
          className="ink-reveal w-full max-w-md mb-8"
          style={{ animationDelay: '1.2s' }}
        >
          <form onSubmit={handleSpotlightSubmit}>
            <div
              className="relative rounded-2xl transition-all duration-500"
              style={{
                background: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(16px)',
                border: isFocused ? '1px solid rgba(107,29,42,0.16)' : '1px solid rgba(255,255,255,0.8)',
                boxShadow: isFocused ? '0 8px 32px rgba(107,29,42,0.12), 0 0 0 3px rgba(107,29,42,0.06)' : '0 4px 16px rgba(0,0,0,0.05)',
              }}
            >
              <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'rgba(107,29,42,0.45)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                </svg>
              </span>
              <input
                type="text"
                value={spotlightQuery}
                onChange={(e) => setSpotlightQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder='"Latest treatment for lung cancer"'
                className="w-full pr-14 pl-11 py-4 rounded-2xl bg-transparent text-sm font-sans italic"
                style={{ color: '#1a1a1a', outline: 'none' }}
              />
              <AnimatePresence>
                {spotlightQuery.trim() && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    type="submit"
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg flex items-center justify-center text-white"
                    style={{ background: 'linear-gradient(135deg, #6B1D2A, #8B2E3D)', boxShadow: '0 4px 12px rgba(107,29,42,0.28)', border: 'none', cursor: 'pointer', fontSize: '16px' }}
                  >→</motion.button>
                )}
              </AnimatePresence>
            </div>
          </form>
        </div>

        {/* Source badges */}
        <div
          className="ink-reveal flex items-center justify-center gap-6 mb-8"
          style={{ animationDelay: '1.3s' }}
        >
          {[
            { name: 'PubMed', color: '#3B82F6' },
            { name: 'OpenAlex', color: '#22C55E' },
            { name: 'ClinicalTrials.gov', color: '#F59E0B' },
          ].map((source) => (
            <div key={source.name} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: source.color, opacity: 0.45 }} />
              <span className="text-[10px] font-mono tracking-wide" style={{ color: 'rgba(26,26,26,0.22)' }}>{source.name}</span>
            </div>
          ))}
        </div>

        {/* Quick starts */}
        <div
          className="ink-reveal flex flex-wrap justify-center gap-2 mb-12"
          style={{ animationDelay: '1.4s' }}
        >
          {quickStarts.map((q, idx) => (
            <motion.button
              key={q.query}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5 + idx * 0.08 }}
              whileHover={{ y: -2, boxShadow: '0 10px 24px -12px rgba(107,29,42,0.18)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setContext({ condition: q.query }); navigate('/research'); }}
              className="px-4 py-2 text-[11px] font-sans rounded-full transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(107,29,42,0.09)', color: 'rgba(107,29,42,0.65)', cursor: 'pointer' }}
              onMouseOver={e => { e.currentTarget.style.color = '#6B1D2A'; e.currentTarget.style.borderColor = 'rgba(107,29,42,0.20)'; e.currentTarget.style.background = 'rgba(255,255,255,0.95)'; }}
              onMouseOut={e => { e.currentTarget.style.color = 'rgba(107,29,42,0.65)'; e.currentTarget.style.borderColor = 'rgba(107,29,42,0.09)'; e.currentTarget.style.background = 'rgba(255,255,255,0.75)'; }}
            >
              {q.label}
            </motion.button>
          ))}
        </div>

        {/* Footer */}
        <div
          className="ink-reveal text-center"
          style={{ animationDelay: '1.5s' }}
        >
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-px w-12" style={{ background: 'linear-gradient(90deg, transparent, rgba(107,29,42,0.10))' }} />
            <span className="text-[8px] font-mono uppercase tracking-[0.3em] font-medium" style={{ color: 'rgba(107,29,42,0.18)' }}>Intelligent Medical Curation</span>
            <div className="h-px w-12" style={{ background: 'linear-gradient(270deg, transparent, rgba(107,29,42,0.10))' }} />
          </div>
          <p className="text-[10px] font-sans max-w-sm mx-auto leading-relaxed" style={{ color: 'rgba(26,26,26,0.18)' }}>
            Synthesizing peer-reviewed research across 40M+ publications.<br />
            Personalized, evidence-backed, source-verified.
          </p>
        </div>

      </div>
    </div>
  );
}