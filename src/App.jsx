import { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Scene from './Scene'
import { classifyConic, planeNormalFromEuler } from './conic'
import './App.css'

const CONE_HEIGHT = 4

function Slider({ label, value, min, max, step, onChange, format, parse }) {
  // `format(v) → string` for display; `parse(s) → number | null` for input.
  // Defaults handle plain numeric values.
  const fmt = format || ((v) => v.toFixed(2))
  const prs = parse || ((s) => {
    const n = parseFloat(s)
    return Number.isFinite(n) ? n : null
  })

  const [text, setText] = useState(fmt(value))
  const [editing, setEditing] = useState(false)

  // Keep text in sync with external value when not actively editing.
  useEffect(() => {
    if (!editing) setText(fmt(value))
  }, [value, editing, fmt])

  const commit = (raw) => {
    const n = prs(raw)
    if (n === null) {
      setText(fmt(value)) // revert
      return
    }
    const clamped = Math.min(max, Math.max(min, n))
    onChange(clamped)
    setText(fmt(clamped))
  }

  return (
    <label className="slider">
      <div className="slider-row">
        <span className="slider-label">{label}</span>
        <input
          type="text"
          inputMode="decimal"
          className="slider-input"
          value={text}
          onChange={(e) => { setEditing(true); setText(e.target.value) }}
          onFocus={(e) => e.target.select()}
          onBlur={(e) => { setEditing(false); commit(e.target.value) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              setText(fmt(value)); setEditing(false); e.currentTarget.blur()
            }
          }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  )
}

export default function App() {
  const [pitch, setPitch] = useState(0.25)
  const [roll, setRoll] = useState(0)
  const [distance, setDistance] = useState(1.4)
  const [planeX, setPlaneX] = useState(0)
  const [planeY, setPlaneY] = useState(0)

  const conic = useMemo(() => {
    const n = planeNormalFromEuler(pitch, roll)
    return classifyConic(n)
  }, [pitch, roll])

  const reset = () => {
    setPitch(0.25); setRoll(0); setDistance(1.4)
    setPlaneX(0); setPlaneY(0)
  }

  const presets = [
    { name: 'Circle',    pitch: 0,           roll: 0, distance: 1.4 },
    { name: 'Ellipse',   pitch: 0.5,         roll: 0, distance: 1.6 },
    { name: 'Parabola',  pitch: Math.PI / 4, roll: 0, distance: 1.0 },
    { name: 'Hyperbola', pitch: 1.15,        roll: 0, distance: 0.9 },
  ]

  const applyPreset = (p) => {
    setPitch(p.pitch); setRoll(p.roll); setDistance(p.distance)
  }

  const fmtDeg = (r) => `${((r * 180) / Math.PI).toFixed(1)}°`
  const parseDeg = (s) => {
    const n = parseFloat(s.replace(/°/g, '').trim())
    return Number.isFinite(n) ? (n * Math.PI) / 180 : null
  }

  return (
    <div className="app">
      <div className="canvas-wrap">
        <Canvas
          camera={{ position: [8, 6, 8], fov: 45 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
        >
          <color attach="background" args={['#1d2021']} />
          <fog attach="fog" args={['#1d2021', 16, 34]} />
          <Scene
            pitch={pitch}
            roll={roll}
            distance={distance}
            coneHeight={CONE_HEIGHT}
          />
          <OrbitControls
            enableDamping
            dampingFactor={0.08}
            minDistance={4}
            maxDistance={22}
          />
        </Canvas>

        <div className="overlay-top">
          <div className="brand">
            <div className="brand-mark" />
            <div>
              <div className="brand-title">CONIX</div>
              <div className="brand-sub">Conic Section Visualizer</div>
            </div>
          </div>
          <div className={`badge badge-${conic.toLowerCase()}`}>{conic}</div>
        </div>

        <div className="overlay-bottom">
          <span>Drag to orbit · Scroll to zoom</span>
        </div>
      </div>

      <aside className="panel">
        <div className="panel-header">
          <h2>Controls</h2>
          <button className="reset" onClick={reset}>Reset</button>
        </div>

        <section>
          <h3>Plane Rotation</h3>
          <Slider
            label="Pitch"
            value={pitch}
            min={-Math.PI / 2}
            max={Math.PI / 2}
            step={0.005}
            onChange={setPitch}
            format={fmtDeg}
            parse={parseDeg}
          />
          <Slider
            label="Roll"
            value={roll}
            min={-Math.PI}
            max={Math.PI}
            step={0.005}
            onChange={setRoll}
            format={fmtDeg}
            parse={parseDeg}
          />
        </section>

        <section>
          <h3>Plane Position</h3>
          <Slider
            label="Distance"
            value={distance}
            min={-3}
            max={3}
            step={0.01}
            onChange={setDistance}
          />
          <p className="hint">
            Signed distance from origin along the plane's normal.
          </p>
        </section>

        <section>
          <h3>Presets</h3>
          <div className="presets">
            {presets.map((p) => (
              <button key={p.name} onClick={() => applyPreset(p)}>{p.name}</button>
            ))}
          </div>
        </section>

        <section className="info">
          <h3>About</h3>
          <p>
            A double cone (x² + y² = z²) intersected by a plane produces a
            conic section. Tilt the plane past 45° to cross both nappes and
            form a hyperbola; tilt to exactly 45° for a parabola.
          </p>
        </section>
      </aside>
    </div>
  )
}
