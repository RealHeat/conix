// Math utilities for conic-section visualization.
//
// Double cone: x² + y² = z²  (half-angle 45°), with z bounded.
// A plane is defined by a unit normal n and a signed distance d from the origin:
//     n · x = d.
// The visible plane mesh is centered at the foot of perpendicular  p = d · n.
//
// Each generator of the cone is a ray from the origin with direction
//     g(θ, s) = (cos θ, sin θ, s),   s ∈ {+1, -1}.
// The line { t · g : t > 0 } hits the plane when  t (n · g) = d,  i.e.
//     t = d / (n · g).
// We sample θ on each nappe and collect finite, in-bounds intersections.

export function planeNormalFromEuler(pitch, roll) {
  // Start from +Z axis (plane initially horizontal: normal = (0, 0, 1)).
  // Apply pitch (rotation around X), then roll (rotation around Y).
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const cr = Math.cos(roll), sr = Math.sin(roll);
  // (0,0,1)  --rotX(pitch)-->  (0, -sp, cp)
  //          --rotY(roll)  -->  (cp*sr, -sp, cp*cr)
  const n = [cp * sr, -sp, cp * cr];
  const len = Math.hypot(n[0], n[1], n[2]) || 1;
  return [n[0] / len, n[1] / len, n[2] / len];
}

export function classifyConic(normal) {
  // Plane tilt from horizontal = arccos(|n_z|).
  // Cone half-angle = 45°.
  const nz = Math.abs(normal[2]);
  const tilt = Math.acos(Math.min(1, nz));
  const halfAngle = Math.PI / 4;
  const eps = 0.025;
  if (Math.abs(tilt - halfAngle) < eps) return 'Parabola';
  if (tilt < halfAngle) {
    if (tilt < eps) return 'Circle';
    return 'Ellipse';
  }
  return 'Hyperbola';
}

// Compute intersection of plane with double cone.
// Returns an array of polylines (each a list of [x,y,z] points).
//   normal: unit-length [nx, ny, nz]
//   d:      signed distance from origin along normal (plane: n·x = d)
//   zLimit: clip points outside |z| <= zLimit
//   samples: angular resolution
export function computeIntersection(normal, d, zLimit = 4, samples = 720) {
  const [nx, ny, nz] = normal;
  const polylines = [];

  for (let nappe = 0; nappe < 2; nappe++) {
    const s = nappe === 0 ? 1 : -1;
    let current = [];
    const flush = () => {
      if (current.length > 1) polylines.push(current);
      current = [];
    };

    for (let i = 0; i <= samples; i++) {
      const theta = (i / samples) * Math.PI * 2;
      const gx = Math.cos(theta);
      const gy = Math.sin(theta);
      const denom = nx * gx + ny * gy + nz * s;

      // Generator parallel to plane (no intersection or whole line on plane).
      if (Math.abs(denom) < 1e-3) { flush(); continue; }

      const t = d / denom;
      // Cone is the ray t > 0; t < 0 belongs to the opposite nappe already
      // handled by the other s.
      if (t <= 0) { flush(); continue; }

      const z = t * s;
      if (Math.abs(z) > zLimit + 1e-6) { flush(); continue; }

      current.push([t * gx, t * gy, z]);
    }
    flush();
  }

  // Degenerate case: plane through apex (d ≈ 0). Find generators that LIE on
  // the plane (n·g = 0) and emit them as line segments through the origin.
  if (Math.abs(d) < 1e-4) {
    const found = [];
    const N = 1440;
    for (let i = 0; i < N; i++) {
      const theta = (i / N) * Math.PI * 2;
      for (const s of [1, -1]) {
        const gx = Math.cos(theta), gy = Math.sin(theta), gz = s;
        const dp = nx * gx + ny * gy + nz * gz;
        if (Math.abs(dp) < 5e-3) found.push([gx, gy, gz]);
      }
    }
    // Cluster nearby generators into ≤ 2 directions.
    const dirs = [];
    for (const g of found) {
      const exists = dirs.some(
        (d2) => Math.abs(d2[0] * g[0] + d2[1] * g[1] + d2[2] * g[2]) > 0.999
      );
      if (!exists) dirs.push(g);
      if (dirs.length >= 2) break;
    }
    for (const g of dirs) {
      const k = zLimit / Math.abs(g[2]);
      polylines.push([
        [-k * g[0], -k * g[1], -k * g[2]],
        [k * g[0], k * g[1], k * g[2]],
      ]);
    }
  }

  return polylines;
}
