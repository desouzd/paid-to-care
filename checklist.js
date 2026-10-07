// Checklist progress for the guide pages, saved in this browser only.
const KEY = "ptc-progress";
let saved = {};
try { saved = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}

function update(guide) {
  const items = document.querySelectorAll(`ol.steps[data-guide="${guide}"] > li`);
  let done = 0;
  items.forEach(li => {
    const on = !!saved[guide + ":" + li.dataset.step];
    li.querySelector("input").checked = on;
    li.classList.toggle("done", on);
    if (on) done++;
  });
  document.getElementById("bar-" + guide).style.width = (100 * done / items.length) + "%";
  document.getElementById("count-" + guide).textContent = `${done} of ${items.length} steps done`;
}

document.querySelectorAll("ol.steps").forEach(ol => {
  const guide = ol.dataset.guide;
  ol.addEventListener("change", e => {
    const li = e.target.closest("ol.steps > li");
    saved[guide + ":" + li.dataset.step] = e.target.checked;
    try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (err) {}
    update(guide);
  });
  update(guide);
});
