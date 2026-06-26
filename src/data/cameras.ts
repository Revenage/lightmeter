// SHUTTER_SPEEDS indices: 0=1/4000 … 14=4s
// APERTURES indices:      0=f/1.4 … 7=f/16

export interface CameraModel {
  id: string;
  name: string;
  manufacturer: string;
  year: string;
  format: "35mm" | "Medium Format";
  ssMinIndex: number;   // fastest shutter available (smallest index = fastest)
  ssMaxIndex: number;   // slowest shutter available
  apertureMinIndex: number; // widest aperture (smallest index = widest)
  apertureMaxIndex: number; // narrowest aperture
  description: string;
  accentColor: string;
}

export const CAMERAS: CameraModel[] = [
  {
    id: "nikon-f",
    name: "Nikon F",
    manufacturer: "Nikon",
    year: "1959",
    format: "35mm",
    ssMinIndex: 2,   // 1/1000s
    ssMaxIndex: 12,  // 1s
    apertureMinIndex: 0,
    apertureMaxIndex: 7,
    description: "The camera that launched the Nikon professional system. Iconic prism finder, fully mechanical.",
    accentColor: "#2a2a2a",
  },
  {
    id: "nikon-f2",
    name: "Nikon F2",
    manufacturer: "Nikon",
    year: "1971",
    format: "35mm",
    ssMinIndex: 1,   // 1/2000s
    ssMaxIndex: 12,  // 1s
    apertureMinIndex: 0,
    apertureMaxIndex: 7,
    description: "Improved on the F with a 1/2000s top speed and refined metering head system.",
    accentColor: "#1e1e1e",
  },
  {
    id: "canon-ae1",
    name: "Canon AE-1",
    manufacturer: "Canon",
    year: "1976",
    format: "35mm",
    ssMinIndex: 2,   // 1/1000s
    ssMaxIndex: 13,  // 2s
    apertureMinIndex: 0,
    apertureMaxIndex: 7,
    description: "First mass-market microprocessor-controlled SLR. Shutter-priority AE with FD lenses.",
    accentColor: "#1a1210",
  },
  {
    id: "pentax-k1000",
    name: "Pentax K1000",
    manufacturer: "Pentax",
    year: "1976",
    format: "35mm",
    ssMinIndex: 2,   // 1/1000s
    ssMaxIndex: 12,  // 1s
    apertureMinIndex: 0,
    apertureMaxIndex: 7,
    description: "Entirely mechanical, no battery needed for exposure. A student classic.",
    accentColor: "#151a10",
  },
  {
    id: "pentax-mx",
    name: "Pentax MX",
    manufacturer: "Pentax",
    year: "1976",
    format: "35mm",
    ssMinIndex: 2,   // 1/1000s
    ssMaxIndex: 12,  // 1s
    apertureMinIndex: 0,
    apertureMaxIndex: 7,
    description: "Ultra-compact fully-mechanical SLR. One of the smallest 35mm SLRs ever made.",
    accentColor: "#10151a",
  },
  {
    id: "olympus-om1",
    name: "Olympus OM-1",
    manufacturer: "Olympus",
    year: "1972",
    format: "35mm",
    ssMinIndex: 2,   // 1/1000s
    ssMaxIndex: 12,  // 1s
    apertureMinIndex: 0,
    apertureMaxIndex: 7,
    description: "Whisper-quiet, compact SLR with a legendary viewfinder. Fully mechanical.",
    accentColor: "#1a1015",
  },
  {
    id: "mamiya-c330",
    name: "Mamiya C330",
    manufacturer: "Mamiya",
    year: "1969",
    format: "Medium Format",
    ssMinIndex: 3,   // 1/500s (leaf shutter in lens)
    ssMaxIndex: 12,  // 1s
    apertureMinIndex: 2, // f/2.8
    apertureMaxIndex: 7, // f/16
    description: "Twin-lens reflex with interchangeable lenses. Leaf shutters give 1/500s max.",
    accentColor: "#0d1520",
  },
  {
    id: "mamiya-m645",
    name: "Mamiya M645",
    manufacturer: "Mamiya",
    year: "1975",
    format: "Medium Format",
    ssMinIndex: 3,   // 1/500s
    ssMaxIndex: 14,  // 4s
    apertureMinIndex: 1, // f/2.0 (standard lens)
    apertureMaxIndex: 7,
    description: "645 format SLR, ideal bridge between 35mm and 6×6. Modular design.",
    accentColor: "#1a1500",
  },
  {
    id: "rolleiflex",
    name: "Rolleiflex 2.8F",
    manufacturer: "Rollei",
    year: "1960",
    format: "Medium Format",
    ssMinIndex: 3,   // 1/500s (Synchro-Compur leaf shutter)
    ssMaxIndex: 12,  // 1s
    apertureMinIndex: 2, // f/2.8
    apertureMaxIndex: 7,
    description: "The definitive TLR. Zeiss Planar 80mm f/2.8 on a Synchro-Compur leaf shutter.",
    accentColor: "#1a1200",
  },
  {
    id: "rollei-35",
    name: "Rollei 35",
    manufacturer: "Rollei",
    year: "1966",
    format: "35mm",
    ssMinIndex: 3,   // 1/500s
    ssMaxIndex: 11,  // 1/2s
    apertureMinIndex: 3, // f/4.0 (Tessar 40mm f/3.5, nearest to f/4)
    apertureMaxIndex: 7,
    description: "Smallest full-frame 35mm camera ever produced. Tessar 40mm fixed lens.",
    accentColor: "#0a1010",
  },
  {
    id: "minolta-srt101",
    name: "Minolta SRT-101",
    manufacturer: "Minolta",
    year: "1966",
    format: "35mm",
    ssMinIndex: 2,   // 1/1000s
    ssMaxIndex: 12,  // 1s
    apertureMinIndex: 0,
    apertureMaxIndex: 7,
    description: "CLC metering system, rugged build. A favorite of photojournalists in the 1970s.",
    accentColor: "#150010",
  },
];
