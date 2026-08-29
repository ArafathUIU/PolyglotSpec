import React from 'react';
import './LandingPage.css';

export default function LandingPage({ onEnterConsole }) {
  const [mousePos, setMousePos] = React.useState({ x: -1000, y: -1000 });
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let time = 0;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const numStrands = 75;
    const strands = Array.from({ length: numStrands }).map((_, i) => {
      const baseX = (window.innerWidth / numStrands) * i;
      return {
        baseX,
        amplitude: 35 + Math.random() * 85,
        frequency: 0.001 + Math.random() * 0.0018,
        speed: 0.005 + Math.random() * 0.007,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.03 + Math.random() * 0.16,
        width: 0.4 + Math.random() * 1.0,
      };
    });

    const render = () => {
      time += 1;
      ctx.fillStyle = 'rgba(11, 15, 23, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      strands.forEach((s) => {
        ctx.beginPath();
        ctx.lineWidth = s.width;
        ctx.strokeStyle = `rgba(236, 208, 120, ${s.alpha})`;

        const steps = 35;
        const stepSize = canvas.height / steps;

        for (let y = 0; y <= canvas.height; y += stepSize) {
          const wave1 = Math.sin(y * s.frequency + time * s.speed + s.phase) * s.amplitude;
          const wave2 = Math.cos(y * (s.frequency * 0.5) - time * (s.speed * 0.5) + s.phase) * (s.amplitude * 0.4);
          const groupFlow = Math.sin(y * 0.0006 + time * 0.0012) * 150;
          const x = s.baseX + wave1 + wave2 + groupFlow;

          if (y === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const features = [
    {
      icon: "🛰️",
      title: "Static AST Schema Parser",
      desc: "Statically extracts validation constraints from Pydantic models (Python), Zod schemas (TypeScript), and FormRequests (Laravel PHP) without executing code."
    },
    {
      icon: "🔍",
      title: "Real-time Drift Detection",
      desc: "Instantly checks consumer schemas against provider APIs to flag breaking boundary changes, nullable constraints, and missing required parameters."
    },
    {
      icon: "⚡",
      title: "Adversarial HTTP Fuzzer",
      desc: "Generates boundary underflows, overflows, type mutations, and null-byte injections in the browser to pressure-test target endpoints."
    },
    {
      icon: "🛠️",
      title: "Dynamic CI/CD Integration",
      desc: "Generates pipeline configs on the fly for GitHub Actions and GitLab CI to fail builds and block pull requests when contracts drift."
    }
  ];

  const steps = [
    {
      num: "01",
      title: "1. Install Local CLI Engine",
      desc: "Clone the core package repository and register the validation command parser inside your workspace shell environment.",
      code: "git clone https://github.com/ArafathUIU/PolyglotSpec.git\ncd PolyglotSpec\npip install -e ."
    },
    {
      num: "02",
      title: "2. Generate Schema Definitions",
      desc: "Run the schema command to parse PHP request rules, Python Pydantic models, or Zod schemas directly into normalized contract files.",
      code: "# Extract Python FastAPI rules\npolyglotspec check app/models/user.py --out python.json\n\n# Extract Laravel Request rules\npolyglotspec check app/Http/Requests/StoreUserRequest.php --out php.json"
    },
    {
      num: "03",
      title: "3. Check Contract Drifts",
      desc: "Compare your consumer specifications against provider API contracts to isolate schema discrepancies, length limits, or nullability mismatches.",
      code: "polyglotspec diff php.json python.json --fail-on-warnings"
    },
    {
      num: "04",
      title: "4. Automate PR Checks",
      desc: "Deploy validation comparisons inside your workflow scripts to block merges and keep pipelines secure when validation fields drift.",
      code: "# .github/workflows/api-drift.yml\n- name: Run Drift Check\n  run: |\n    polyglotspec diff consumer.json provider.json"
    }
  ];

  return (
    <div className="landing-container">
      {/* HTML5 Canvas Background for Golden Silk Flow Animation */}
      <canvas ref={canvasRef} className="silk-canvas" />

      {/* Interactive mouse cursor glow */}
      <div 
        className="cursor-glow" 
        style={{ 
          left: `${mousePos.x}px`, 
          top: `${mousePos.y}px` 
        }}
      />
      {/* Background glow layers */}
      <div className="bg-glow-container">
        <div className="bg-glow-1"></div>
        <div className="bg-glow-2"></div>
      </div>

      {/* Header/Navbar */}
      <header className="landing-header glass-panel">
        <div className="brand-logo-group">
          <span className="brand-logo">🛰️</span>
          <span className="brand-name">PolyglotSpec</span>
        </div>
        <button className="btn-primary" onClick={onEnterConsole}>
          Access Console ➔
        </button>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <h1 className="hero-title">
          Stop Silent Contract Drift in <span className="gold-text">Polyglot</span> Architectures
        </h1>
        <p className="hero-subtitle">
          Statically analyze, compare, and pressure-test API request validations across PHP, Python, and TypeScript microservices before they break in production.
        </p>
        <div className="hero-actions">
          <button className="btn-primary btn-lg" onClick={onEnterConsole}>
            Get Started (Launch Console)
          </button>
          <a href="#how-it-works" className="btn-secondary btn-lg">
            How it Works
          </a>
        </div>
      </section>

      {/* Features Grid */}
      <section className="section-container">
        <h2 className="section-title text-center">Core Capabilities</h2>
        <div className="features-grid">
          {features.map((feat, idx) => (
            <div key={idx} className="feature-card glass-panel">
              <span className="feature-card-icon">{feat.icon}</span>
              <h3 className="feature-card-title">{feat.title}</h3>
              <p className="feature-card-desc">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works / CLI Flow */}
      <section id="how-it-works" className="section-container bg-dark-row">
        <h2 className="section-title text-center">Step-by-Step Integration Guide</h2>
        <p className="hero-subtitle text-center" style={{ margin: '0 auto 40px', maxWidth: '600px', fontSize: '1.05rem' }}>
          Configure validations and automate contract testing rules directly inside your deployment flow.
        </p>
        <div className="steps-grid">
          {steps.map((step, idx) => (
            <div key={idx} className="step-card glass-panel">
              <div className="step-num-badge">{step.num}</div>
              <h3 className="step-title">{step.title}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '16px' }}>{step.desc}</p>
              <pre className="step-code">
                <code>{step.code}</code>
              </pre>
            </div>
          ))}
        </div>
      </section>

      {/* Security Protocol Banner */}
      <section className="section-container">
        <div className="security-banner glass-panel">
          <div className="security-icon">🛡️</div>
          <div className="security-info">
            <h3 className="security-title">Security & Sandboxed Isolation</h3>
            <p className="security-desc">
              PolyglotSpec is built with developer privacy and workspace integrity in mind. 
              All AST inspection and schema conversions are performed locally on your machine. 
              The dashboard calculates diff drifts and streams sandboxed network checks directly from your browser, adhering strictly to CORS safety guidelines with zero remote storage.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-copyright">
          © {new Date().getFullYear()} PolyglotSpec. Open source developer tool.
        </div>
        <div className="footer-links">
          <a href="https://github.com/ArafathUIU/PolyglotSpec" target="_blank" rel="noreferrer">
            GitHub Repository
          </a>
        </div>
      </footer>
    </div>
  );
}
