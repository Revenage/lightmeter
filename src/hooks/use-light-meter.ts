import { useState, useEffect, useRef, useCallback } from "react";
import type { CameraModel } from "@/data/cameras";

// Shutter speeds: fractions show denominator only, seconds show "1s" …
// Indices 0–18 = metered range; index 19 = Bulb (never auto-selected)
export const SHUTTER_SPEEDS = [
  { label: "4000", val: 1 / 4000 },
  { label: "2000", val: 1 / 2000 },
  { label: "1000", val: 1 / 1000 },
  { label: "500",  val: 1 / 500  },
  { label: "250",  val: 1 / 250  },
  { label: "125",  val: 1 / 125  },
  { label: "60",   val: 1 / 60   },
  { label: "30",   val: 1 / 30   },
  { label: "15",   val: 1 / 15   },
  { label: "8",    val: 1 / 8    },
  { label: "4",    val: 1 / 4    },
  { label: "2",    val: 1 / 2    },
  { label: "1s",   val: 1        },
  { label: "2s",   val: 2        },
  { label: "4s",   val: 4        },
  { label: "8s",   val: 8        },
  { label: "15s",  val: 15       },
  { label: "30s",  val: 30       },
  { label: "60s",  val: 60       },
  { label: "B",    val: 999      }, // bulb — last, never auto-selected
];

export const APERTURES = [
  { label: "1.4", val: 1.4 },
  { label: "2.0", val: 2.0 },
  { label: "2.8", val: 2.8 },
  { label: "4.0", val: 4.0 },
  { label: "5.6", val: 5.6 },
  { label: "8.0", val: 8.0 },
  { label: "11",  val: 11  },
  { label: "16",  val: 16  },
];

export const ISO_VALUES = [
  { label: "100",  val: 100  },
  { label: "200",  val: 200  },
  { label: "400",  val: 400  },
  { label: "800",  val: 800  },
  { label: "1600", val: 1600 },
  { label: "3200", val: 3200 },
];

// EV compensation strip: three discrete stops
export const EV_THIRDS = [-1, 0, 1] as const;

export type ExposureMode = "A" | "S";
export interface SpotPoint { x: number; y: number; }

// Bulb is always the last entry — auto-calc never reaches it
const SS_AUTO_MAX = SHUTTER_SPEEDS.length - 2; // index 18 = "60s"

function closestLogIndex(
  arr: { val: number }[],
  target: number,
  minIdx: number,
  maxIdx: number,
): number {
  const hi = Math.min(maxIdx, SS_AUTO_MAX); // never auto-select Bulb
  let best = minIdx, bestDist = Infinity;
  const safe = Math.max(target, 1e-9);
  for (let i = minIdx; i <= hi; i++) {
    const d = Math.abs(Math.log2(arr[i].val) - Math.log2(safe));
    if (d < bestDist) { bestDist = d; best = i; }
  }
  return best;
}

export function useLightMeter() {
  const [mode,          setMode]          = useState<ExposureMode>("A");
  const [isoIndex,      setIsoIndexState] = useState(0);
  const [apertureIndex, setApertureIndex] = useState(3); // f/4.0
  const [ssIndex,       setSsIndex]       = useState(5); // 1/125

  const [selectedCamera, setSelectedCamera] = useState<CameraModel | null>(null);
  const [measuredEV,     setMeasuredEV]     = useState(12); // EV 12 = sunny-day default until camera kicks in
  const [evComp,         setEvComp]         = useState(0);
  const [spotPoint,      setSpotPointState] = useState<SpotPoint | null>(null);
  const [isActive,       setIsActive]       = useState(false);
  const [error,          setError]          = useState("");
  // When the primary auto-dial hits its limit this becomes "APT" or "SS"
  const [autoOverride, setAutoOverride]     = useState<"APT" | "SS" | null>(null);
  const [incidentMode, setIncidentMode]     = useState(false);
  const incidentModeRef = useRef(false);

  // ── Mutable refs — always current, readable inside stable callbacks ──────
  const modeRef      = useRef<ExposureMode>("A");
  const measuredEVRef = useRef(0);
  const evCompRef    = useRef(0);
  const userAptRef   = useRef(3);
  const userSsRef    = useRef(5);
  const userIsoRef   = useRef(0);
  const camSsMinRef  = useRef(0);
  const camSsMaxRef  = useRef(SS_AUTO_MAX);
  const camAptMinRef = useRef(0);
  const camAptMaxRef = useRef(APERTURES.length - 1);

  // Keep refs in sync with state/props
  modeRef.current       = mode;
  measuredEVRef.current = measuredEV;
  evCompRef.current     = evComp;

  const camSsMin  = selectedCamera?.ssMinIndex        ?? 0;
  const camSsMax  = selectedCamera?.ssMaxIndex        ?? SS_AUTO_MAX;
  const camAptMin = selectedCamera?.apertureMinIndex  ?? 0;
  const camAptMax = selectedCamera?.apertureMaxIndex  ?? APERTURES.length - 1;
  camSsMinRef.current  = camSsMin;
  camSsMaxRef.current  = camSsMax;
  camAptMinRef.current = camAptMin;
  camAptMaxRef.current = camAptMax;

  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>();
  const streamRef = useRef<MediaStream>();

  // ── Core recalculation — reads only refs, always fresh ─────────────────
  // Spillover rule: if the primary AUTO dial hits its min/max limit, the
  // secondary dial starts moving to compensate the residual exposure delta.
  const recalc = useCallback(() => {
    const ev    = measuredEVRef.current || 12;
    const total = ev + evCompRef.current;
    const iso   = ISO_VALUES[userIsoRef.current].val;

    const ssMinIdx  = camSsMinRef.current;
    const ssMaxIdx  = Math.min(camSsMaxRef.current, SS_AUTO_MAX);
    const aptMinIdx = camAptMinRef.current;
    const aptMaxIdx = camAptMaxRef.current;

    if (modeRef.current === "A") {
      // ── Aperture Priority: SS is primary auto ────────────────────────
      const f       = APERTURES[userAptRef.current].val;
      const t_ideal = (f * f) / (Math.pow(2, total) * (iso / 100));

      const ssIdx = closestLogIndex(SHUTTER_SPEEDS, t_ideal, ssMinIdx, ssMaxIdx);
      setSsIndex(ssIdx);

      const t_min = SHUTTER_SPEEDS[ssMinIdx].val; // fastest SS available
      const t_max = SHUTTER_SPEEDS[ssMaxIdx].val; // slowest SS available
      const withinSsRange = t_ideal >= t_min && t_ideal <= t_max;

      if (!withinSsRange) {
        // SS hit a limit — spill over: move aperture to compensate residual
        const t_actual = SHUTTER_SPEEDS[ssIdx].val;
        const f_new    = Math.sqrt(t_actual * Math.pow(2, total) * (iso / 100));
        setApertureIndex(closestLogIndex(APERTURES, f_new, aptMinIdx, aptMaxIdx));
        setAutoOverride("APT");
      } else {
        // SS within range — restore user's chosen aperture
        setApertureIndex(userAptRef.current);
        setAutoOverride(null);
      }
    } else {
      // ── Shutter Priority: Aperture is primary auto ───────────────────
      const t       = SHUTTER_SPEEDS[userSsRef.current].val;
      const f_ideal = Math.sqrt(t * Math.pow(2, total) * (iso / 100));

      const aptIdx = closestLogIndex(APERTURES, f_ideal, aptMinIdx, aptMaxIdx);
      setApertureIndex(aptIdx);

      const f_min = APERTURES[aptMinIdx].val; // widest aperture available
      const f_max = APERTURES[aptMaxIdx].val; // narrowest aperture available
      const withinAptRange = f_ideal >= f_min && f_ideal <= f_max;

      if (!withinAptRange) {
        // Aperture hit a limit — spill over: move SS to compensate residual
        const f_actual = APERTURES[aptIdx].val;
        const t_new    = (f_actual * f_actual) / (Math.pow(2, total) * (iso / 100));
        setSsIndex(closestLogIndex(SHUTTER_SPEEDS, t_new, ssMinIdx, ssMaxIdx));
        setAutoOverride("SS");
      } else {
        // Aperture within range — restore user's chosen SS
        setSsIndex(userSsRef.current);
        setAutoOverride(null);
      }
    }
  }, []); // intentionally stable — all reads go through refs

  // ── Camera ──────────────────────────────────────────────────────────────
  const startCamera = useCallback(async (facing: "environment" | "user" = "environment") => {
    // Stop any existing stream so the new one can take over
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setIsActive(false); // forces frame-analysis effect to restart with new stream
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsActive(true);
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Camera unavailable");
    }
  }, []);

  const toggleIncidentMode = useCallback(() => {
    const next = !incidentModeRef.current;
    incidentModeRef.current = next;
    setIncidentMode(next);
    setSpotPointState(null);   // incident = whole-frame average, no spot
    startCamera(next ? "user" : "environment");
  }, [startCamera]);

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [startCamera]);

  // ── Frame analysis + debounced recalc for camera updates ────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video) return;
    canvas.width = 80; canvas.height = 60;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let last = 0;
    const analyze = (t: number) => {
      animRef.current = requestAnimationFrame(analyze);
      if (t - last < 150) return;
      last = t;
      if (video.readyState < video.HAVE_ENOUGH_DATA || video.videoWidth === 0) return;
      ctx.drawImage(video, 0, 0, 80, 60);
      const data = ctx.getImageData(0, 0, 80, 60).data;
      let sum = 0, count = 0;
      const sp = spotPoint;
      if (sp) {
        const cx = Math.round(sp.x * 80), cy = Math.round(sp.y * 60), r = 10;
        for (let y = 0; y < 60; y++) for (let x = 0; x < 80; x++) {
          if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) {
            const i = (y * 80 + x) * 4;
            sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; count++;
          }
        }
      } else {
        for (let i = 0; i < data.length; i += 4)
          sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2], count++;
      }
      if (!count) return;
      const newEV = Math.max(1, Math.log2(sum / count + 1) * 2);
      setMeasuredEV(newEV);
      measuredEVRef.current = newEV; // keep ref immediately in sync

      // Debounce camera-driven recalc at 400ms
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(recalc, 400);
    };
    animRef.current = requestAnimationFrame(analyze);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      clearTimeout(debounceRef.current);
    };
  }, [isActive, spotPoint, recalc]);

  // ── evComp changes → recalc immediately ─────────────────────────────────
  useEffect(() => {
    recalc();
  }, [evComp, recalc]);

  // ── Dial handlers — update refs then recalc immediately ─────────────────
  const handleSsChange = useCallback((idx: number) => {
    const c = Math.max(camSsMinRef.current, Math.min(camSsMaxRef.current, idx));
    userSsRef.current = c;
    setSsIndex(c);
    setMode("S");
    modeRef.current = "S";
    recalc();
  }, [recalc]);

  const handleApertureChange = useCallback((idx: number) => {
    const c = Math.max(camAptMinRef.current, Math.min(camAptMaxRef.current, idx));
    userAptRef.current = c;
    setApertureIndex(c);
    setMode("A");
    modeRef.current = "A";
    recalc();
  }, [recalc]);

  const setIsoIndex = useCallback((idx: number) => {
    userIsoRef.current = idx;
    setIsoIndexState(idx);
    recalc();
  }, [recalc]);

  // Custom setSpotPoint — calls recalc immediately with current measuredEV
  // so the auto dial responds instantly on tap (frame analysis refines later)
  const setSpotPoint = useCallback((sp: SpotPoint | null) => {
    setSpotPointState(sp);
    recalc();
  }, [recalc]);

  const selectCamera = useCallback((cam: CameraModel | null) => {
    setSelectedCamera(cam);
    if (cam) {
      const newSs  = Math.max(cam.ssMinIndex,       Math.min(cam.ssMaxIndex,       userSsRef.current));
      const newApt = Math.max(cam.apertureMinIndex, Math.min(cam.apertureMaxIndex, userAptRef.current));
      userSsRef.current  = newSs;
      userAptRef.current = newApt;
      setSsIndex(newSs);
      setApertureIndex(newApt);
      camSsMinRef.current  = cam.ssMinIndex;
      camSsMaxRef.current  = cam.ssMaxIndex;
      camAptMinRef.current = cam.apertureMinIndex;
      camAptMaxRef.current = cam.apertureMaxIndex;
    } else {
      camSsMinRef.current  = 0;
      camSsMaxRef.current  = SS_AUTO_MAX;
      camAptMinRef.current = 0;
      camAptMaxRef.current = APERTURES.length - 1;
    }
    recalc();
  }, [recalc]);

  return {
    mode,
    autoOverride,
    incidentMode, toggleIncidentMode,
    isoIndex,      setIsoIndex,
    apertureIndex, handleApertureChange,
    ssIndex,       handleSsChange,
    measuredEV,
    evComp,        setEvComp,
    spotPoint,     setSpotPoint,
    isActive, error, startCamera,
    selectedCamera, selectCamera,
    camSsMin, camSsMax, camAptMin, camAptMax,
    videoRef, canvasRef,
  };
}
