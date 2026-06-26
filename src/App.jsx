import { useState, useEffect, useRef } from 'react';

function App() {
  const [lux, setLux] = useState(0);
  const [iso, setIso] = useState(100);
  const [aperture, setAperture] = useState(2.8);
  const [shutterSpeed, setShutterSpeed] = useState("--");
  const [isMeasuring, setIsMeasuring] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    // Start camera stream for visual effect
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied:", err);
      }
    };
    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    let interval;
    if (isMeasuring) {
      if ('AmbientLightSensor' in window) {
        try {
          const sensor = new window.AmbientLightSensor();
          sensor.onreading = () => setLux(Math.round(sensor.illuminance));
          sensor.onerror = (event) => {
            console.error(event.error.name, event.error.message);
            simulateLight();
          };
          sensor.start();
          return () => sensor.stop();
        } catch (err) {
          simulateLight();
        }
      } else {
        simulateLight();
      }

      function simulateLight() {
        interval = setInterval(() => {
          setLux(prev => {
            const base = prev === 0 ? 300 : prev;
            const fluctuation = Math.floor(Math.random() * 40) - 20;
            return Math.max(10, base + fluctuation);
          });
        }, 500);
      }
    } else {
      setLux(0);
    }
    return () => clearInterval(interval);
  }, [isMeasuring]);

  useEffect(() => {
    if (lux > 0) {
      const ev = Math.log2(lux / 2.5);
      let ss = 1 / (Math.pow(2, ev) / Math.pow(aperture, 2));
      
      let formattedSS = "";
      if (ss >= 1) formattedSS = Math.round(ss) + '"';
      else formattedSS = "1/" + Math.round(1/ss);
      
      setShutterSpeed(formattedSS);
    } else {
      setShutterSpeed("--");
    }
  }, [lux, aperture]);

  return (
    <div className="app-container">
      <div className="camera-container">
        <video ref={videoRef} autoPlay playsInline muted />
      </div>

      <header className="header">
        <h1>Lightmeter</h1>
        <div className="status">
          <div className="status-dot" style={{
            animationPlayState: isMeasuring ? 'running' : 'paused',
            backgroundColor: isMeasuring ? 'var(--accent-color)' : 'var(--text-muted)'
          }}></div>
          {isMeasuring ? 'ACTIVE' : 'READY'}
        </div>
      </header>

      <main className="main-display">
        <div className="lux-value">{lux}</div>
        <div className="lux-label">LUX</div>
      </main>

      <div className="controls">
        <div className="control-group">
          <span className="control-label">ISO</span>
          <span className="control-value">{iso}</span>
        </div>
        
        <div className="control-group">
          <span className="control-label">APERTURE</span>
          <span className="control-value">f/{aperture}</span>
        </div>

        <div className="control-group">
          <span className="control-label">SHUTTER</span>
          <span className="control-value" style={{color: 'var(--accent-color)'}}>{shutterSpeed}</span>
        </div>

        <button 
          className="measure-btn"
          onClick={() => setIsMeasuring(!isMeasuring)}
        >
          {isMeasuring ? 'Stop Measuring' : 'Start Measure'}
        </button>
      </div>
    </div>
  );
}

export default App;
