export function wrapIndex(index, delta, count) {
  if (count < 1) throw new RangeError("a carousel needs at least one slide");
  return ((index + delta) % count + count) % count;
}

export function swipeDelta(startX, endX, threshold = 48) {
  const distance = startX - endX;
  if (Math.abs(distance) < threshold) return 0;
  return distance > 0 ? 1 : -1;
}

export function allowsAutoplay(reducedMotion) {
  return !reducedMotion;
}

export function initCarousel(root, { intervalMs = 8000 } = {}) {
  const slides = [...root.querySelectorAll("[data-carousel-slide]")];
  const dots = [...root.querySelectorAll("[data-carousel-dot]")];
  const previous = root.querySelector("[data-carousel-prev]");
  const next = root.querySelector("[data-carousel-next]");
  const status = root.querySelector("[data-carousel-status]");
  const listeners = [];
  let active = Math.max(0, slides.findIndex((slide) => !slide.hidden));
  let pointerStart = null;
  let timer = null;
  let autoplayStopped = false;

  if (slides.length < 1) return () => {};
  root.dataset.carouselReady = "true";

  const listen = (target, event, handler) => {
    if (!target) return;
    target.addEventListener(event, handler);
    listeners.push(() => target.removeEventListener(event, handler));
  };

  const show = (index) => {
    active = wrapIndex(index, 0, slides.length);
    slides.forEach((slide, slideIndex) => {
      slide.hidden = slideIndex !== active;
    });
    dots.forEach((dot, dotIndex) => {
      dot.setAttribute("aria-current", String(dotIndex === active));
    });
    if (status) {
      const caption = slides[active].querySelector("figcaption")?.textContent.trim() ?? "";
      status.textContent = `Visuel ${active + 1} sur ${slides.length}. ${caption}`;
    }
  };

  const stopAutoplay = () => {
    autoplayStopped = true;
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  };

  const move = (delta, deliberate = true) => {
    if (deliberate) stopAutoplay();
    show(wrapIndex(active, delta, slides.length));
  };

  listen(previous, "click", () => move(-1));
  listen(next, "click", () => move(1));
  dots.forEach((dot) => {
    listen(dot, "click", () => {
      stopAutoplay();
      show(Number(dot.dataset.carouselIndex));
    });
  });
  listen(root, "keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(-1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      move(1);
    }
  });
  listen(root, "mouseenter", stopAutoplay);
  listen(root, "focusin", stopAutoplay);
  listen(root, "pointerdown", (event) => {
    stopAutoplay();
    pointerStart = event.clientX;
  });
  listen(root, "pointerup", (event) => {
    if (pointerStart === null) return;
    const delta = swipeDelta(pointerStart, event.clientX);
    pointerStart = null;
    if (delta !== 0) move(delta);
  });
  listen(root, "pointercancel", () => {
    pointerStart = null;
  });

  show(active);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!autoplayStopped && slides.length > 1 && allowsAutoplay(reducedMotion)) {
    timer = window.setInterval(() => move(1, false), intervalMs);
  }

  return () => {
    stopAutoplay();
    listeners.forEach((remove) => remove());
  };
}

if (typeof document !== "undefined") {
  document.querySelectorAll("[data-carousel]").forEach((root) => initCarousel(root));
}
