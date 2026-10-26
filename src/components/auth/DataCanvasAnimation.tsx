import React, { useEffect, useRef } from 'react';

export const DataCanvasAnimation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    let mouseX = width / 2;
    let mouseY = height / 2;
    let isMouseActive = false;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      isMouseActive = true;
    };

    const handleMouseLeave = () => {
      isMouseActive = false;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    // 1. Data Constellation Nodes
    interface DataNode {
      x: number;
      y: number;
      vx: number;
      vy: number;
      baseRadius: number;
      color: string;
      glowColor: string;
      pulsePhase: number;
      pulseSpeed: number;
    }

    const nodeCount = Math.min(45, Math.max(22, Math.floor(width / 36)));
    const nodes: DataNode[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const isEmerald = Math.random() > 0.45;
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        baseRadius: Math.random() * 2 + 1.2,
        color: isEmerald ? '#21F1A8' : '#00D2FF',
        glowColor: isEmerald ? 'rgba(33, 241, 168, 0.4)' : 'rgba(0, 210, 255, 0.4)',
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.03 + Math.random() * 0.02
      });
    }

    // 2. Rising Data Stream Sparks
    interface Spark {
      x: number;
      y: number;
      speed: number;
      length: number;
      opacity: number;
      color: string;
    }

    const sparkCount = 35;
    const sparks: Spark[] = [];
    for (let s = 0; s < sparkCount; s++) {
      sparks.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 1.2 + Math.random() * 2.2,
        length: 15 + Math.random() * 35,
        opacity: 0.15 + Math.random() * 0.35,
        color: Math.random() > 0.5 ? '#21F1A8' : '#00D2FF'
      });
    }

    let time = 0;

    const render = () => {
      time += 0.018;
      ctx.clearRect(0, 0, width, height);

      // --- LAYER 1: Rising Telemetry Light Sparks ---
      sparks.forEach(spark => {
        spark.y -= spark.speed;
        if (spark.y + spark.length < 0) {
          spark.y = height + Math.random() * 40;
          spark.x = Math.random() * width;
        }

        const grad = ctx.createLinearGradient(spark.x, spark.y, spark.x, spark.y + spark.length);
        grad.addColorStop(0, spark.color);
        grad.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.strokeStyle = grad;
        ctx.globalAlpha = spark.opacity;
        ctx.lineWidth = 1.2;
        ctx.moveTo(spark.x, spark.y);
        ctx.lineTo(spark.x, spark.y + spark.length);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      });

      // --- LAYER 2: Flowing Multi-Sine Frequency Waves (Analytics Soundwaves/Telemetry) ---
      const waves = [
        { yOffset: 0.38, amp: 55, freq: 0.0035, speed: 1.2, color: 'rgba(33, 241, 168, 0.14)', fillGrad: 'rgba(33, 241, 168, 0.03)' },
        { yOffset: 0.55, amp: 45, freq: 0.0045, speed: 1.6, color: 'rgba(0, 210, 255, 0.12)', fillGrad: 'rgba(0, 210, 255, 0.025)' },
        { yOffset: 0.72, amp: 65, freq: 0.003, speed: 0.9, color: 'rgba(33, 241, 168, 0.10)', fillGrad: 'rgba(33, 241, 168, 0.02)' }
      ];

      waves.forEach(w => {
        ctx.beginPath();
        const baseY = height * w.yOffset;
        
        ctx.moveTo(0, baseY);
        for (let x = 0; x <= width; x += 12) {
          const y = baseY + 
                    Math.sin(x * w.freq + time * w.speed) * w.amp + 
                    Math.cos(x * w.freq * 0.7 - time * 0.6) * (w.amp * 0.4);
          ctx.lineTo(x, y);
        }

        ctx.strokeStyle = w.color;
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // Subtle gradient fill under the wave
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fillStyle = w.fillGrad;
        ctx.fill();
      });

      // --- LAYER 3: Interactive Dynamic Constellation Network ---
      const maxConnectDist = 160;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxConnectDist) {
            const alpha = (1 - dist / maxConnectDist) * 0.28;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(33, 241, 168, ${alpha})`;
            ctx.lineWidth = 1.0;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }

        // Connection to mouse position for tactile interactivity
        if (isMouseActive) {
          const mdx = mouseX - nodes[i].x;
          const mdy = mouseY - nodes[i].y;
          const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mDist < 180) {
            const mAlpha = (1 - mDist / 180) * 0.45;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(0, 210, 255, ${mAlpha})`;
            ctx.lineWidth = 1.4;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(mouseX, mouseY);
            ctx.stroke();
          }
        }
      }

      // --- LAYER 4: Render Glowing Data Nodes & Metric Badges ---
      nodes.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;
        node.pulsePhase += node.pulseSpeed;

        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        const currentRadius = node.baseRadius + Math.sin(node.pulsePhase) * 1.0;

        // Outer glow halo
        ctx.beginPath();
        ctx.arc(node.x, node.y, currentRadius + 5, 0, Math.PI * 2);
        ctx.fillStyle = node.glowColor;
        ctx.fill();

        // Inner glowing core
        ctx.beginPath();
        ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-auto z-0" 
      aria-hidden="true"
    />
  );
};
