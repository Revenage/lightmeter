import { useRef, useEffect, useCallback } from "react";

const ITEM_WIDTH = 64;
const DIAL_HEIGHT = 78;

// ── Tiny click sound via Web Audio API ──────────────────────────────────────
function playClick() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(900, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.025);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
    osc.onended = () => ctx.close();
  } catch {
    // AudioContext unavailable
  }
}

// ── Gentle haptic via Vibration API ─────────────────────────────────────────
function vibrateTick() {
  if ("vibrate" in navigator) {
    navigator.vibrate(6); // 6ms — barely perceptible
  }
}

interface DialWheelProps {
  values: string[];
  activeIndex: number;
  onChange: (index: number) => void;
  label: string;
  isAuto?: boolean;
  minIndex?: number;
  maxIndex?: number;
  getItemStyle?: (val: string, index: number) => { color?: string; opacity?: number } | undefined;
  "data-testid"?: string;
}

// Number of tick marks to render across the dial width
const TICK_COUNT = 52;

export function DialWheel({
  values,
  activeIndex,
  onChange,
  label,
  isAuto,
  minIndex = 0,
  maxIndex,
  getItemStyle,
  "data-testid": testId,
}: DialWheelProps) {
  const hi = maxIndex ?? values.length - 1;
  const stripRef = useRef<HTMLDivElement>(null);
  const ticksRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startIndex = useRef(activeIndex);
  const lastReported = useRef(activeIndex);

  const applyTransform = useCallback((tx: number, animated: boolean) => {
    if (!stripRef.current) return;
    stripRef.current.style.transition = animated
      ? "transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
      : "none";
    stripRef.current.style.transform = `translateX(${tx}px)`;
  }, []);

  // Scroll the tick strip together with the value strip
  const applyTickScroll = useCallback((tx: number, animated: boolean) => {
    if (!ticksRef.current) return;
    ticksRef.current.style.transition = animated
      ? "transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
      : "none";
    // Tick spacing = ITEM_WIDTH / 4 (4 ticks per value slot)
    ticksRef.current.style.transform = `translateX(${tx % ITEM_WIDTH}px)`;
  }, []);

  useEffect(() => {
    if (!isDragging.current) {
      applyTransform(-(activeIndex * ITEM_WIDTH), true);
      applyTickScroll(-(activeIndex * ITEM_WIDTH), true);
    }
  }, [activeIndex, applyTransform, applyTickScroll]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startIndex.current = activeIndex;
    lastReported.current = activeIndex;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    applyTransform(-(activeIndex * ITEM_WIDTH), false);
    applyTickScroll(-(activeIndex * ITEM_WIDTH), false);
  }, [activeIndex, applyTransform, applyTickScroll]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - startX.current;
    const totalTx = -(startIndex.current * ITEM_WIDTH) + dx;
    applyTransform(totalTx, false);
    applyTickScroll(totalTx, false);
    const raw = startIndex.current + Math.round(-dx / ITEM_WIDTH);
    const clamped = Math.max(minIndex, Math.min(hi, raw));
    if (clamped !== lastReported.current) {
      lastReported.current = clamped;
      onChange(clamped);
      playClick();
      vibrateTick();
    }
  }, [applyTransform, applyTickScroll, onChange, minIndex, hi]);

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
    applyTransform(-(lastReported.current * ITEM_WIDTH), true);
    applyTickScroll(-(lastReported.current * ITEM_WIDTH), true);
  }, [applyTransform, applyTickScroll]);

  return (
    <div className="flex flex-col select-none" data-testid={testId}>

      {/* ── Label row ── */}
      <div className="flex items-center px-3" style={{ height: 20 }}>
        <span
          className="text-[9px] font-mono uppercase tracking-widest"
          style={{ color: isAuto ? "#ffffff" : "rgba(255,255,255,0.3)", transition: "color 0.2s" }}
        >
          {label}
        </span>
        {isAuto && (
          <span className="text-[8px] font-mono font-bold tracking-widest ml-2"
            style={{ color: "rgba(255,255,255,0.45)" }}>
            AUTO
          </span>
        )}
      </div>

      {/* ── Lens ring track ── */}
      <div
        className="relative overflow-hidden cursor-grab active:cursor-grabbing w-full"
        style={{
          height: DIAL_HEIGHT,
          touchAction: "none",
          // Cylindrical surface: dark at top+bottom edges, slight lift at center
          background: "linear-gradient(180deg, #030303 0%, #141414 18%, #1e1e1e 36%, #252525 50%, #1e1e1e 64%, #141414 82%, #030303 100%)",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* ── Analog dial tick marks — scrolling with the dial ── */}
        <div
          ref={ticksRef}
          className="absolute inset-0 pointer-events-none z-5"
          style={{ willChange: "transform" }}
        >
          {Array.from({ length: TICK_COUNT }).map((_, i) => {
            // Every 4th tick is a "major" tick (aligns with a value)
            const isMajor = i % 4 === 0;
            const isHalf = i % 2 === 0 && !isMajor;
            const tickH = isMajor ? 14 : isHalf ? 9 : 6;
            const tickW = isMajor ? 1.5 : 1;
            const opacity = isMajor ? 0.35 : isHalf ? 0.2 : 0.12;
            const tickSpacing = ITEM_WIDTH / 4; // 4 ticks per value slot = 16px apart

            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: 0,
                  left: i * tickSpacing,
                  width: tickW,
                  height: tickH,
                  background: `rgba(255,255,255,${opacity})`,
                  borderRadius: 1,
                }}
              />
            );
          })}
          {/* Bottom edge ticks (mirror) */}
          {Array.from({ length: TICK_COUNT }).map((_, i) => {
            const isMajor = i % 4 === 0;
            const isHalf = i % 2 === 0 && !isMajor;
            const tickH = isMajor ? 14 : isHalf ? 9 : 6;
            const tickW = isMajor ? 1.5 : 1;
            const opacity = isMajor ? 0.35 : isHalf ? 0.2 : 0.12;
            const tickSpacing = ITEM_WIDTH / 4;

            return (
              <div
                key={`b${i}`}
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: i * tickSpacing,
                  width: tickW,
                  height: tickH,
                  background: `rgba(255,255,255,${opacity})`,
                  borderRadius: 1,
                }}
              />
            );
          })}
        </div>

        {/* Diamond knurling texture (two diagonal gradients = crosshatch) */}
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            backgroundImage: [
              "repeating-linear-gradient(45deg,  transparent 0px, transparent 5px, rgba(255,255,255,0.032) 5px, rgba(255,255,255,0.032) 6px)",
              "repeating-linear-gradient(-45deg, transparent 0px, transparent 5px, rgba(255,255,255,0.032) 5px, rgba(255,255,255,0.032) 6px)",
            ].join(","),
          }}
        />

        {/* Ridge highlight — a thin bright line at the cylinder's "shoulder" */}
        <div
          className="absolute left-0 right-0 pointer-events-none z-10"
          style={{
            top: "28%",
            height: 1,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.09) 25%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.09) 75%, transparent)",
          }}
        />

        {/* Deep edge shadows to simulate the ring curving away */}
        <div
          className="absolute inset-0 pointer-events-none z-20"
          style={{
            background: "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 22%, transparent 38%, transparent 62%, rgba(0,0,0,0.1) 78%, rgba(0,0,0,0.7) 100%)",
          }}
        />

        {/* Side vignette */}
        <div
          className="absolute inset-0 pointer-events-none z-20"
          style={{
            background: "linear-gradient(90deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.35) 10%, transparent 26%, transparent 74%, rgba(0,0,0,0.35) 90%, rgba(0,0,0,0.88) 100%)",
          }}
        />

        {/* Subtle center guide line */}
        <div
          className="absolute inset-y-0 pointer-events-none z-10"
          style={{
            left: "50%",
            width: 1,
            transform: "translateX(-50%)",
            background: "rgba(255,255,255,0.04)",
          }}
        />

        {/* Values strip */}
        <div
          ref={stripRef}
          className="absolute top-0 h-full flex items-center will-change-transform"
          style={{ left: `calc(50% - ${ITEM_WIDTH / 2}px)`, zIndex: 30 }}
        >
          {values.map((val, i) => {
            const dist = Math.abs(i - activeIndex);
            const outOfRange = i < minIndex || i > hi;
            const custom = getItemStyle?.(val, i);

            const baseOpacity = outOfRange
              ? 0.1
              : dist === 0 ? 1
                : dist === 1 ? 0.5
                  : dist === 2 ? 0.24
                    : dist === 3 ? 0.1
                      : 0;
            const opacity = custom?.opacity ?? baseOpacity;
            const fontSize = dist === 0 ? 19 : dist === 1 ? 15 : dist === 2 ? 13 : 11;

            // Engraved look for non-active items; active item is pure white
            const baseColor = dist === 0 && !outOfRange
              ? "#FFFFFF"
              : outOfRange
                ? "rgba(255,255,255,0.2)"
                : "rgba(255,255,255,0.75)";
            const color = custom?.color ?? baseColor;

            return (
              <div
                key={i}
                className="flex items-center justify-center font-mono font-bold pointer-events-none shrink-0"
                style={{
                  width: ITEM_WIDTH,
                  opacity,
                  color,
                  fontSize,
                  letterSpacing: "0.04em",
                  // Active: bright glow; others: slight shadow to simulate engraving
                  textShadow: dist === 0 && !outOfRange
                    ? "0 0 10px rgba(255,255,255,0.3), 0 1px 0 rgba(0,0,0,0.8)"
                    : "0 1px 2px rgba(0,0,0,0.9), 0 -1px 0 rgba(255,255,255,0.04)",
                  transition: "opacity 0.12s",
                }}
              >
                {val}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
