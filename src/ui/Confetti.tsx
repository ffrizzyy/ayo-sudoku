import { useEffect, useRef } from "react";

interface Bubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hue: string;
  life: number;
  age: number;
  wobble: number;
}

const COLORS = ["#0A84FF", "#30D158", "#FF9F0A", "#FF375F", "#BF5AF2", "#64D2FF"];

export function Confetti({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = document.documentElement.dataset.reducedMotion === "true";
    if (reduced) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const bubbles: Bubble[] = Array.from({ length: 38 }, (_, index) => ({
      x: width * (0.12 + Math.random() * 0.76),
      y: height * (0.55 + Math.random() * 0.35),
      vx: (Math.random() - 0.5) * 0.8,
      vy: -(0.9 + Math.random() * 1.8),
      radius: 6 + Math.random() * 16,
      hue: COLORS[index % COLORS.length],
      life: 1200 + Math.random() * 900,
      age: 0,
      wobble: Math.random() * Math.PI * 2,
    }));

    let frame = 0;
    let last = performance.now();
    let raf = 0;
    let stopped = false;
    const draw = (now: number) => {
      if (stopped) return;
      const delta = Math.min(32, now - last);
      last = now;
      ctx.clearRect(0, 0, width, height);
      let alive = false;
      for (const bubble of bubbles) {
        bubble.age += delta;
        if (bubble.age > bubble.life) continue;
        alive = true;
        bubble.wobble += 0.003 * delta;
        bubble.x += bubble.vx * (delta / 16) + Math.sin(bubble.wobble) * 0.4;
        bubble.y += bubble.vy * (delta / 16);
        bubble.vy *= 0.998;
        const progress = bubble.age / bubble.life;
        const alpha = progress < 0.1 ? progress / 0.1 : 1 - (progress - 0.1) / 0.9;
        const radius = bubble.radius * (progress > 0.85 ? 1 + (progress - 0.85) * 1.6 : 1);
        ctx.beginPath();
        ctx.globalAlpha = Math.max(0, alpha) * 0.7;
        ctx.fillStyle = bubble.hue;
        ctx.arc(bubble.x, bubble.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.globalAlpha = Math.max(0, alpha) * 0.85;
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 1.2;
        ctx.arc(bubble.x, bubble.y, radius, Math.PI * 1.1, Math.PI * 1.55);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (alive && frame < 200) {
        frame++;
        raf = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };
    raf = requestAnimationFrame(draw);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [active]);

  if (!active) return null;
  return <canvas ref={canvasRef} className="confetti-canvas" aria-hidden="true" />;
}
