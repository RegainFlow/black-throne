/**
 * The world without WebGL or JS: CSS smoke, grain and vignette. Used by lean pages
 * (/links, not-found) that live outside the (world) layout.
 */
export function StaticBackdrop() {
  return (
    <>
      <div aria-hidden="true" className="bt-world-fallback" />
      <div aria-hidden="true" className="bt-smoke-css" />
      <div aria-hidden="true" className="bt-vignette" />
      <div aria-hidden="true" className="bt-grain" />
    </>
  );
}
