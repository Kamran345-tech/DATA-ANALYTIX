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
      const rand = Math.random();
      const color = rand > 0.6 ? '#22D3EE' : rand > 0.3 ? '#6366F1' : '#34D399';
      const glowColor = rand > 0.6 ? 'rgba(34, 211, 238, 0.4)' : rand > 0.3 ? 'rgba(99, 102, 241, 0.4)' : 'rgba(52, 211, 153, 0.4)';
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        baseRadius: Math.random() * 2 + 1.2,
        color,
        glowColor,
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

    const sparkCount = 30;
    const sparks: Spark[] = [];
    for (let s = 0; s < sparkCount; s++) {
      sparks.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 1.0 + Math.random() * 2.0,
        length: 15 + Math.random() * 30,
        opacity: 0.12 + Math.random() * 0.28,
        color: Math.random() > 0.5 ? '#22D3EE' : '#6366F1'
      });
    }

    let time = 0;

    const render = () => {
      time += 0.016;
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
        ctx.lineWidth = 1.0;
        ctx.moveTo(spark.x, spark.y);
        ctx.lineTo(spark.x, spark.y + spark.length);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      });

      // --- LAYER 2: Flowing Multi-Sine Frequency Waves (Analytics Soundwaves/Telemetry) ---
      const waves = [
        { yOffset: 0.40, amp: 45, freq: 0.0035, speed: 1.1, color: 'rgba(34, 211, 238, 0.12)', fillGrad: 'rgba(34, 211, 238, 0.02)' },
        { yOffset: 0.58, amp: 38, freq: 0.0045, speed: 1.4, color: 'rgba(99, 102, 241, 0.10)', fillGrad: 'rgba(99, 102, 241, 0.02)' },
        { yOffset: 0.74, amp: 50, freq: 0.003, speed: 0.8, color: 'rgba(34, 211, 238, 0.08)', fillGrad: 'rgba(34, 211, 238, 0.015)' }
      ];

      waves.forEach(w => {
        ctx.beginPath();
        const baseY = height * w.yOffset;
        
        ctx.moveTo(0, baseY);
        for (let x = 0; x <= width; x += 12) {
          const y = baseY + 
                    Math.sin(x * w.freq + time * w.speed) * w.amp + 
                    Math.cos(x * w.freq * 0.7 - time * 0.6) * (w.amp * 0.35);
          ctx.lineTo(x, y);
        }

        ctx.strokeStyle = w.color;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Subtle gradient fill under the wave
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fillStyle = w.fillGrad;
        ctx.fill();
      });

      // --- LAYER 3: Interactive Dynamic Constellation Network ---
      const maxConnectDist = 150;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxConnectDist) {
            const alpha = (1 - dist / maxConnectDist) * 0.22;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`;
            ctx.lineWidth = 0.9;
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
          if (mDist < 160) {
            const mAlpha = (1 - mDist / 160) * 0.35;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(99, 102, 241, ${mAlpha})`;
            ctx.lineWidth = 1.2;
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
