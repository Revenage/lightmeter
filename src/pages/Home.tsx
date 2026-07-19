import { useRef, useCallback, useState, useEffect } from "react";
import { Menu, Sun, CloudSun, Cloud, Cloudy, Sunset, Moon, MoonStar } from "lucide-react";
import {
  useLightMeter,
  SHUTTER_SPEEDS,
  APERTURES,
  ISO_VALUES,
} from "@/hooks/use-light-meter";
import { DialWheel } from "@/components/DialWheel";
import { CameraMenu } from "@/components/CameraMenu";

// ── Scene icon from measured EV ──────────────────────────────────────────────
function getScene(ev: number): { Icon: React.ElementType; label: string } {
  if (ev >= 14) return { Icon: Sun, label: "Bright Sun" };
  if (ev >= 12) return { Icon: CloudSun, label: "Hazy Sun" };
  if (ev >= 10) return { Icon: Cloud, label: "Overcast" };
  if (ev >= 8) return { Icon: Cloudy, label: "Heavy Cloud" };
  if (ev >= 5) return { Icon: Sunset, label: "Dusk / Dawn" };
  if (ev >= 2) return { Icon: Moon, label: "Night" };
  return { Icon: MoonStar, label: "Deep Night" };
}

// All long exposures ≥ 1s (including Bulb) styled green
function ssItemStyle(val: string): { color?: string; opacity?: number } | undefined {
  if (["1s", "2s", "4s", "8s", "15s", "30s", "60s", "B"].includes(val)) return { color: "#33ff99" };
  return undefined;
}

// ── Red dot divider between dials ────────────────────────────────────────────
function DialDivider() {
  return (
    <div
      style={{
        height: 8,
        background: "rgba(255,255,255,0.05)",
        flexShrink: 0,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Red dot at center */}
      <div
        style={{
          marginLeft: "-8px",
          marginTop: "20px",
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#E03030",
          boxShadow: "0 0 8px rgba(94, 93, 93, 0.8)",
          flexShrink: 0,
        }}
      />
    </div>
  );
}

export default function Home() {
  const {
    mode,
    autoOverride,
    incidentMode, toggleIncidentMode,
    isoIndex, setIsoIndex,
    apertureIndex, handleApertureChange,
    ssIndex, handleSsChange,
    measuredEV,
    spotPoint, setSpotPoint,
    isActive, error, startCamera,
    selectedCamera, selectCamera,
    camSsMin, camSsMax, camAptMin, camAptMax,
    videoRef, canvasRef,
  } = useLightMeter();

  const [menuOpen, setMenuOpen] = useState(false);

  // ── Spot meter tap ───────────────────────────────────────────────────────
  const cameraRef = useRef<HTMLDivElement>(null);
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

  const onCameraPointerDown = useCallback((e: React.PointerEvent) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onCameraTap = useCallback((e: React.PointerEvent) => {
    const down = pointerDownPos.current;
    if (!down) return;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) return;
    if (!cameraRef.current) return;
    const rect = cameraRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (spotPoint && Math.abs(spotPoint.x - x) < 0.08 && Math.abs(spotPoint.y - y) < 0.08) {
      setSpotPoint(null);
    } else {
      setSpotPoint({ x, y });
    }
  }, [spotPoint, setSpotPoint]);

  // ── Live pulse ───────────────────────────────────────────────────────────
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (!isActive) return;
    const t = setInterval(() => setPulse(p => !p), 1400);
    return () => clearInterval(t);
  }, [isActive]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const { Icon: SceneIcon, label: sceneLabel } = getScene(measuredEV);

  const ssLabels = SHUTTER_SPEEDS.map(s => s.label);
  const aptLabels = APERTURES.map(a => a.label);
  const isoLabels = ISO_VALUES.map(i => i.label);

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
        {/* Live video — 2× zoom (equivalent to ~50mm on a phone) */}
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full"
          style={{
            objectFit: "cover",
            transform: "scale(2)",
            transformOrigin: "center center",
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
                  onClick={() => startCamera()}
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
              top: `${spotPoint.y * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div style={{ width: 48, height: 48, position: "relative" }}>
              <div style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                border: "1.5px solid rgba(255,255,255,0.85)",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
              }} />
              {([
                { top: 0, left: "50%", w: 1, h: 8, tx: "-50%", ty: "0" },
                { bottom: 0, left: "50%", w: 1, h: 8, tx: "-50%", ty: "0" },
                { left: 0, top: "50%", w: 8, h: 1, tx: "0", ty: "-50%" },
                { right: 0, top: "50%", w: 8, h: 1, tx: "0", ty: "-50%" },
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

        {/* ── Hamburger — top-right, below notch ── */}
        <div
          className="absolute right-0 top-0 px-3 pointer-events-none"
          style={{ paddingTop: "max(env(safe-area-inset-top, 12px) + 8px, 15px)" }}
        >
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

        {/* ── Scene / Weather icon — bottom-right of camera ── */}
        {isActive && measuredEV > 0 && (
          <div
            className="absolute bottom-0 right-0 flex flex-col items-center gap-1 pointer-events-none px-3 pb-3 sunny_16"
          >
            <SceneIcon size={26} color="rgba(255,255,255,0.8)" />
            <span
              className="text-[8px] font-mono uppercase tracking-widest text-center"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              {sceneLabel}
            </span>
          </div>
        )}

        {/* ── Status strip at bottom-left of camera ── */}
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
      </div>

      {/* ── Dials ────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, background: "#000" }}>
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

        <DialDivider />

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

        <DialDivider />

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
