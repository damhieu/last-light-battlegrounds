export function viewportMetrics(viewport, width, height) {
  const scale = Math.max(0.1, viewport?.scale || 1);
  return {
    width: Math.max(1, (viewport?.width || width) * scale),
    height: Math.max(1, (viewport?.height || height) * scale),
    left: viewport?.offsetLeft || 0,
    top: viewport?.offsetTop || 0,
    scale: 1 / scale,
  };
}
export function installViewport() {
  const style = document.documentElement.style;
  const update = () => {
    const v = viewportMetrics(window.visualViewport, innerWidth, innerHeight);
    for (const key of ["width", "height", "left", "top"])
      style.setProperty(`--viewport-${key}`, `${v[key]}px`);
    style.setProperty("--viewport-scale", v.scale);
    if (
      import.meta.env.DEV &&
      new URLSearchParams(location.search).has("safe")
    ) {
      const portrait = v.height > v.width;
      for (const [key, value] of Object.entries(
        portrait
          ? { top: 59, right: 0, bottom: 34, left: 0 }
          : { top: 0, right: 59, bottom: 21, left: 59 },
      ))
        style.setProperty(`--safe-${key}`, `${value}px`);
    }
  };
  update();
  addEventListener("resize", update);
  window.visualViewport?.addEventListener("resize", update);
  window.visualViewport?.addEventListener("scroll", update);
  addEventListener("orientationchange", () => {
    update();
    requestAnimationFrame(update);
  });
  // Multi-touch aiming must not zoom/pan the entire game in Safari.
  const surface = document.querySelector("#viewport");
  for (const type of ["gesturestart", "gesturechange", "gestureend"])
    surface.addEventListener(
      type,
      (e) => {
        if (!e.target.closest(".modal")) e.preventDefault();
      },
      { passive: false },
    );
}
