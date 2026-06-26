import { useRef, useCallback, useState, useEffect } from "react";
import { Menu, Sun, CloudSun, Cloud, Cloudy, Sunset, Moon, MoonStar } from "lucide-react";
import {
  useLightMeter,
  SHUTTER_SPEEDS,
  APERTURES,
  ISO_VALUES,
  EV_THIRDS,
} from "@/hooks/use-light-meter";
import { DialWheel } from "@/components/DialWheel";
import { CameraMenu } from "@/components/CameraMenu";

// ── Scene icon from measured EV ──────────────────────────────────────────────
function getScene(ev: number): { Icon: React.ElementType; label: string } {
  if (ev >= 14) return { Icon: Sun,      label: "Bright Sun"  };
  if (ev >= 12) return { Icon: CloudSun, label: "Hazy Sun"    };
  if (ev >= 10) return { Icon: Cloud,    label: "Overcast"    };
  if (ev >= 8)  return { Icon: Cloudy,   label: "Heavy Cloud" };
  if (ev >= 5)  return { Icon: Sunset,   label: "Dusk / Dawn" };
  if (ev >= 2)  return { Icon: Moon,     label: "Night"       };
  return             { Icon: MoonStar,  label: "Deep Night"  };
}

// ── EV label ─────────────────────────────────────────────────────────────────
function evLabel(v: number): string {
  if (v === 0)  return "0";
  if (v === 1)  return "+1";
  if (v === -1) return "−1";
  return v > 0 ? `+${v}` : `${v}`;
}

// All long exposures ≥ 1s (including Bulb) styled green
function ssItemStyle(val: string): { color?: string; opacity?: number } | undefined {
  if (["1s","2s","4s","8s","15s","30s","60s","B"].includes(val)) return { color: "#33ff99" };
  return undefined;
}

// EV strip range: −1 … +1
const STRIP_MIN   = -1;
const STRIP_MAX   =  1;
const STRIP_RANGE = STRIP_MAX - STRIP_MIN; // 2

export default function Home() {
  const {
    mode,
    autoOverride,
    incidentMode, toggleIncidentMode,
    isoIndex, setIsoIndex,
    apertureIndex, handleApertureChange,
    ssIndex, handleSsChange,
    measuredEV, evComp, setEvComp,
    spotPoint, setSpotPoint,
    isActive, error, startCamera,
    selectedCamera, selectCamera,
    camSsMin, camSsMax, camAptMin, camAptMax,
    videoRef, canvasRef,
  } = useLightMeter();

  const [menuOpen, setMenuOpen] = useState(false);

  // ── Spot meter tap ───────────────────────────────────────────────────────
  const cameraRef        = useRef<HTMLDivElement>(null);
  const pointerDownPos   = useRef<{ x: number; y: number } | null>(null);

  const onCameraPointerDown = useCallback((e: React.PointerEvent) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onCameraTap = useCallback((e: React.PointerEvent) => {
    const down = pointerDownPos.current;
    if (!down) return;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) return;
    if (!cameraRef.current) return;
    const rect = cameraRef.current.getBoundingClientRect();
    if (e.clientX > rect.right - 44) return; // EV strip zone
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top)  / rect.height;
    if (spotPoint && Math.abs(spotPoint.x - x) < 0.08 && Math.abs(spotPoint.y - y) < 0.08) {
      setSpotPoint(null);
    } else {
      setSpotPoint({ x, y });
    }
  }, [spotPoint, setSpotPoint]);

  // ── EV compensation strip — right side ──────────────────────────────────
  const evStripRef  = useRef<HTMLDivElement>(null);
  const evDragging  = useRef(false);
  const evStartY    = useRef(0);
  const evStartComp = useRef(0);

  const onEvDown = useCallback((e: React.PointerEvent) => {
    evDragging.current  = true;
    evStartY.current    = e.clientY;
    evStartComp.current = evComp;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.stopPropagation();
  }, [evComp]);

  const onEvMove = useCallback((e: React.PointerEvent) => {
    if (!evDragging.current || !evStripRef.current) return;
    const dy    = e.clientY - evStartY.current;
    const h     = evStripRef.current.offsetHeight;
    // drag DOWN → more positive EV (strip: top=STRIP_MIN, bottom=STRIP_MAX)
    const delta = (dy / h) * STRIP_RANGE;
    const raw   = Math.max(STRIP_MIN, Math.min(STRIP_MAX, evStartComp.current + delta));
    const snap  = (EV_THIRDS as readonly number[]).reduce((p, c) =>
      Math.abs(c - raw) < Math.abs(p - raw) ? c : p
    );
    setEvComp(snap);
    e.stopPropagation();
  }, [setEvComp]);

  const onEvUp = useCallback((e: React.PointerEvent) => {
    evDragging.current = false;
    e.stopPropagation();
  }, []);

  // ── Live pulse ───────────────────────────────────────────────────────────
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (!isActive) return;
    const t = setInterval(() => setPulse(p => !p), 1400);
    return () => clearInterval(t);
  }, [isActive]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const { Icon: SceneIcon, label: sceneLabel } = getScene(measuredEV);
  const brightnessFactor = Math.pow(2, evComp);

  const ssLabels  = SHUTTER_SPEEDS.map(s => s.label);
  const aptLabels = APERTURES.map(a => a.label);
  const isoLabels = ISO_VALUES.map(i => i.label);

  // EV strip: top=STRIP_MIN, bottom=STRIP_MAX
  // position 0=top 1=bottom
  const evPosFromTop = (ev: number) => (ev - STRIP_MIN) / STRIP_RANGE;

  return (
    <div
      className="w-full flex flex-col overflow-hidden"
      style={{ height: "100dvh", background: "#000", fontFamily: "'Space Mono', monospace" }}
    >
      {/* Hidden canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ── Camera area ───────────────────────────────────────────── */}
      <div
        ref={cameraRef}
        className="relative flex-1 overflow-hidden"
        style={{ minHeight: 0, cursor: "crosshair" }}
        onPointerDown={onCameraPointerDown}
        onPointerUp={onCameraTap}
      >
        {/* Live video */}
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full"
          style={{
            objectFit: "cover",
            filter: `brightness(${brightnessFactor.toFixed(3)})`,
            transition: "filter 0.4s ease",
          }}
          data-testid="video-camera"
        />

        {/* Vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)" }}
        />

        {/* Bottom gradient */}
        <div
          className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)" }}
        />

        {/* No-camera state */}
        {!isActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            {error ? (
              <>
                <p className="text-[11px] font-mono text-red-400 uppercase tracking-widest px-6 text-center">{error}</p>
                <button
                  onClick={startCamera}
                  className="px-6 py-2 text-[11px] font-mono uppercase tracking-widest"
                  style={{ border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.6)", background: "transparent" }}
                  data-testid="btn-retry-camera"
                >
                  Retry
                </button>
              </>
            ) : (
              <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>
                Starting camera…
              </p>
            )}
          </div>
        )}

        {/* Spot indicator */}
        {spotPoint && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${spotPoint.x * 100}%`,
              top:  `${spotPoint.y * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div style={{ width: 48, height: 48, position: "relative" }}>
              <div style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                border: "1.5px solid rgba(255,255,255,0.85)",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
              }} />
              {/* Crosshair */}
              {([
                { top: 0,    left: "50%", w: 1, h: 8,  tx: "-50%", ty: "0"    },
                { bottom: 0, left: "50%", w: 1, h: 8,  tx: "-50%", ty: "0"    },
                { left: 0,   top:  "50%", w: 8, h: 1,  tx: "0",    ty: "-50%" },
                { right: 0,  top:  "50%", w: 8, h: 1,  tx: "0",    ty: "-50%" },
              ] as const).map((s, i) => (
                <div key={i} style={{
                  position: "absolute",
                  ...s,
                  width: s.w, height: s.h,
                  background: "rgba(255,255,255,0.85)",
                  transform: `translate(${s.tx}, ${s.ty})`,
                }} />
              ))}
            </div>
            <p style={{
              fontSize: 8, fontFamily: "'Space Mono',monospace",
              color: "rgba(255,255,255,0.7)", textAlign: "center", marginTop: 2,
              textTransform: "uppercase", letterSpacing: "0.1em",
            }}>spot</p>
          </div>
        )}

        {/* ── Top bar: scene icon (fixed left) + hamburger (fixed right) ── */}
        <div className="absolute top-0 left-0 right-0 flex items-start justify-between px-3 pt-10 pointer-events-none">
          {/* Scene icon — fixed width so it never shifts */}
          <div
            className="flex flex-col items-center gap-0.5 pointer-events-none"
            style={{ width: 72, minWidth: 72 }}
          >
            {isActive && measuredEV > 0 && (
              <>
                <SceneIcon size={28} color="rgba(255,255,255,0.85)" />
                <span
                  className="text-[8px] font-mono uppercase tracking-widest text-center w-full"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  {sceneLabel}
                </span>
              </>
            )}
          </div>

          {/* Hamburger — larger, square */}
          <button
            className="pointer-events-auto flex items-center justify-center active:opacity-60 transition-opacity"
            style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              background: "rgba(0,0,0,0.55)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(4px)",
              flexShrink: 0,
            }}
            onClick={() => setMenuOpen(true)}
            data-testid="btn-menu"
          >
            <Menu size={20} color="rgba(255,255,255,0.85)" />
          </button>
        </div>

        {/* ── Status strip at bottom of camera ── */}
        <div className="absolute bottom-2 left-3 flex items-center gap-2 pointer-events-none">
          {isActive && (
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: "#fff", opacity: pulse ? 0.8 : 0.2, transition: "opacity 0.7s ease" }}
            />
          )}
          <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
            {selectedCamera ? selectedCamera.name : mode === "A" ? "Aperture priority" : "Shutter priority"}
          </span>
        </div>

        {/* ── EV compensation strip — right side, below hamburger ── */}
        <div
          ref={evStripRef}
          className="absolute right-0 bottom-0"
          style={{
            top: 120,   // clear the hamburger button area
            width: 42,
            touchAction: "none",
            cursor: "ns-resize",
            zIndex: 10,
          }}
          onPointerDown={onEvDown}
          onPointerMove={onEvMove}
          onPointerUp={onEvUp}
          onPointerCancel={onEvUp}
        >
          {/* Background */}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to right, transparent, rgba(0,0,0,0.55))" }}
          />

          {/* Three stop marks: −1, 0, +1 */}
          <div className="absolute inset-0 flex flex-col justify-between py-5 items-end">
            {(EV_THIRDS as readonly number[]).map((step, idx) => {
              const active = Math.abs(step - evComp) < 0.01;
              return (
                <div key={idx} className="flex items-center justify-end w-full pr-2 gap-1.5">
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: "'Space Mono',monospace",
                      fontWeight: 700,
                      color: active ? "#fff" : "rgba(255,255,255,0.28)",
                      transition: "color 0.15s",
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {evLabel(step)}
                  </span>
                  <div
                    style={{
                      width:  active ? 22 : 13,
                      height: active ? 2  : 1,
                      background: active ? "#fff" : "rgba(255,255,255,0.35)",
                      transition: "all 0.15s",
                      borderRadius: 1,
                      flexShrink: 0,
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Floating readout for non-zero compensation */}
          {evComp !== 0 && (
            <div
              className="absolute font-mono font-bold"
              style={{
                top: `${evPosFromTop(evComp) * 100}%`,
                right: 0,
                transform: "translateY(-50%)",
                fontSize: 9,
                color: evComp > 0 ? "#fff" : "#bbb",
                padding: "1px 3px",
                background: "rgba(0,0,0,0.65)",
                borderRadius: 2,
                lineHeight: 1.4,
                whiteSpace: "nowrap",
                transition: "top 0.08s ease",
                pointerEvents: "none",
              }}
            >
              {evLabel(evComp)}
            </div>
          )}
        </div>
      </div>

      {/* ── Divider ──────────────────────────────────────────────── */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />

      {/* ── Dials ────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, background: "#000" }}>
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <DialWheel
            label="Shutter Speed"
            values={ssLabels}
            activeIndex={ssIndex}
            onChange={handleSsChange}
            isAuto={mode === "A" || autoOverride === "SS"}
            minIndex={camSsMin}
            maxIndex={camSsMax}
            getItemStyle={ssItemStyle}
            data-testid="dial-ss"
          />
        </div>
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <DialWheel
            label="Aperture"
            values={aptLabels}
            activeIndex={apertureIndex}
            onChange={handleApertureChange}
            isAuto={mode === "S" || autoOverride === "APT"}
            minIndex={camAptMin}
            maxIndex={camAptMax}
            data-testid="dial-aperture"
          />
        </div>
        <DialWheel
          label="ISO"
          values={isoLabels}
          activeIndex={isoIndex}
          onChange={setIsoIndex}
          data-testid="dial-iso"
        />

        {/* Bottom status strip */}
        <div
          className="flex items-center justify-between px-3"
          style={{
            paddingTop: 5,
            paddingBottom: "max(env(safe-area-inset-bottom, 6px), 6px)",
            borderTop: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.18)" }}>
            {SHUTTER_SPEEDS[ssIndex].label}
          </span>
          <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.18)" }}>
            {APERTURES[apertureIndex].label} · ISO {ISO_VALUES[isoIndex].label}
          </span>
        </div>
      </div>

      {/* ── Camera menu ──────────────────────────────────────────── */}
      <CameraMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        selectedCamera={selectedCamera}
        onSelectCamera={cam => { selectCamera(cam); setMenuOpen(false); }}
      />
    </div>
  );
}
