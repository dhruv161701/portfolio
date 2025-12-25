import { useState, useEffect, useRef } from "react";
import NowBar from "./NowBar.jsx";

export default function App() {
  const sectionsData = [
    { title: "Introduction", color: "#1f512b" },
    { title: "MyCareer", color: "#1e40af" },
    { title: "Expertise", color: "#6b21a8" },
    { title: "Projects", color: "#b45309" },
    { title: "ReachMe", color: "#7f1d1d" },
  ];

  const [sections, setSections] = useState(
    sectionsData.map((s, i) => ({
      ...s,
      status: i === 0 ? "current" : "unvisited",
    }))
  );

  const goToSection = (targetIndex) => {
    const newSections = sections.map((s, i) => {
      if (i < targetIndex) return { ...s, status: "visited" };
      if (i === targetIndex) return { ...s, status: "current" };
      return { ...s, status: "unvisited" };
    });
    setSections(newSections);
  };

  // scroll navigation (wheel) — improved sensitivity handling for trackpads and mice
  useEffect(() => {
    let isThrottled = false;
    let accumulator = 0;
    const THRESHOLD = 330; // amount of deltaY required to change one section

    const handler = (e) => {
      if (isThrottled) return;

      // reset accumulator if direction changes
      if (accumulator && Math.sign(accumulator) !== Math.sign(e.deltaY)) accumulator = 0;
      accumulator += e.deltaY;

      // only trigger when accumulated delta exceeds threshold
      if (Math.abs(accumulator) >= THRESHOLD) {
        isThrottled = true;
        setTimeout(() => (isThrottled = false), 900);

        const currentIndex = sections.findIndex((s) => s.status === "current");
        if (accumulator > 0) {
          // scroll down
          if (currentIndex < sections.length - 1) {
            goToSection(currentIndex + 1);
          }
          // if already at last, do nothing (no reset)
        } else {
          // scroll up
          if (currentIndex > 0) goToSection(currentIndex - 1);
        }

        // reset accumulator after a triggering scroll
        accumulator = 0;
      }
    };

    window.addEventListener("wheel", handler, { passive: true });
    return () => window.removeEventListener("wheel", handler);
  }, [sections]);

  const visitedBars = sections.filter((s) => s.status === "visited");
  const currentBar = sections.find((s) => s.status === "current");
  const unvisitedBars = sections.filter((s) => s.status === "unvisited");

  const STACK_OFFSET = 8; // px between stacked bars

  // viewport sizing to compute absolute positions so bars persist and animate in place
  const getViewport = () => ({ w: window.visualViewport?.width || window.innerWidth, h: window.visualViewport?.height || window.innerHeight });
  const [viewport, setViewport] = useState(getViewport);
  const containerRef = useRef(null); // used to attach swipe handlers
  const swipeThrottle = useRef(false);
  const swipeState = useRef({ startY: 0, startTime: 0, scrollEl: null });

  useEffect(() => {
    const update = () => setViewport(getViewport());
    // prefer visualViewport where available (handles mobile address bar changes)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', update);
      window.visualViewport.addEventListener('scroll', update);
      window.addEventListener('resize', update); // fallback
      return () => {
        window.visualViewport.removeEventListener('resize', update);
        window.visualViewport.removeEventListener('scroll', update);
        window.removeEventListener('resize', update);
      };
    }

    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // listen for CTA navigation events from inner components
  useEffect(() => {
    const handler = (e) => {
      const name = e.detail;
      const idx = sections.findIndex((s) => s.title === name);
      if (idx >= 0) goToSection(idx);
    };
    window.addEventListener('goToSection', handler);
    return () => window.removeEventListener('goToSection', handler);
  }, [sections]);

  // Swipe navigation: vertical swipe up => next section, swipe down => previous section
  useEffect(() => {
    const el = containerRef.current || window;

    const onTouchStart = (e) => {
      const t = e.touches && e.touches[0];
      if (!t) return;
      swipeState.current.startY = t.clientY;
      swipeState.current.startTime = Date.now();
      // record a scrollable ancestor if present so we can avoid interfering with inner scrolls
      swipeState.current.scrollEl = e.target && e.target.closest ? e.target.closest('.panel-scrollable') : null;
    };

    const onTouchEnd = (e) => {
      const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
      if (!t) return;
      const dy = swipeState.current.startY - t.clientY; // positive -> swipe up
      const elapsed = Date.now() - swipeState.current.startTime;

      const SWIPE_THRESHOLD = 70; // px
      if (Math.abs(dy) < SWIPE_THRESHOLD) return;
      if (swipeThrottle.current) return;

      // check inner scrollable element bounds: only navigate when inner element is at its edge
      const sc = swipeState.current.scrollEl;
      if (sc && sc.scrollHeight > sc.clientHeight) {
        if (dy > 0) {
          // swipe up -> only navigate if sc at bottom
          if (sc.scrollTop + sc.clientHeight < sc.scrollHeight - 1) return;
        } else {
          // swipe down -> only navigate if sc at top
          if (sc.scrollTop > 0) return;
        }
      }

      swipeThrottle.current = true;
      setTimeout(() => (swipeThrottle.current = false), 700);

      const currentIndex = sections.findIndex((s) => s.status === 'current');
      if (dy > 0) {
        // swipe up => next
        if (currentIndex < sections.length - 1) goToSection(currentIndex + 1);
      } else {
        // swipe down => previous
        if (currentIndex > 0) goToSection(currentIndex - 1);
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [sections, goToSection]);

  const viewportH = Math.max(320, viewport.h - 48); // subtract small margin to avoid mobile chrome overflow
  const TOP_H = viewportH * 0.10;
  const MID_H = viewportH * 0.80;
  const BOTTOM_H = viewportH * 0.10;

  // collapsed bar height in px (h-12 -> 3rem -> 48px)
  const COLLAPSED_H = 48;
  const EXPANDED_H = MID_H * 0.92; // match min-h-[80vh] and inner padding

  // helper to clamp values and compute a section's top px coordinate
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // compute dynamic spacing so stacks never overflow their area
  const visitedCount = visitedBars.length;
  const unvisitedCount = unvisitedBars.length;
  const PADDING = 8; // inner padding in px

  // compute safe expanded panel area
  const centeredTop = TOP_H + (MID_H - EXPANDED_H) / 2;
  const EXP_PADDING = 8;
  const expandedTop = clamp(centeredTop, TOP_H + PADDING, TOP_H + MID_H - EXPANDED_H - PADDING);
  const expandedBottom = expandedTop + EXPANDED_H;

  // visited zone: [visitedMin, visitedMax] within TOP_H area but never entering expanded area
  const visitedMin = PADDING;
  const visitedMax = Math.min(TOP_H - COLLAPSED_H - PADDING, expandedTop - COLLAPSED_H - EXP_PADDING);
  const visitedZoneHeight = Math.max(0, visitedMax - visitedMin);
  let visitedSpacing = STACK_OFFSET;
  if (visitedCount > 1) {
    visitedSpacing = visitedZoneHeight > 0 ? Math.min(STACK_OFFSET, visitedZoneHeight / (visitedCount - 1)) : 0; // allow overlap (spacing=0) if needed
  }

  // unvisited zone: [unvisitedMin, unvisitedMax] within BOTTOM_H area but never entering expanded area
  const unvisitedMin = Math.max(TOP_H + MID_H + PADDING, expandedBottom + EXP_PADDING);
  const unvisitedMax = TOP_H + MID_H + BOTTOM_H - COLLAPSED_H - PADDING;
  const unvisitedZoneHeight = Math.max(0, unvisitedMax - unvisitedMin);
  let unvisitedSpacing = STACK_OFFSET;
  if (unvisitedCount > 1) {
    unvisitedSpacing = unvisitedZoneHeight > 0 ? Math.min(STACK_OFFSET, unvisitedZoneHeight / (unvisitedCount - 1)) : 0;
  }

  const computeTop = (s) => {
    if (s.status === "current") {
      return expandedTop;
    }

    if (s.status === "visited") {
      const idx = visitedBars.findIndex((b) => b.title === s.title);
      const idxFromTop = visitedCount - 1 - idx; // 0 = most recent visited (closest to mid)
      const desired = visitedMax - idxFromTop * visitedSpacing;
      return clamp(desired, visitedMin, visitedMax);
    }

    // unvisited — determine order relative to the current section so nearest unvisited is closest to the expanded panel
    const originalIndex = sections.findIndex((sec) => sec.title === s.title);
    const currentIdx = sections.findIndex((sec) => sec.status === 'current');
    const idxFromCurrent = Math.max(0, originalIndex - currentIdx - 1);
    const desiredUn = unvisitedMin + idxFromCurrent * unvisitedSpacing;
    return clamp(desiredUn, unvisitedMin, unvisitedMax);
  };

  return (
    <div ref={containerRef} className="app-viewport relative overflow-hidden" style={{ height: `${viewport.h}px`, background: 'radial-gradient(circle at 10% 10%, #071229 0%, #000000 40%)' }}>
      {/* render all sections in a single stacking area so they animate in place */}
      {sections.map((s) => {
        const isCurrent = s.status === "current";
        const top = computeTop(s);
        const style = {
          top: `${top}px`,
          width: isCurrent ? `${viewport.w * 0.9}px` : undefined,
          height: isCurrent ? `${EXPANDED_H}px` : undefined,
          transition: 'top 900ms cubic-bezier(.2,.9,.2,1), height 900ms cubic-bezier(.2,.9,.2,1), width 900ms cubic-bezier(.2,.9,.2,1)',
        }; 

        // compute z-index so items nearer to expanded panel render on top
        const currentIndex = sections.findIndex((sec) => sec.status === 'current');
        const originalIndex = sections.findIndex((sec) => sec.title === s.title);
        let z = 200;
        if (s.status === 'current') z = 700;
        else if (s.status === 'visited') {
          const idxFromCurrent = Math.max(0, currentIndex - originalIndex - 1);
          z = 500 - idxFromCurrent; // more recently visited (closer to current) get higher z
        } else {
          const idxFromCurrent = Math.max(0, originalIndex - currentIndex - 1);
          z = 400 + (unvisitedCount - idxFromCurrent); // nearer unvisited have higher z
        }

        return (
          <NowBar
            key={s.title}
            title={s.title}
            color={s.color}
            expanded={isCurrent}
            onClick={() => goToSection(sections.indexOf(s))}
            zIndex={z}
            style={style}
          />
        );
      })}
    </div>
  );
}