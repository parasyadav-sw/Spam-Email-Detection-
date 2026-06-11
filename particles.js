// particles.js - Constellation Canvas Background for Py AntiPhish
(function() {
  const canvas = document.getElementById('bg-particles');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  
  // Performance safeguard for mobile/touch devices
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isTouchDevice) {
    canvas.style.display = 'none';
    return;
  }

  let particles = [];
  const maxParticles = 90;
  const connectionDistance = 100;
  const mouseConnectionDistance = 130;
  const mouse = { x: null, y: null, active: false, radius: 150 };

  // Set size
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Mouse move listener
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  });

  window.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
    mouse.active = false;
  });

  // Particle Class
  class Particle {
    constructor() {
      this.reset(true);
    }

    reset(initPhase = false) {
      this.x = Math.random() * canvas.width;
      this.y = initPhase ? Math.random() * canvas.height : (Math.random() > 0.5 ? -10 : canvas.height + 10);
      this.radius = Math.random() * 1.5 + 0.8;
      
      // Velocities
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = (Math.random() - 0.5) * 0.4;
      
      // Color tint (Sky Blue, Mint Green, or Coral)
      const r = Math.random();
      if (r < 0.45) {
        this.color = '59, 130, 246'; // Sky Blue
      } else if (r < 0.8) {
        this.color = '52, 211, 153'; // Mint Green
      } else {
        this.color = '251, 113, 133'; // Soft Coral Pink
      }
      this.alpha = Math.random() * 0.4 + 0.15;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;

      // Mouse repulsion vector
      if (mouse.active && mouse.x !== null) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < mouse.radius) {
          // Calculate force (stronger closer to the center)
          const force = (mouse.radius - dist) / mouse.radius;
          const angle = Math.atan2(dy, dx);
          
          // Gently push particle away
          this.x += Math.cos(angle) * force * 1.2;
          this.y += Math.sin(angle) * force * 1.2;
        }
      }

      // Check boundaries
      if (this.x < -20 || this.x > canvas.width + 20 || this.y < -20 || this.y > canvas.height + 20) {
        this.reset(false);
      }
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
      ctx.fill();
    }
  }

  // Populate particles
  for (let i = 0; i < maxParticles; i++) {
    particles.push(new Particle());
  }

  // Animation Loop
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw particles
    particles.forEach(p => {
      p.update();
      p.draw();
    });

    // Draw connecting lines
    for (let i = 0; i < particles.length; i++) {
      const p1 = particles[i];

      // Draw line from particle to mouse if close
      if (mouse.active && mouse.x !== null) {
        const dx = p1.x - mouse.x;
        const dy = p1.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouseConnectionDistance) {
          const alpha = (1 - dist / mouseConnectionDistance) * 0.12;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(${p1.color}, ${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // Draw lines between particles
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < connectionDistance) {
          const alpha = (1 - dist / connectionDistance) * 0.06;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          
          let activeColor = '99, 102, 241';
          if (document.body.classList.contains('sky-theme')) {
            activeColor = '59, 130, 246';
          } else if (document.body.classList.contains('mint-theme')) {
            activeColor = '52, 211, 153';
          }
          
          ctx.strokeStyle = `rgba(${activeColor}, ${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(animate);
  }

  animate();
})();
