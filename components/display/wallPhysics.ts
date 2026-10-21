export type SpringBody = { x: number; y: number; vx: number; vy: number };

export type WallParticle = {
  body: SpringBody;
  anchorX: number;
  anchorY: number;
  halfWidth: number;
  halfHeight: number;
  mass: number;
  minY?: number;
  maxY?: number;
};

// Offsets are relative to the scrolling anchors, so wrapping never creates a velocity spike.
export function settleWall(particles: WallParticle[], seconds: number, spacing: number) {
  if (!particles.length || seconds <= 0) return;
  const steps = Math.ceil(seconds / (1 / 120));
  const dt = seconds / steps;
  const bucketSize = Math.max(...particles.map((p) => Math.max(p.halfWidth, p.halfHeight) * 2)) + spacing;

  for (let step = 0; step < steps; step++) {
    const forces = particles.map(({ body }) => ({ x: -body.x * 22, y: -body.y * 22 }));
    const buckets = new Map<string, number[]>();

    particles.forEach((p, i) => {
      const x = p.anchorX + p.body.x;
      const y = p.anchorY + p.body.y;
      const bx = Math.floor(x / bucketSize);
      const by = Math.floor(y / bucketSize);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (const j of buckets.get(`${bx + dx}:${by + dy}`) ?? []) {
            const other = particles[j];
            const distanceX = x - (other.anchorX + other.body.x);
            const distanceY = y - (other.anchorY + other.body.y);
            const overlapX = p.halfWidth + other.halfWidth + spacing - Math.abs(distanceX);
            const overlapY = p.halfHeight + other.halfHeight + spacing - Math.abs(distanceY);
            if (overlapX <= 0 || overlapY <= 0) continue;
            // Resolve along the shortest escape direction. Larger cards have more inertia.
            const axis = overlapX < overlapY ? "x" : "y";
            const distance = axis === "x" ? distanceX : distanceY;
            const force = (axis === "x" ? overlapX : overlapY) * 160 * (distance < 0 ? -1 : 1);
            forces[i][axis] += force;
            forces[j][axis] -= force;
          }
        }
      }
      const key = `${bx}:${by}`;
      const bucket = buckets.get(key) ?? [];
      bucket.push(i);
      buckets.set(key, bucket);
    });

    particles.forEach(({ body, mass, anchorY, minY = -Infinity, maxY = Infinity }, i) => {
      const damping = Math.exp(-12 * dt);
      body.vx = (body.vx + forces[i].x / mass * dt) * damping;
      body.vy = (body.vy + forces[i].y / mass * dt) * damping;
      body.x += body.vx * dt;
      body.y += body.vy * dt;
      const containedY = Math.max(minY - anchorY, Math.min(maxY - anchorY, body.y));
      if (containedY !== body.y) {
        body.y = containedY;
        body.vy = 0;
      }
    });
  }
}
