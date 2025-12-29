import { useState, useEffect, useRef } from 'react';
import profile from './assets/profile_photo.jpg';

export default function NowBar({ title, color, expanded, onClick, zIndex = 10, style = {}, styleOffset = 0 }) {
  // collapsed uses fixed width classes; expanded sizing is provided through style prop
  const collapsedClasses = `w-36 md:w-44 h-12 rounded-[12px] backdrop-blur-lg backdrop-saturate-150 border border-white/30 shadow-[0_12px_40px_rgba(0,0,0,0.6)] transition-all duration-900 ease-in-out transform overflow-hidden relative`;
  const expandedClasses = `rounded-2xl shadow-2xl transition-all duration-900 ease-in-out transform overflow-hidden`;
  const common = `cursor-pointer text-white flex items-center justify-center absolute left-1/2 -translate-x-1/2`;

  // merge provided style with sensible defaults; prefer explicit style.transform if provided
  const defaultTransform = `translateX(-50%) translateY(${styleOffset}px)`;
  const mergedStyle = {
    backgroundColor: expanded ? color : undefined,
    zIndex,
    position: 'absolute',
    left: '50%',
    transform: style.transform || defaultTransform,
    ...(expanded ? {} : {}),
    ...style,
    boxShadow: style.boxShadow || (expanded ? '0 20px 50px rgba(0,0,0,0.6), inset 0 2px 8px rgba(255,255,255,0.06)' : '0 12px 40px rgba(0,0,0,0.6), inset 0 3px 12px rgba(255,255,255,0.06)'),
    border: style.border || (expanded ? undefined : '1px solid rgba(255,255,255,0.18)'),
    backgroundImage: style.backgroundImage || (expanded ? undefined : 'linear-gradient(to bottom, rgba(255,255,255,0.04), rgba(255,255,255,0.01))'),
    borderRadius: style.borderRadius || (expanded ? undefined : '16px')
  };

  // per-section expanded backgrounds (animated)
  if (expanded) {
    // smooth animated background & border changes
    mergedStyle.transition = mergedStyle.transition || 'background 900ms cubic-bezier(.2,.9,.2,1), box-shadow 900ms cubic-bezier(.2,.9,.2,1), border 900ms linear';

    if (title === 'Introduction') {
      mergedStyle.background = 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(99,102,241,0.08))';
      mergedStyle.border = '1px solid rgba(255,255,255,0.08)';
      mergedStyle.boxShadow = '0 30px 90px rgba(0,0,0,0.75)';
      mergedStyle.backgroundImage = mergedStyle.backgroundImage || 'linear-gradient(180deg, rgba(255,255,255,0.01), transparent)';
    }

    if (title === 'MyCareer') {
      mergedStyle.background = 'linear-gradient(135deg, rgba(14,165,233,0.10), rgba(59,130,246,0.06))';
      mergedStyle.border = '1px solid rgba(255,255,255,0.07)';
      mergedStyle.boxShadow = '0 30px 80px rgba(6,78,159,0.55)';
    }

    if (title === 'Expertise') {
      mergedStyle.background = 'linear-gradient(135deg, rgba(139,92,246,0.10), rgba(147,51,234,0.06))';
      mergedStyle.border = '1px solid rgba(255,255,255,0.06)';
      mergedStyle.boxShadow = '0 30px 80px rgba(88,24,163,0.55)';
    }

    if (title === 'Projects') {
      mergedStyle.background = 'linear-gradient(135deg, rgba(249,115,22,0.10), rgba(234,88,12,0.06))';
      mergedStyle.border = '1px solid rgba(255,255,255,0.06)';
      mergedStyle.boxShadow = '0 30px 80px rgba(161,98,0,0.55)';
    }

    if (title === 'ReachMe') {
      mergedStyle.background = 'linear-gradient(135deg, rgba(239,68,68,0.10), rgba(220,38,38,0.06))';
      mergedStyle.border = '1px solid rgba(255,255,255,0.06)';
      mergedStyle.boxShadow = '0 30px 80px rgba(153,27,27,0.55)';
    }
  }

  // helper to let CTAs navigate other sections via a custom event
  const navigateTo = (name) => {
    window.dispatchEvent(new CustomEvent('goToSection', { detail: name }));
  };

  // form state for ReachMe
  const [contact, setContact] = useState('');
  const [topic, setTopic] = useState('');
  const [desc, setDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Google Apps Script web app URL (writes to your Google Sheet)
  const SHEET_URL = 'https://script.google.com/macros/s/AKfycbxZXTGCmeCsZbTj1YlG2wEyXqtTzqHa0YteVMWtsY5VDx1R0aLmrsJ0WpqU2uWedAhN/exec';

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!contact || !topic) {
      alert('Please provide contact (phone or email) and a short topic.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = new URLSearchParams({
        contact,
        title: topic,
        description: desc,
      });

      const res = await fetch(SHEET_URL, {
        method: 'POST',
        body: payload,
      });


      // Read response as text first (Apps Script may return JSON or plain text)
      const text = await res.text().catch(() => '');
      let json = {};
      try { json = JSON.parse(text); } catch (e) { /* not JSON */ }

      console.log('Sheet response status', res.status, 'body:', text);

      if (res.ok && (json.success === true || res.status === 200)) {
        setContact('');
        setTopic('');
        setDesc('');
        alert('Thanks! Your message was sent.');
      } else {
        console.error('Sheet write failed', { status: res.status, body: text });
        alert(`Could not send message — server returned status ${res.status}. Check script logs. Response: ${text}`);
      }
    } catch (err) {
      console.error('Submit error', err);

      // Try fallback: submit using a plain form POST (no preflight) and open result in new tab
      try {
        const payload = { contact, title: topic, description: desc };
        submitViaForm(payload);
        alert('Primary submission failed (network/CORS). A fallback POST was submitted (opens in a new tab). If you still do not see the row, check Apps Script logs or deployment access.');
      } catch (fallbackErr) {
        console.error('Fallback submit failed', fallbackErr);
        alert(`Network error — ${err.message}. Possible causes: CORS, deployment access, or network.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const stop = (e) => e.stopPropagation();

  // ref for this bar so we can attach touch handlers to inner scrollable regions
  const rootRef = useRef(null);

  // ensure inner scrollable panels capture touch gestures so they scroll independently on mobile
  useEffect(() => {
    if (!rootRef.current) return;
    const els = Array.from(rootRef.current.querySelectorAll('.panel-scrollable'));
    const handlers = [];

    els.forEach((el) => {
      const onTouchStart = (ev) => {
        el.__touchStartY = ev.touches && ev.touches[0] ? ev.touches[0].clientY : 0;
        el.__startScroll = el.scrollTop;
      };

      // More robust touch logic: allow inner scrolling and prevent touch from propagating to outer containers when appropriate.
      const onTouchMove = (ev) => {
        if (!ev.touches || ev.touches.length === 0) return;
        const currentY = ev.touches[0].clientY;
        const dy = currentY - (el.__touchStartY || 0);
        const canScroll = el.scrollHeight > el.clientHeight;

        // If the element can't scroll, do nothing
        if (!canScroll) return;

        // At top and swiping down (dy > 0) -> prevent outer from pulling
        if (el.scrollTop <= 0 && dy > 0) {
          ev.preventDefault();
          ev.stopPropagation();
          return;
        }

        // At bottom and swiping up (dy < 0) -> prevent outer from pulling
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1 && dy < 0) {
          ev.preventDefault();
          ev.stopPropagation();
          return;
        }

        // When the inner element can scroll (not at edges), stop propagation so the inner scroll handles the gesture
        ev.stopPropagation();
      };

      el.addEventListener('touchstart', onTouchStart, { passive: true });
      el.addEventListener('touchmove', onTouchMove, { passive: false }); // passive:false so we can call preventDefault when needed
      handlers.push({ el, onTouchStart, onTouchMove });
    });

    return () => {
      handlers.forEach(({ el, onTouchStart, onTouchMove }) => {
        el.removeEventListener('touchstart', onTouchStart);
        el.removeEventListener('touchmove', onTouchMove);
      });
    };
  }, [expanded]);

  // Fallback submit: plain HTML form POST (avoids preflight/CORS). Opens result in a new tab.
  const submitViaForm = (payload) => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = SHEET_URL;
    form.target = '_blank'; // open result in a new tab so the SPA doesn't navigate away
    form.style.display = 'none';

    Object.entries(payload).forEach(([k, v]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = k;
      input.value = v ?? '';
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    form.remove();
  };

  const renderExpandedContent = () => {
    // keep content compact so it fits without scrolling
    if (title === 'Introduction') {
      return (
        <div className="w-full h-full p-6 flex flex-col md:flex-row items-center md:items-stretch gap-6" onClick={stop}>
          {/* left: avatar + social */}
          <div className="md:w-1/3 flex flex-col items-center gap-4 md:justify-center">
            <div className="relative flex flex-col items-center">
              <div className="w-28 h-28 sm:w-32 md:w-56 md:h-56 rounded-full overflow-hidden ring-4 md:ring-6 ring-white/6 shadow-2xl">
                <img src={profile} alt="Dhruv Javiya" className="w-full h-full object-cover" />
              </div>

            </div>

            <div className="mt-3 md:mt-4 flex items-center justify-center space-x-2 md:space-x-3">
              <a className="social-btn" href="https://github.com/dhruv161701" target="_blank" rel="noopener noreferrer" aria-label="GitHub" onClick={(e) => { e.stopPropagation(); }}>
                <svg width="22" height="22" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M8 0.5C3.86 0.5 0.5 3.86 0.5 8c0 3.33 2.16 6.15 5.16 7.14.38.07.52-.17.52-.38 0-.18-.01-.65-.01-1.28-2.1.46-2.54-.51-2.7-.98-.09-.23-.48-.98-.82-1.18-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.96 0-.87.31-1.58.82-2.14-.08-.2-.36-1.02.08-2.12 0 0 .67-.22 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.14 0 3.08-1.87 3.76-3.65 3.96.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.19 0 .21.14.46.52.38C13.84 14.15 16 11.33 16 8c0-4.14-3.36-7.5-8-7.5z" fill="white" />
                </svg>
              </a>

              <a className="social-btn" href="https://www.linkedin.com/in/dhruv-javiya/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" onClick={(e) => { e.stopPropagation(); }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM0 8.98h5V24H0V8.98zM8.99 8.98h4.79v2.06h.07c.67-1.27 2.31-2.6 4.75-2.6 5.08 0 6.02 3.34 6.02 7.68V24h-5v-7.74c0-1.85-.03-4.23-2.58-4.23-2.58 0-2.98 2.02-2.98 4.09V24H8.99V8.98z" fill="white" />
                </svg>
              </a>

              <a className="social-btn" href="https://leetcode.com/u/dhruv1612007/" target="_blank" rel="noopener noreferrer" aria-label="LeetCode" onClick={(e) => { e.stopPropagation(); }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M12 3l6 6v3l-3 1-3-3-3 3-3-1V9l6-6z" fill="white" />
                </svg>
              </a>
            </div>
          </div>

          {/* right: details */}
          <div className="md:flex-1 flex flex-col justify-center text-center md:text-left gap-2 md:gap-3">
            <div className="text-xl md:text-3xl font-extrabold">Dhruv Javiya</div>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <span className="text-xs md:text-sm px-3 py-1 rounded-full bg-white/8">Web / App Developer</span>
              <span className="text-xs md:text-sm px-3 py-1 rounded-full bg-white/8">UI & UX</span>
              <span className="text-xs md:text-sm px-3 py-1 rounded-full bg-white/8">ML Engineer</span>
            </div>

            <p className="mt-3 text-xs md:text-sm opacity-90 max-w-[80%] md:max-w-none mx-auto md:mx-0 text-center md:text-left">I design and build polished, performant web & mobile experiences and explore practical ML solutions. Welcome — explore projects or reach out.</p>

            <div className="mt-4 flex gap-3 justify-center md:justify-start">
              <button onClick={(e) => { e.stopPropagation(); navigateTo('Projects') }} className="px-3 py-1.5 md:px-4 md:py-2 rounded-md bg-white/10 hover:bg-white/20">View projects</button>
              <button onClick={(e) => { e.stopPropagation(); navigateTo('ReachMe') }} className="px-3 py-1.5 md:px-4 md:py-2 rounded-md border border-white/10">Contact me</button>
            </div>


          </div>
        </div>
      );
    }

    if (title === 'MyCareer') {
      return (
        <div className="w-full h-full p-3 md:p-6 flex flex-col md:flex-row justify-start gap-4 md:gap-6 text-left career-panel overflow-hidden min-h-0" onClick={stop}>
          <div className="flex-1 p-3 md:p-6 glass-card rough-bg shadow-lg min-h-[220px] md:min-h-[420px] min-h-0 flex-shrink-0">
            <div className="content h-full flex flex-col">
              <div className="text-lg md:text-2xl font-semibold mb-4 career-heading">Education</div>

              <div className="timeline flex-1 panel-scrollable">
                <ul className="timeline-list">
                  <li className="timeline-item">
                    <div className="timeline-dot" />
                    <div className="timeline-body">
                      <div className="timeline-title">Dholakiya School</div>
                      <div className="timeline-sub">Gujrat 10th Board</div>
                    </div>
                  </li>

                  <li className="timeline-item">
                    <div className="timeline-dot" />
                    <div className="timeline-body">
                      <div className="timeline-title">Diploma (CE) — Marwadi University</div>
                      <div className="timeline-sub">Computer Engineering</div>
                    </div>
                  </li>

                  <li className="timeline-item">
                    <div className="timeline-dot" />
                    <div className="timeline-body">
                      <div className="timeline-title">B.Tech (CSE) — Marwadi University</div>
                      <div className="timeline-sub">Computer Science & Engineering</div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex-1 p-3 md:p-6 glass-card rough-bg shadow-lg min-h-[220px] md:min-h-[420px] min-h-0 flex-shrink-0">
            <div className="content h-full flex flex-col">
              <div className="text-lg md:text-2xl font-semibold mb-4 career-heading">Internships</div>

              <div className="timeline flex-1 panel-scrollable">
                <ul className="timeline-list">
                  <li className="timeline-item">
                    <div className="timeline-dot" />
                    <div className="timeline-body">
                      <div className="timeline-title">Orscope Technology</div>
                      <div className="timeline-sub">UI/UX Developer</div>
                      <div className="text-xs opacity-80 mt-1">Worked on designing interfaces apple watch UI for a software</div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (title === 'Expertise') {
      const techs = ['N8N', 'Android', 'JavaScript (React , Node)', 'Python', 'Java', 'C++', 'Web Development', 'SQL', 'Firebase', 'Figma'];
      return (
        <div className="w-full h-full p-6 panel-fill flex flex-col gap-4" onClick={stop}>
          <div className="text-xl md:text-2xl font-semibold">Expertise</div>

          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 items-stretch expertise-grid" style={{ gridAutoRows: 'minmax(64px, auto)' }}>
            {techs.map((t) => (
              <div key={t} className="glass-card flex items-center justify-center p-4 md:p-6">
                <div className="content text-xs sm:text-xs md:text-sm text-center break-words">{t}</div>
              </div>
            ))}
          </div>

          <div className="mt-2 md:mt-4 text-xs md:text-sm opacity-90">Focused on full-stack web & app development, UI design, and applying ML to real problems.</div>
        </div>
      );
    }

    if (title === 'Projects') {
      const projects = [
        { name: 'StackInit', url: 'https://example.com/project1', desc: 'Very Helpfull To Developer' },
        { name: 'Student Grade Management System - Desktop Application ', url: 'https://example.com/project2' ,desc: 'Student can view and faculty can add marks or update marks.'},
        { name: 'Student & Teacher E-Content and Task Manangment System', url: 'https://example.com/project3', desc: 'Teacher Can upload and student can install materials , Task manager' },
        { name: 'KCW - A Mobile Application', url: 'https://example.com/project4' ,desc: 'Connects Consumer to Seller' },
        { name: 'Movie Recomandation System', url: 'https://example.com/project5' ,desc: 'Suggests movie according to your test'}
      ];
      return (
        <div className="w-full h-full p-4 md:p-6 panel-fill flex flex-col gap-2 md:gap-3" onClick={stop}>
          <div className="text-xl md:text-2xl font-semibold">Projects</div>

          <div className="mt-3 flex flex-col md:flex-row gap-3 md:gap-4 h-full">
            {/* featured */}
            <a
              href={projects[0].url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="glass-card md:w-1/2 h-36 md:h-full p-4 md:p-5 flex flex-col justify-center gap-2"
            >
              <div className="text-base md:text-xl font-semibold">{projects[0].name}</div>
              <div className="text-xs md:text-sm opacity-90">{projects[0].desc}</div>
            </a>

            {/* grid of others */}
            <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-4 flex-1">
              {projects.slice(1).map((p) => (
                <a
                  key={p.name}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="glass-card flex items-center justify-center h-28 md:h-32 text-xs md:text-sm text-white font-medium hover:scale-105 transition-transform duration-200 p-3 md:p-4"
                >
                  <div className="content">{p.name}</div>
                </a>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (title === 'ReachMe') {
      return (
        <div className="w-full h-full p-6 flex items-center justify-center" onClick={stop}>
          <div className="w-full max-w-md p-4 glass-card rough-bg">
            <div className="content">
              <div className="text-2xl md:text-3xl font-semibold">Reach Me</div>
              <form className="mt-4 flex flex-col gap-3" onSubmit={handleSubmit} onClick={stop}>
                <label className="text-sm md:text-base">Contact (Phone or Email)</label>
                <input className="p-2 rounded-md bg-transparent border border-white/10 text-white" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="e.g. +91 1234567890 or me@mail.com" required />

                <label className="text-sm md:text-base">Topic</label>
                <input className="p-2 rounded-md bg-transparent border border-white/10 text-white" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Short topic" required />

                <label className="text-sm md:text-base">Description <span className="text-xs opacity-80">(optional)</span></label>
                <textarea className="p-3 rounded-md bg-transparent border border-white/10 text-white md:text-lg" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="More details (optional)" rows={6} />

                <div className="flex justify-end mt-2">
                  <button type="submit" disabled={isSubmitting} className={`px-4 py-2 rounded-md ${isSubmitting ? 'bg-white/6 cursor-wait' : 'bg-white/10 hover:bg-white/20'}`}>
                    {isSubmitting ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div
      ref={rootRef}
      onClick={onClick}
      className={`${common} ${expanded ? expandedClasses : collapsedClasses}`}
      style={mergedStyle}
    >
      {!expanded ? (
        <div className="text-sm font-medium">{title}</div>
      ) : (
        <div className="w-full h-full text-white overflow-hidden">{renderExpandedContent()}</div>
      )}

      {/* rim glow (subtle radial) */}
      {!expanded && (
        <div
          style={{
            position: 'absolute',
            inset: -8,
            borderRadius: 14,
            background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.06), rgba(255,255,255,0.01) 40%, transparent 60%)',
            filter: 'blur(10px)',
            opacity: 0.9,
            pointerEvents: 'none'
          }}
        />
      )}

      {/* subtle shiny top highlight for collapsed bars */}
      {!expanded && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: 6,
            right: 6,
            height: 7,
            borderRadius: 8,
            background: 'linear-gradient(90deg, rgba(255,255,255,0.32), rgba(255,255,255,0.08))',
            opacity: 0.95,
            mixBlendMode: 'overlay',
            pointerEvents: 'none'
          }}
        />
      )}

      {/* lower soft gloss */}
      {!expanded && (
        <div
          style={{
            position: 'absolute',
            bottom: 3,
            left: 8,
            right: 8,
            height: 6,
            borderRadius: 6,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.06))',
            opacity: 0.9,
            pointerEvents: 'none'
          }}
        />
      )}
    </div>
  );
}

