import { useState, useMemo, useEffect } from "react";
import { X, Star, Search, Camera, ChevronRight, Check } from "lucide-react";
import { CAMERAS, type CameraModel } from "@/data/cameras";

interface CameraMenuProps {
  open: boolean;
  onClose: () => void;
  selectedCamera: CameraModel | null;
  onSelectCamera: (cam: CameraModel | null) => void;
}

function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("lm-favorites") ?? "[]"); }
    catch { return []; }
  });
  const toggle = (id: string) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem("lm-favorites", JSON.stringify(next));
      return next;
    });
  };
  return { favorites, toggle };
}

function CameraCard({
  camera,
  isSelected,
  isFavorite,
  onSelect,
  onToggleFavorite,
}: {
  camera: CameraModel;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 active:opacity-70 transition-opacity"
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        background: isSelected ? "rgba(255,255,255,0.05)" : "transparent",
      }}
    >
      {/* Camera icon / badge */}
      <button
        className="shrink-0 flex items-center justify-center rounded"
        style={{
          width: 52,
          height: 52,
          background: camera.accentColor,
          border: "1px solid rgba(255,255,255,0.08)",
        }}
        onClick={onSelect}
      >
        <Camera size={22} color="rgba(255,255,255,0.55)" />
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0" onClick={onSelect}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-bold text-white truncate">
            {camera.name}
          </span>
          {isSelected && (
            <Check size={12} className="shrink-0" color="#fff" />
          )}
        </div>
        <span
          className="text-[10px] font-mono block"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          {camera.manufacturer} · {camera.year} · {camera.format}
        </span>
        <span
          className="text-[10px] font-mono block mt-0.5"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          SS 1/{Math.round(1 / (() => {
            const { ssMinIndex: i } = camera;
            const vals = [1/4000,1/2000,1/1000,1/500,1/250,1/125,1/60,1/30,1/15,1/8,1/4,0.5,1,2,4];
            return vals[i];
          })())}–{(() => {
            const vals = [1/4000,1/2000,1/1000,1/500,1/250,1/125,1/60,1/30,1/15,1/8,1/4,0.5,1,2,4];
            const v = vals[camera.ssMaxIndex];
            return v >= 1 ? `${v}s` : `1/${Math.round(1/v)}`;
          })()} · f/{[1.4,2.0,2.8,4.0,5.6,8.0,11,16][camera.apertureMinIndex]}–f/{[1.4,2.0,2.8,4.0,5.6,8.0,11,16][camera.apertureMaxIndex]}
        </span>
      </div>

      {/* Star */}
      <button
        className="shrink-0 p-2 transition-opacity active:opacity-50"
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        data-testid={`btn-favorite-${camera.id}`}
      >
        <Star
          size={18}
          fill={isFavorite ? "#FFAA00" : "none"}
          color={isFavorite ? "#FFAA00" : "rgba(255,255,255,0.2)"}
        />
      </button>
    </div>
  );
}

function AboutTab() {
  return (
    <div className="px-6 py-8 space-y-6">
      <div className="text-center">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <Camera size={28} color="rgba(255,255,255,0.7)" />
        </div>
        <h2 className="text-lg font-mono font-bold text-white">Lightmeter</h2>
        <p className="text-[11px] font-mono mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
          Version 1.0
        </p>
      </div>

      <div
        className="rounded-xl p-4 space-y-2"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <p className="text-[12px] font-mono leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
          A precision incident and reflective light meter for film photographers.
          Uses your device camera to analyze scene brightness and recommend exposure
          settings using the Sunny 16 method.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
          How to use
        </h3>
        {[
          ["Scene metering", "Point camera at subject. The dials update automatically."],
          ["Spot metering", "Tap anywhere on the viewfinder to place a spot meter point."],
          ["EV compensation", "Drag the right-side slider up (+) or down (−) to adjust exposure."],
          ["Aperture priority", "Drag the f/ wheel — SS adjusts automatically."],
          ["Shutter priority", "Drag the SS wheel — aperture adjusts automatically."],
          ["Camera presets", "Select a film camera to constrain dials to its actual range."],
        ].map(([title, desc]) => (
          <div key={title} className="flex gap-3">
            <ChevronRight size={12} className="shrink-0 mt-1" color="rgba(255,255,255,0.3)" />
            <div>
              <p className="text-[11px] font-mono font-bold text-white">{title}</p>
              <p className="text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.15)" }}>
        Built for film photographers
      </p>
    </div>
  );
}

export function CameraMenu({ open, onClose, selectedCamera, onSelectCamera }: CameraMenuProps) {
  const [tab, setTab] = useState<"cameras" | "about">("cameras");
  const [query, setQuery] = useState("");
  const { favorites, toggle } = useFavorites();

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const filteredCameras = useMemo(() => {
    const q = query.toLowerCase();
    return CAMERAS.filter(c =>
      !q || c.name.toLowerCase().includes(q) || c.manufacturer.toLowerCase().includes(q)
    );
  }, [query]);

  const favoriteCameras = filteredCameras.filter(c => favorites.includes(c.id));
  const otherCameras    = filteredCameras.filter(c => !favorites.includes(c.id));

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{
          background: "rgba(0,0,0,0.5)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.3s ease",
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed inset-0 z-50 flex flex-col"
        style={{
          background: "#0a0908",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 pt-12 pb-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <span className="text-base font-mono font-bold text-white tracking-wide">Settings</span>
          <button
            onClick={onClose}
            className="p-2 rounded-full active:opacity-50 transition-opacity"
            style={{ background: "rgba(255,255,255,0.07)" }}
            data-testid="btn-close-menu"
          >
            <X size={18} color="rgba(255,255,255,0.8)" />
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          {(["cameras", "about"] as const).map(t => (
            <button
              key={t}
              className="flex-1 py-3 text-[11px] font-mono uppercase tracking-widest transition-colors"
              style={{
                color: tab === t ? "#fff" : "rgba(255,255,255,0.35)",
                borderBottom: tab === t ? "1px solid #fff" : "1px solid transparent",
              }}
              onClick={() => setTab(t)}
              data-testid={`tab-${t}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === "cameras" ? (
            <>
              {/* Search */}
              <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div
                  className="flex items-center gap-2 rounded-lg px-3 py-2"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <Search size={14} color="rgba(255,255,255,0.35)" />
                  <input
                    type="text"
                    placeholder="Search cameras..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-[12px] font-mono text-white placeholder:text-white/25"
                    data-testid="input-camera-search"
                  />
                </div>
              </div>

              {/* Clear selection */}
              {selectedCamera && (
                <button
                  className="w-full px-4 py-3 flex items-center gap-2 active:opacity-70"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}
                  onClick={() => onSelectCamera(null)}
                >
                  <X size={12} />
                  <span className="text-[11px] font-mono">Clear camera selection</span>
                </button>
              )}

              {/* Favorites */}
              {favoriteCameras.length > 0 && (
                <>
                  <div className="px-4 pt-4 pb-1">
                    <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "rgba(255,170,0,0.5)" }}>
                      Favorites
                    </span>
                  </div>
                  {favoriteCameras.map(cam => (
                    <CameraCard
                      key={cam.id}
                      camera={cam}
                      isSelected={selectedCamera?.id === cam.id}
                      isFavorite
                      onSelect={() => onSelectCamera(selectedCamera?.id === cam.id ? null : cam)}
                      onToggleFavorite={() => toggle(cam.id)}
                    />
                  ))}
                </>
              )}

              {/* All cameras */}
              {otherCameras.length > 0 && (
                <>
                  <div className="px-4 pt-4 pb-1">
                    <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>
                      {favoriteCameras.length > 0 ? "All Cameras" : "Cameras"}
                    </span>
                  </div>
                  {otherCameras.map(cam => (
                    <CameraCard
                      key={cam.id}
                      camera={cam}
                      isSelected={selectedCamera?.id === cam.id}
                      isFavorite={false}
                      onSelect={() => onSelectCamera(selectedCamera?.id === cam.id ? null : cam)}
                      onToggleFavorite={() => toggle(cam.id)}
                    />
                  ))}
                </>
              )}

              {filteredCameras.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Camera size={32} color="rgba(255,255,255,0.1)" />
                  <p className="text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>
                    No cameras found
                  </p>
                </div>
              )}
            </>
          ) : (
            <AboutTab />
          )}
        </div>
      </div>
    </>
  );
}
