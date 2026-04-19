import { useResearchStore } from '@/state/store';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, FormEvent, useRef } from 'react';
import { ViewMode, CitationId, Paper, Trial, ConfidenceLevel } from '@/state/types';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence, useMotionValue, useTransform, animate, useReducedMotion } from 'framer-motion';

// ============================================
// Citation display number mapping
// ============================================
function getCitationDisplayMap(papers: Paper[], trials: Trial[]): Map<CitationId, number> {
  const map = new Map<CitationId, number>();
  let counter = 1;
  papers.forEach((p) => map.set(p.citationId, counter++));
  trials.forEach((t) => map.set(t.citationId, counter++));
  return map;
}

// ============================================
// Animated Counter Component
// ============================================
function AnimatedCounter({ target, duration = 1.2, reduceMotion = false }: { target: number; duration?: number; reduceMotion?: boolean }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(target);
      count.set(target);
      return;
    }
    const controls = animate(count, target, { duration, ease: 'easeOut' });
    const unsubscribe = rounded.on('change', (v) => setDisplay(v));
    return () => { controls.stop(); unsubscribe(); };
  }, [target, count, rounded, duration, reduceMotion]);

  return <span>{display}</span>;
}

// ============================================
// Retrieval Ribbon
// ============================================
function RetrievalRibbon({ stats }: {
  stats: {
    pubmedCount: number; openalexCount: number; trialsCount: number;
    poolTotal: number; shownPapers: number; shownTrials: number; timeSeconds: number;
  }
}) {
  const reduceMotion = useReducedMotion() ?? false;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="px-6 py-2.5 bg-parchment-50 border-b border-parchment-200/60"
    >
      <div className="max-w-5xl mx-auto flex items-center justify-center gap-1 text-[11px] font-mono text-muted-foreground/70">
        <span className="text-blue-500/70">PubMed</span>{' '}
        <span className="text-foreground/60 font-semibold"><AnimatedCounter target={stats.pubmedCount} reduceMotion={reduceMotion} /></span>
        <span className="mx-1.5 text-parchment-200">·</span>
        <span className="text-green-600/70">OpenAlex</span>{' '}
        <span className="text-foreground/60 font-semibold"><AnimatedCounter target={stats.openalexCount} reduceMotion={reduceMotion} /></span>
        <span className="mx-1.5 text-parchment-200">·</span>
        <span className="text-amber-600/70">Trials</span>{' '}
        <span className="text-foreground/60 font-semibold"><AnimatedCounter target={stats.trialsCount} reduceMotion={reduceMotion} /></span>
        <span className="mx-3 text-parchment-200">│</span>
        <span>Pool <span className="text-foreground/60 font-semibold"><AnimatedCounter target={stats.poolTotal} reduceMotion={reduceMotion} /></span></span>
        <span className="mx-1">→</span>
        <span>Shown <span className="text-foreground/60 font-semibold">{stats.shownPapers}</span> papers · <span className="text-foreground/60 font-semibold">{stats.shownTrials}</span> trials</span>
        <span className="mx-3 text-parchment-200">│</span>
        <span>{stats.timeSeconds}s</span>
      </div>
    </motion.div>
  );
}

// ============================================
// Citation Constellation — with highlight sync
// ============================================
function CitationConstellation({
  condition, papers, trials, briefCitations, onSelect, highlightedId, onHover,
}: {
  condition: string; papers: Paper[]; trials: Trial[];
  briefCitations: Set<CitationId>; onSelect: (id: CitationId) => void;
  highlightedId: CitationId | null;
  onHover: (id: CitationId | null) => void;
}) {
  const center = { x: 180, y: 180 };
  const sourceItems = [
    ...papers.map((paper, index) => ({
      id: paper.citationId as CitationId,
      label: paper.authors.split(',')[0] || `Paper ${index + 1}`,
      type: paper.source === 'pubmed' ? ('pubmed' as const) : ('openalex' as const),
    })),
    ...trials.map((trial, index) => ({
      id: trial.citationId as CitationId,
      label: `Trial ${index + 1}`,
      type: 'trial' as const,
    })),
  ];

  const nodes = [
    { id: 'query' as const, label: condition, x: center.x, y: center.y, type: 'query' as const },
    ...sourceItems.map((item, index) => {
      const total = sourceItems.length;
      const angle = (index / Math.max(1, total)) * Math.PI * 2 - Math.PI / 2;
      const radius = 110 + (index % 2) * 28 + Math.floor(index / 5) * 12;
      return {
        ...item,
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
      };
    }),
  ];

  const sourceNodes = nodes.filter((node) =>
    node.id !== 'query' &&
    node.x !== undefined &&
    node.y !== undefined
  ) as Array<{
    id: CitationId; label: string; x: number; y: number;
    type: 'pubmed' | 'openalex' | 'trial';
  }>;

  const paths = sourceNodes
    .filter((node) => briefCitations.has(node.id))
    .map((node) => {
      const midX = (center.x + node.x) / 2;
      const midY = (center.y + node.y) / 2;
      const dx = node.x - center.x;
      const dy = node.y - center.y;
      const cpX = midX - dy * 0.16;
      const cpY = midY + dx * 0.16;
      return {
        key: `path-${node.id}`,
        d: `M${center.x},${center.y} Q${cpX},${cpY} ${node.x},${node.y}`,
        isHighlighted: highlightedId === node.id,
      };
    });

  if (!paths.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65 }}
      className="rounded-3xl border border-parchment-200/70 bg-white/85 p-4 shadow-sm shadow-burgundy/5"
      style={{ background: 'radial-gradient(circle at center, rgba(255,253,247,0.95) 0%, rgba(255,245,224,0.55) 55%, rgba(255,255,255,0.88) 100%)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.32em] text-[rgba(107,29,42,0.5)]">Citation constellation</p>
          <p className="text-sm font-sans text-[#1a1a1a]">Evidence map for cited sources</p>
        </div>
      </div>
      <svg viewBox="0 0 360 360" className="w-full h-[280px] overflow-visible">
        <defs>
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="strongGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Connection paths — highlighted ones glow */}
        {paths.map((path) => (
          <motion.path
            key={path.key}
            d={path.d}
            fill="none"
            stroke={path.isHighlighted ? '#6B1D2A' : '#CBB49A'}
            strokeWidth={path.isHighlighted ? 1.8 : 1}
            opacity={path.isHighlighted ? 0.7 : 0.4}
            animate={{
              stroke: path.isHighlighted ? '#6B1D2A' : '#CBB49A',
              strokeWidth: path.isHighlighted ? 1.8 : 1,
              opacity: path.isHighlighted ? 0.7 : 0.4,
            }}
            transition={{ duration: 0.3 }}
            strokeDasharray={path.isHighlighted ? '4 2' : undefined}
          />
        ))}

        {nodes.map((node, idx) => {
          const isQuery = node.id === 'query';
          const isHighlighted = highlightedId === node.id;
          const fill = isQuery
            ? '#6B1D2A'
            : node.type === 'pubmed' ? '#2563EB'
            : node.type === 'openalex' ? '#047857'
            : '#B8860B';

          return (
            <motion.g
              key={String(node.id)}
              animate={{ y: [0, 2, 0], x: [0, 1, 0] }}
              transition={{ duration: 10 + idx * 0.4, repeat: Infinity, ease: 'easeInOut' }}
              onMouseEnter={() => !isQuery && onHover(node.id as CitationId)}
              onMouseLeave={() => onHover(null)}
            >
              {/* Highlight pulse ring — only when highlighted */}
              {isHighlighted && !isQuery && (
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r={16}
                  fill="none"
                  stroke={fill}
                  strokeWidth={1.5}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: [0.7, 1.3, 0.7], opacity: [0, 0.6, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}

              {isQuery && (
                <motion.circle
                  cx={node.x} cy={node.y} r={12}
                  fill={fill} opacity={1}
                  filter="url(#softGlow)"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}

              <motion.circle
                cx={node.x} cy={node.y}
                r={isQuery ? 8 : isHighlighted ? 9 : 7}
                fill={fill}
                filter={isHighlighted ? 'url(#strongGlow)' : 'url(#softGlow)'}
                animate={{
                  r: isQuery ? 8 : isHighlighted ? 9 : 7,
                  opacity: isHighlighted ? 1 : 0.85,
                }}
                transition={{ duration: 0.25 }}
                whileHover={{ scale: 1.15 }}
                style={{ cursor: isQuery ? 'default' : 'pointer' }}
                onClick={() => !isQuery && onSelect(node.id as CitationId)}
              />

              <text
                x={node.x}
                y={node.y + (isQuery ? 26 : 22)}
                textAnchor="middle"
                className="font-mono text-[11px]"
                fill={isHighlighted ? '#6B1D2A' : '#44403C'}
                opacity={isHighlighted ? 1 : 0.85}
                fontWeight={isHighlighted ? '600' : '400'}
              >
                {node.label}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </motion.div>
  );
}

// ============================================
// Ink Draw Bar — animates the left border
// ============================================
function InkDrawBar({ confidence, delay = 0 }: { confidence: ConfidenceLevel; delay?: number }) {
  const color = {
    strong: '#6B1D2A',
    moderate: '#D97706',
    emerging: '#9CA3AF',
  }[confidence];

  return (
    <div style={{
      position: 'absolute',
      left: 0, top: 0,
      width: 3,
      height: '100%',
      background: 'transparent',
      overflow: 'hidden',
    }}>
      <motion.div
        initial={{ height: '0%' }}
        animate={{ height: '100%' }}
        transition={{ duration: 0.9, delay, ease: [0.19, 1, 0.22, 1] }}
        style={{
          width: '100%',
          background: color,
          opacity: 0.45,
          transformOrigin: 'top',
        }}
      />
    </div>
  );
}

// ============================================
// Confidence Bar
// ============================================
function ConfidenceBar({ level }: { level: ConfidenceLevel }) {
  const config = {
    strong: { percent: 85, color: 'bg-burgundy/70', label: 'Strong Evidence' },
    moderate: { percent: 55, color: 'bg-amber-500/70', label: 'Moderate Evidence' },
    emerging: { percent: 30, color: 'bg-gray-400/60', label: 'Emerging' },
  };
  const c = config[level];
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex-1 h-[3px] bg-parchment-200/60 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${c.percent}%` }}
          transition={{ duration: 1.0, ease: 'easeOut', delay: 0.1 }}
          className={`h-full ${c.color} rounded-full`}
        />
      </div>
      <span className="text-[9px] font-mono text-[rgba(107,29,42,0.5)] uppercase tracking-wider whitespace-nowrap">
        {c.label}
      </span>
    </div>
  );
}

// ============================================
// Brief Section — with ink draw bar
// ============================================
function BriefSection({
  title, content, confidence, citations, displayMap,
  highlightedId, onHover, onClick, delay = 0,
}: {
  title: string; content: string; confidence: ConfidenceLevel;
  citations: CitationId[]; displayMap: Map<CitationId, number>;
  highlightedId: CitationId | null;
  onHover: (id: CitationId | null) => void;
  onClick: (id: CitationId, sentence?: string) => void;
  delay?: number;
}) {
  const renderContent = () => {
    if (!citations.length) return content;
    const sentences = content.split('. ');
    return sentences.map((sentence, idx) => {
      const citId = citations[idx];
      const displayNum = citId ? displayMap.get(citId) : undefined;
      const isHighlighted = citId && highlightedId === citId;
      const isLast = idx === sentences.length - 1;
      const text = isLast ? sentence : sentence + '.';
      const sentenceContent = displayNum && citId ? (
        <>
          {text}
          <sup
            className="text-burgundy/70 font-mono text-[9px] cursor-pointer hover:text-burgundy hover:bg-burgundy/10 rounded px-0.5 ml-0.5 transition-all duration-200"
            onMouseEnter={() => onHover(citId)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onClick(citId, text)}
          >
            {displayNum}
          </sup>
        </>
      ) : (<>{text}</>);

      return (
        <motion.span
          key={`s-${idx}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: idx === 0 ? 0.8 : 0.55,
            delay: delay + (idx === 0 ? 0.2 : 0.3 + idx * 0.06),
            ease: 'easeOut',
          }}
          className={isHighlighted
            ? 'bg-burgundy/8 rounded-sm px-0.5 transition-all duration-300 inline-block'
            : 'transition-all duration-300 inline-block'
          }
        >
          {sentenceContent}
          {!isLast && ' '}
        </motion.span>
      );
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(12px)', y: 12 }}
      animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
      transition={{ duration: 0.8, delay, ease: 'easeOut' }}
      style={{ position: 'relative', paddingLeft: '2rem', paddingRight: '1rem', marginBottom: '3rem' }}
    >
      {/* Ink draw bar replaces static border-l */}
      <InkDrawBar confidence={confidence} delay={delay + 0.1} />

      <ConfidenceBar level={confidence} />
      <motion.h2
        initial={{ opacity: 0, filter: 'blur(12px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, delay: delay + 0.1 }}
        className="font-serif text-xl font-semibold text-burgundy/90 mb-4 tracking-tight"
      >
        {title}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, filter: 'blur(6px)', y: 4 }}
        animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
        transition={{ duration: 0.9, delay: delay + 0.3, ease: [0.19, 1, 0.22, 1] }}
        className="font-serif text-[15px] text-[#1a1a1a] leading-[1.9] tracking-[0.01em]"
      >
        {renderContent()}
      </motion.p>
    </motion.div>
  );
}

// ============================================
// Gutter Callout
// ============================================
function GutterCallout({
  citationId, displayNum, paper, trial,
  isHighlighted, onHover, onClick, delay = 0,
}: {
  citationId: CitationId; displayNum: number;
  paper?: Paper; trial?: Trial;
  isHighlighted: boolean;
  onHover: (id: CitationId | null) => void;
  onClick: (id: CitationId) => void;
  delay?: number;
}) {
  const isPaper = citationId.startsWith('P');
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.55, delay, ease: 'easeOut' }}
      whileHover={{ y: -2, boxShadow: '0 18px 36px -22px rgba(107,29,42,0.18)' }}
      className={`p-3 rounded-xl cursor-pointer transition-all duration-300 mb-2 border ${
        isHighlighted
          ? 'bg-burgundy/[0.05] border-burgundy/20 shadow-sm shadow-burgundy/5'
          : 'bg-white/70 border-parchment-200/70 hover:border-burgundy/15 hover:bg-white/90'
      }`}
      onMouseEnter={() => onHover(citationId)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(citationId)}
    >
      <div className="flex items-start gap-2.5">
        <span className="text-[9px] font-mono font-bold text-burgundy/60 bg-burgundy/[0.06] rounded-md px-1.5 py-0.5 mt-0.5">
          {displayNum}
        </span>
        <div className="min-w-0 flex-1">
          {isPaper && paper && (
            <>
              <p className="text-[11px] font-sans font-medium text-foreground/80 leading-tight truncate">{paper.authors}</p>
              <p className="text-[9px] font-mono text-muted-foreground/50 mt-0.5">
                {paper.source === 'pubmed' ? 'PubMed' : 'OpenAlex'} · {paper.year}
              </p>
              <p className="text-[9px] font-sans text-muted-foreground/40 mt-1 line-clamp-2 leading-relaxed">{paper.snippet}</p>
            </>
          )}
          {!isPaper && trial && (
            <>
              <p className="text-[11px] font-sans font-medium text-foreground/80 leading-tight truncate">{trial.title}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-full ${
                  trial.status === 'RECRUITING' ? 'bg-green-50/80 text-green-600 border border-green-200/50' :
                  trial.status === 'COMPLETED' ? 'bg-blue-50/80 text-blue-600 border border-blue-200/50' :
                  'bg-gray-50 text-gray-500 border border-gray-200/50'
                }`}>
                  {trial.status}
                </span>
                <span className="text-[8px] font-mono text-muted-foreground/40">{trial.nctId}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// Trial Stamp — signature visual
// ============================================
function TrialStamp({ status, locationMatch }: {
  status: string;
  locationMatch?: string;
}) {
  const stampConfig: Record<string, { bg: string; border: string; text: string; dot: string; rotate: number }> = {
    RECRUITING: {
      bg: 'rgba(220,252,231,0.6)',
      border: 'rgba(34,197,94,0.45)',
      text: '#15803D',
      dot: '#22C55E',
      rotate: -1.5,
    },
    COMPLETED: {
      bg: 'rgba(219,234,254,0.6)',
      border: 'rgba(59,130,246,0.45)',
      text: '#1D4ED8',
      dot: '#3B82F6',
      rotate: 1.2,
    },
    ACTIVE: {
      bg: 'rgba(254,243,199,0.6)',
      border: 'rgba(245,158,11,0.45)',
      text: '#B45309',
      dot: '#F59E0B',
      rotate: -0.8,
    },
  };

  const config = stampConfig[status] || {
    bg: 'rgba(243,244,246,0.6)',
    border: 'rgba(156,163,175,0.45)',
    text: '#4B5563',
    dot: '#9CA3AF',
    rotate: 0,
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <motion.div
        initial={{ scale: 0.6, opacity: 0, rotate: config.rotate * 3 }}
        animate={{ scale: 1, opacity: 1, rotate: config.rotate }}
        transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1], type: 'spring', stiffness: 300, damping: 20 }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 10px',
          background: config.bg,
          border: `1.5px solid ${config.border}`,
          borderRadius: 4,
          transform: `rotate(${config.rotate}deg)`,
          boxShadow: `inset 0 0 0 1px ${config.border}, 0 1px 3px rgba(0,0,0,0.06)`,
        }}
      >
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: status === 'RECRUITING' ? [1, 0.5, 1] : 1 }}
          transition={{ duration: 1.8, repeat: status === 'RECRUITING' ? Infinity : 0, ease: 'easeInOut' }}
          style={{
            width: 6, height: 6,
            borderRadius: '50%',
            background: config.dot,
            flexShrink: 0,
          }}
        />
        <span style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: config.text,
          textTransform: 'uppercase',
        }}>
          {status}
        </span>
      </motion.div>

      {locationMatch && locationMatch !== 'none' && (
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.15, ease: [0.19, 1, 0.22, 1] }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            background: 'rgba(254,243,199,0.5)',
            border: '1.5px solid rgba(245,158,11,0.35)',
            borderRadius: 4,
            transform: 'rotate(0.5deg)',
          }}
        >
          <span style={{ fontSize: 9 }}>📍</span>
          <span style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.12em',
            color: '#92400E',
            textTransform: 'uppercase',
          }}>
            MATCH: {locationMatch.toUpperCase()}
          </span>
        </motion.div>
      )}
    </div>
  );
}

// ============================================
// Papers Ledger
// ============================================
function PapersLedger({ papers, onClickPaper }: { papers: Paper[]; onClickPaper: (id: CitationId) => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  return (
    <div>
      {papers.map((paper, idx) => (
        <motion.div
          key={paper.citationId}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.06 }}
          className="py-5 border-b border-parchment-200/40 last:border-0"
        >
          <div className="flex items-start gap-4">
            <span className="text-sm font-mono font-bold text-burgundy/40 mt-0.5 w-6 text-right">{idx + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${
                  paper.source === 'pubmed'
                    ? 'bg-blue-50/80 text-blue-600/80 border border-blue-200/40'
                    : 'bg-green-50/80 text-green-600/80 border border-green-200/40'
                }`}>
                  {paper.source === 'pubmed' ? 'PUBMED' : 'OPENALEX'}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/40">{paper.year}</span>
              </div>
              <h3
                className="font-serif text-[14px] font-semibold text-foreground/85 cursor-pointer hover:text-burgundy transition-colors duration-200 leading-snug"
                onClick={() => onClickPaper(paper.citationId)}
              >
                {paper.title}
              </h3>
              <p className="text-[11px] font-sans text-muted-foreground/50 mt-1">
                {paper.authors} · <span className="italic">{paper.journal}</span>
              </p>
              <button
                onClick={() => setExpandedId(expandedId === paper.citationId ? null : paper.citationId)}
                className="text-[10px] font-sans text-burgundy/60 mt-2 hover:text-burgundy transition-colors"
              >
                {expandedId === paper.citationId ? '▾ Hide' : '▸ Abstract'}
              </button>
              <AnimatePresence>
                {expandedId === paper.citationId && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <p className="text-[12px] font-sans text-muted-foreground/60 mt-2 p-4 bg-parchment-50/50 rounded-lg border border-parchment-200/40 leading-relaxed">
                      {paper.snippet}
                    </p>
                    <a href={paper.url} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] font-sans text-burgundy/60 hover:text-burgundy mt-1.5 inline-block transition-colors">
                      🔗 View source →
                    </a>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ============================================
// Trials Ledger — with stamp badges
// ============================================
function TrialsLedger({ trials, onClickTrial }: { trials: Trial[]; onClickTrial: (id: CitationId) => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  return (
    <div>
      {trials.map((trial, idx) => (
        <motion.div
          key={trial.citationId}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.07 }}
          className="py-6 border-b border-parchment-200/40 last:border-0"
        >
          <div className="flex items-start gap-4">
            <span className="text-sm font-mono font-bold text-burgundy/40 mt-1 w-6 text-right">{idx + 1}</span>
            <div className="flex-1 min-w-0">
              {/* Stamp badges */}
              <div className="mb-3">
                <TrialStamp
                  status={trial.status}
                  locationMatch={trial.locationMatch !== 'none' ? trial.locationMatch : undefined}
                />
              </div>

              <h3
                className="font-serif text-[14px] font-semibold text-foreground/85 cursor-pointer hover:text-burgundy transition-colors duration-200 leading-snug mb-1"
                onClick={() => onClickTrial(trial.citationId)}
              >
                {trial.title}
              </h3>
              <p className="text-[10px] font-mono text-muted-foreground/35">{trial.nctId}</p>
              {trial.locations[0] && (
                <p className="text-[11px] font-sans text-muted-foreground/45 mt-1">📍 {trial.locations[0]}</p>
              )}

              <button
                onClick={() => setExpandedId(expandedId === trial.citationId ? null : trial.citationId)}
                className="text-[10px] font-sans text-burgundy/60 mt-2 hover:text-burgundy transition-colors"
              >
                {expandedId === trial.citationId ? '▾ Hide' : '▸ Eligibility · Contact'}
              </button>
              <AnimatePresence>
                {expandedId === trial.citationId && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 p-4 bg-parchment-50/50 rounded-lg border border-parchment-200/40">
                      <p className="text-[11px] font-sans font-medium text-foreground/70 mb-1.5">Eligibility</p>
                      <ul className="text-[11px] font-sans text-muted-foreground/50 space-y-1">
                        {trial.eligibility.map((e, i) => <li key={i}>• {e}</li>)}
                      </ul>
                      {trial.contact && (
                        <div className="mt-3 pt-3 border-t border-parchment-200/30">
                          <p className="text-[11px] font-sans font-medium text-foreground/70">Contact</p>
                          <p className="text-[11px] font-sans text-muted-foreground/50">{trial.contact.name}</p>
                          <p className="text-[11px] font-sans text-burgundy/60">{trial.contact.email}</p>
                        </div>
                      )}
                      <a href={trial.url} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] font-sans text-burgundy/60 hover:text-burgundy mt-2 inline-block transition-colors">
                        🔗 ClinicalTrials.gov →
                      </a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ============================================
// Medical relevance guard
// ============================================
const MEDICAL_KEYWORDS = [
  'disease', 'disorder', 'syndrome', 'cancer', 'diabetes', 'tumor',
  'infection', 'therapy', 'treatment', 'parkinson', 'alzheimer', 'depression', 'anxiety',
  'heart', 'lung', 'brain', 'blood', 'pain', 'chronic', 'acute', 'symptoms',
];

const isMedicalCondition = (text: string): boolean => {
  const lower = text.toLowerCase();
  if (lower.length < 3) return false;
  return MEDICAL_KEYWORDS.some((k) => lower.includes(k)) || lower.split(' ').length >= 2;
};

// ============================================
// Main Component
// ============================================
export default function ResearchWorkspace() {
  const {
    context, viewMode, setViewMode, revisions, activeRevisionId,
    addRevision, setActiveRevision, setRevisions, appState, setAppState,
    drawerOpen, drawerCitationId, drawerSupportsClaim, openDrawer, closeDrawer,
    highlightedCitationId, setHighlightedCitation, sessionId, setSessionId,
  } = useResearchStore();
  const setContextStore = useResearchStore((s) => s.setContext);

  const navigate = useNavigate();
  const routerLocation = useLocation();
  const didAutoRunRef = useRef(false);
  const initialQuery = (routerLocation.state as any)?.initialQuery as string | undefined;
  const [queryInput, setQueryInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCondition, setEditCondition] = useState(context?.condition || '');
  const [editLocation, setEditLocation] = useState(context?.location || '');

  useEffect(() => {
    if (!context) navigate('/');
  }, [context, navigate]);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`${import.meta.env.VITE_API_URL}/api/sessions/${sessionId}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    })
      .then(r => r.json())
      .then(data => {
        if (!data.revisions || data.revisions.length === 0) {
          useResearchStore.getState().clearRevisions();
          return;
        }
        const restoredContext = data.revisions[0]?.context;
        if (!restoredContext) return;
        if (!isMedicalCondition(restoredContext.condition)) return;
        if (restoredContext.condition.toLowerCase() !== (context?.condition || '').toLowerCase()) return;
        setRevisions(data.revisions);
        setActiveRevision(data.revisions[data.revisions.length - 1].id);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (context) {
      setEditCondition(context.condition);
      setEditLocation(context.location || '');
    }
  }, [context]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        document.getElementById('query-bar')?.focus();
      }
      if (e.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeDrawer]);

  if (!context) return null;

  useEffect(() => {
    if (!context) return;
    if (didAutoRunRef.current) return;
    if (!initialQuery) return;

    didAutoRunRef.current = true;
    setQueryInput(initialQuery);
    runQuery(initialQuery);

    // clear state so refresh doesn't rerun
    navigate('/research', { replace: true, state: {} });
  }, [context, initialQuery]);

  const activeRevision = revisions.find((r) => r.id === activeRevisionId);
  const displayMap = activeRevision
    ? getCitationDisplayMap(activeRevision.papers, activeRevision.trials)
    : new Map<CitationId, number>();
  const briefCitations = activeRevision
    ? new Set<CitationId>([
        ...activeRevision.brief.conditionOverview.citations,
        ...activeRevision.brief.researchInsights.citations,
        ...activeRevision.brief.clinicalTrialsSummary.citations,
      ])
    : new Set<CitationId>();

  const runQuery = async (q: string, overrideCondition?: string) => {
    
    const conditionToCheck = overrideCondition || context?.condition || '';
    console.log('condition check:', conditionToCheck, isMedicalCondition(conditionToCheck));
    if (!isMedicalCondition(conditionToCheck)) {
      setAppState('no_results');
      return;
    }
    setAppState('running');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/research/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, query: q, context: { ...context, condition: conditionToCheck } }),
      });
      if (!res.ok) {
        if (res.status === 400) {
          const err = await res.json();
          if (err.error === 'invalid_condition') {
            setAppState('no_results');
            return;
          }
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setSessionId(data.sessionId);
      addRevision(data.revision);
      setActiveRevision(data.revision.id);
      setViewMode('brief');
      setQueryInput('');
    } catch (error) {
      console.error('Error submitting query:', error);
      setAppState('context_set');
    }
  };

  const handleSubmitQuery = async (e: FormEvent) => {
    e.preventDefault();
    const q = queryInput.trim();
    if (!q) return;
    await runQuery(q);
  };

  const drawerPaper = activeRevision?.papers.find((p) => p.citationId === drawerCitationId);
  const drawerTrial = activeRevision?.trials.find((t) => t.citationId === drawerCitationId);

  return (
    <div className="min-h-screen bg-parchment-50 pb-16">

      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b border-parchment-200/50 px-6 py-3"
        style={{ background: 'rgba(255,253,247,0.8)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <h1 className="font-serif text-lg font-bold text-burgundy/90 cursor-pointer tracking-tight" onClick={() => navigate('/')}>
              Cura<span className="text-burgundy-light">Link</span>
            </h1>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 text-[10px] font-sans bg-burgundy/[0.06] text-burgundy/70 rounded-full border border-burgundy/10">
                {context.condition}
              </span>
              {context.location && (
                <span className="px-3 py-1 text-[10px] font-sans bg-parchment-200/50 text-muted-foreground/60 rounded-full border border-parchment-200/60">
                  📍 {context.location}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <button type="button" className="px-3 py-1.5 text-[11px] font-sans font-medium text-burgundy/70 bg-parchment-100 rounded-full border border-burgundy/10 hover:bg-burgundy/5 transition-all">
                  Edit
                </button>
              </DialogTrigger>
              <DialogContent className="bg-parchment-50 border border-parchment-200/70 shadow-xl shadow-burgundy/10">
                <DialogHeader>
                  <DialogTitle className="text-base text-burgundy/90">Edit research context</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <label className="block text-[11px] font-sans uppercase tracking-[0.24em] text-muted-foreground/70">Condition</label>
                  <input
                    value={editCondition}
                    onChange={(e) => setEditCondition(e.target.value)}
                    className="w-full rounded-xl border border-parchment-200/80 bg-white/80 px-4 py-3 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-burgundy/20"
                  />
                  <label className="block text-[11px] font-sans uppercase tracking-[0.24em] text-muted-foreground/70">Location</label>
                  <input
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full rounded-xl border border-parchment-200/80 bg-white/80 px-4 py-3 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-burgundy/20"
                  />
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setDialogOpen(false)}
                      className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                      Cancel
                    </button>
                    <button type="button"
                      onClick={() => {
                        if (!editCondition.trim()) return;
                        setContextStore({
                          condition: editCondition.trim(),
                          location: editLocation.trim() || undefined,
                          medications: context?.medications,
                        });
                        setDialogOpen(false);
                        if (revisions.length) setAppState('complete');
                      }}
                      className="px-4 py-2 text-[11px] font-medium text-white rounded-full bg-burgundy hover:bg-burgundy-dark transition-colors">
                      Save
                    </button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Query Bar */}
      <div className="px-6 py-4">
        <form onSubmit={handleSubmitQuery} className="relative max-w-3xl mx-auto">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B1D2A]/45 text-sm">⌕</span>
          <input
            id="query-bar"
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Ask anything about your condition..."
            className="w-full pl-10 pr-16 py-3 rounded-xl border border-parchment-200/60 bg-white/90 backdrop-blur-sm text-sm font-sans text-[#1a1a1a] placeholder:text-[rgba(0,0,0,0.35)] focus:outline-none focus:ring-2 focus:ring-burgundy/15 focus:border-burgundy/30 focus:bg-white transition-all duration-300"
          />
          {queryInput.trim() && (
            <button type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg bg-[#6B1D2A] text-white shadow-md shadow-[#6B1D2A]/20 hover:bg-[#8B2E3D] transition-colors">
              →
            </button>
          )}
          {appState === 'running' && (
            <span className="absolute right-12 top-1/2 -translate-y-1/2 text-[10px] font-mono text-burgundy/50 animate-pulse">
              Synthesizing...
            </span>
          )}
        </form>
      </div>

      {/* Retrieval Ribbon */}
      {activeRevision && <RetrievalRibbon stats={activeRevision.retrieval} />}

      {/* Constellation */}
      {activeRevision && activeRevision.papers.length + activeRevision.trials.length > 0 && (
        <div className="px-6 pt-4 max-w-7xl mx-auto">
          <CitationConstellation
            condition={context.condition}
            papers={activeRevision.papers}
            trials={activeRevision.trials}
            briefCitations={briefCitations}
            onSelect={openDrawer}
            highlightedId={highlightedCitationId}
            onHover={setHighlightedCitation}
          />
        </div>
      )}

      {/* Main Layout */}
      <div className="px-6 py-8 max-w-7xl mx-auto flex flex-col gap-8 xl:flex-row">
        <main className="flex-1 min-w-0">
          {!activeRevision || appState === 'no_results' || appState === 'running' ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
              {appState === 'no_results' ? (
                <>
                  <p className="font-serif text-xl text-burgundy/60 mb-3">
                    No medical research database found for "{context?.condition}"
                  </p>
                  <p className="text-sm font-sans text-muted-foreground/50 mb-8">
                    Try one of these instead:
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {["Parkinson's disease", "Lung cancer", "Diabetes", "Alzheimer's disease"].map((s) => (
                      <button key={s} onClick={() => {
                        setContextStore({ condition: s, location: context?.location, medications: context?.medications });
                        runQuery(s, s);
                      }}
                        className="px-4 py-2 text-[11px] font-sans text-burgundy/70 bg-white border border-burgundy/10 rounded-full hover:bg-burgundy/5 transition-all">
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="inline-block mb-6">
                    <div className="w-16 h-16 rounded-full bg-burgundy/[0.04] border border-burgundy/10 flex items-center justify-center mx-auto">
                      <span className="text-2xl">⌕</span>
                    </div>
                  </div>
                  <p className="font-serif text-xl text-[#6B1D2A] mb-2">How shall we begin?</p>
                  <p className="text-sm font-sans text-[#1a1a1a] mb-8 max-w-md mx-auto">
                    Ask a research question about <span className="text-[#6B1D2A] font-medium">{context.condition}</span> to generate an evidence synthesis.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      `Latest treatment options for ${context.condition}`,
                      `Active clinical trials${context.location ? ` near ${context.location}` : ''}`,
                      `Recent breakthroughs in ${context.condition}`,
                    ].map((q) => (
                      <button key={q}
                        onClick={() => { setQueryInput(q); document.getElementById('query-bar')?.focus(); }}
                        className="px-3.5 py-2 text-[11px] font-sans text-[#6B1D2A] bg-white/80 border border-burgundy/10 rounded-full hover:bg-burgundy/[0.08] hover:text-[#6B1D2A] transition-all duration-300">
                        {q}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            <div>
              {viewMode === 'brief' && (
                <motion.div key={activeRevisionId} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <BriefSection
                    title={activeRevision.brief.conditionOverview.title}
                    content={activeRevision.brief.conditionOverview.content}
                    confidence={activeRevision.brief.conditionOverview.confidence}
                    citations={activeRevision.brief.conditionOverview.citations}
                    displayMap={displayMap} highlightedId={highlightedCitationId}
                    onHover={setHighlightedCitation} onClick={openDrawer} delay={0}
                  />
                  <BriefSection
                    title={activeRevision.brief.researchInsights.title}
                    content={activeRevision.brief.researchInsights.content}
                    confidence={activeRevision.brief.researchInsights.confidence}
                    citations={activeRevision.brief.researchInsights.citations}
                    displayMap={displayMap} highlightedId={highlightedCitationId}
                    onHover={setHighlightedCitation} onClick={openDrawer} delay={0.25}
                  />
                  <BriefSection
                    title={activeRevision.brief.clinicalTrialsSummary.title}
                    content={activeRevision.brief.clinicalTrialsSummary.content}
                    confidence={activeRevision.brief.clinicalTrialsSummary.confidence}
                    citations={activeRevision.brief.clinicalTrialsSummary.citations}
                    displayMap={displayMap} highlightedId={highlightedCitationId}
                    onHover={setHighlightedCitation} onClick={openDrawer} delay={0.5}
                  />
                </motion.div>
              )}
              {viewMode === 'papers' && <PapersLedger papers={activeRevision.papers} onClickPaper={openDrawer} />}
              {viewMode === 'trials' && <TrialsLedger trials={activeRevision.trials} onClickTrial={openDrawer} />}
            </div>
          )}
        </main>

        {/* Gutter */}
        <aside className="w-64 shrink-0 hidden lg:block">
          {activeRevision && appState !== 'no_results' && viewMode === 'brief' ? (
            <div className="sticky top-20">
              <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/30 mb-3">Sources</p>
              {[...activeRevision.papers, ...activeRevision.trials].map((item, idx) => {
                const citId = item.citationId;
                const displayNum = displayMap.get(citId as CitationId) || idx + 1;
                const isPaper = citId.startsWith('P');
                return (
                  <GutterCallout key={citId} citationId={citId as CitationId} displayNum={displayNum}
                    paper={isPaper ? (item as Paper) : undefined}
                    trial={!isPaper ? (item as Trial) : undefined}
                    isHighlighted={highlightedCitationId === citId}
                    onHover={setHighlightedCitation} onClick={openDrawer} delay={0.05 * idx}
                  />
                );
              })}
            </div>
          ) : !activeRevision ? (
            <div className="text-center py-12">
              <p className="text-[10px] font-sans text-muted-foreground/30">Sources will appear here</p>
            </div>
          ) : null}
        </aside>
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-parchment-200/50 px-6 py-3 z-50"
        style={{ background: 'rgba(255,253,247,0.8)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {revisions.length === 0 ? (
              <span className="px-3 py-1.5 text-[10px] font-mono text-muted-foreground/30">No revisions</span>
            ) : (
              <Tabs value={activeRevisionId || revisions[0]?.id} onValueChange={(value) => setActiveRevision(value)}>
                <TabsList className="bg-parchment-100/90 p-[3px] rounded-full border border-parchment-200/80">
                  {revisions.map((rev, idx) => (
                    <TabsTrigger key={rev.id} value={rev.id} className="px-3 py-1.5 text-[10px] font-mono rounded-full">
                      R{idx + 1}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto">
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
              <TabsList className="bg-parchment-100/90 p-[3px] rounded-full border border-parchment-200/80">
                {(['brief', 'papers', 'trials'] as ViewMode[]).map((mode) => (
                  <TabsTrigger key={mode} value={mode} className="px-3.5 py-1.5 text-[11px] font-sans rounded-full">
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    {activeRevision && mode === 'papers' ? ` (${activeRevision.papers.length})` : ''}
                    {activeRevision && mode === 'trials' ? ` (${activeRevision.trials.length})` : ''}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Trace Drawer */}
      <Sheet open={drawerOpen} onOpenChange={(open) => !open && closeDrawer()}>
        <SheetContent side="right" className="w-[380px] bg-parchment-50 border-l border-parchment-200/50 overflow-y-auto">
          {drawerPaper && (
            <div className="pt-8 px-1">
              <span className={`text-[9px] font-mono px-2.5 py-1 rounded-full ${
                drawerPaper.source === 'pubmed'
                  ? 'bg-blue-50/80 text-blue-600/80 border border-blue-200/40'
                  : 'bg-green-50/80 text-green-600/80 border border-green-200/40'
              }`}>
                {drawerPaper.source === 'pubmed' ? 'PUBMED' : 'OPENALEX'}
              </span>
              <h3 className="font-serif text-lg font-semibold text-foreground/90 mt-4 leading-snug">{drawerPaper.title}</h3>
              <p className="text-[12px] font-sans text-muted-foreground/50 mt-2">{drawerPaper.authors} · {drawerPaper.year}</p>
              <p className="text-[12px] font-sans text-muted-foreground/40 italic">{drawerPaper.journal}</p>
              <a href={drawerPaper.url} target="_blank" rel="noopener noreferrer"
                className="inline-block mt-4 px-4 py-2 text-[11px] font-sans bg-burgundy/90 text-white rounded-lg hover:bg-burgundy transition-colors shadow-sm shadow-burgundy/20">
                View on {drawerPaper.source === 'pubmed' ? 'PubMed' : 'OpenAlex'} →
              </a>
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-parchment-200/50" />
                  <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/30">Snippet</span>
                  <div className="h-px flex-1 bg-parchment-200/50" />
                </div>
                <p className="text-[13px] font-sans text-muted-foreground/60 leading-relaxed p-4 bg-white/50 rounded-lg border border-parchment-200/40">
                  {drawerPaper.snippet}
                </p>
              </div>
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-parchment-200/50" />
                  <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/30">Supports Claim</span>
                  <div className="h-px flex-1 bg-parchment-200/50" />
                </div>
                <p className="text-[13px] font-serif italic text-muted-foreground/50 p-4 bg-burgundy/[0.03] rounded-lg border border-burgundy/[0.08]">
                  "{drawerSupportsClaim || `Referenced in the research brief for ${context?.condition}`}"
                </p>
              </div>
              {drawerPaper.relevanceScore !== undefined && (
                <Accordion type="single" collapsible className="mt-6">
                  <AccordionItem value="scores" className="border-parchment-200/40">
                    <AccordionTrigger className="text-[11px] font-sans text-muted-foreground/50 hover:text-foreground/60">
                      Ranking Scores
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2.5 font-mono text-[11px] text-muted-foreground/50 py-2">
                        <div className="flex justify-between items-center">
                          <span>Relevance</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1 bg-parchment-200/50 rounded-full overflow-hidden">
                              <div className="h-full bg-burgundy/50 rounded-full" style={{ width: `${(drawerPaper.relevanceScore || 0) * 100}%` }} />
                            </div>
                            <span>{drawerPaper.relevanceScore?.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Recency</span>
                          <span className="text-green-600/60">+{drawerPaper.recencyBoost?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Credibility</span>
                          <span className="text-blue-600/60">+{drawerPaper.credibilityBoost?.toFixed(2)}</span>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </div>
          )}

          {drawerTrial && (
            <div className="pt-8 px-1">
              <div className="mb-4">
                <TrialStamp
                  status={drawerTrial.status}
                  locationMatch={drawerTrial.locationMatch !== 'none' ? drawerTrial.locationMatch : undefined}
                />
              </div>
              <h3 className="font-serif text-lg font-semibold text-foreground/90 mt-4 leading-snug">{drawerTrial.title}</h3>
              <p className="text-[11px] font-mono text-muted-foreground/35 mt-1">{drawerTrial.nctId}</p>
              <a href={drawerTrial.url} target="_blank" rel="noopener noreferrer"
                className="inline-block mt-4 px-4 py-2 text-[11px] font-sans bg-burgundy/90 text-white rounded-lg hover:bg-burgundy transition-colors shadow-sm shadow-burgundy/20">
                View on ClinicalTrials.gov →
              </a>
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-parchment-200/50" />
                  <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/30">Locations</span>
                  <div className="h-px flex-1 bg-parchment-200/50" />
                </div>
                {drawerTrial.locations.map((loc, i) => (
                  <p key={i} className="text-[13px] font-sans text-muted-foreground/60 py-1">📍 {loc}</p>
                ))}
              </div>
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-parchment-200/50" />
                  <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/30">Eligibility</span>
                  <div className="h-px flex-1 bg-parchment-200/50" />
                </div>
                <ul className="space-y-1.5">
                  {drawerTrial.eligibility.map((e, i) => (
                    <li key={i} className="text-[13px] font-sans text-muted-foreground/60">• {e}</li>
                  ))}
                </ul>
              </div>
              {drawerTrial.contact && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-parchment-200/50" />
                    <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/30">Contact</span>
                    <div className="h-px flex-1 bg-parchment-200/50" />
                  </div>
                  <p className="text-[13px] font-sans text-foreground/70">{drawerTrial.contact.name}</p>
                  <p className="text-[13px] font-sans text-burgundy/60">{drawerTrial.contact.email}</p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}