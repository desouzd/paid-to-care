// When arriving from another page with a #section in the URL (e.g. index.html#about),
// jump there after fonts and images finish loading, since they shift the layout.
(function () {
  if (!location.hash) return;
  const go = () => {
    const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
  };
  window.addEventListener("load", go);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
})();
