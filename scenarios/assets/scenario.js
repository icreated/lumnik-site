// Without this script every step is shown in sequence; with it, one step at a time.
document.documentElement.classList.add("js");

const steps = [...document.querySelectorAll(".step")];
const links = [...document.querySelectorAll(".steps-nav a")];

function showStep(id) {
  if (!steps.some((s) => s.id === `step-${id}`)) return;
  steps.forEach((s) => s.toggleAttribute("data-inactive", s.id !== `step-${id}`));
  links.forEach((a) => (a.dataset.step === id ? a.setAttribute("aria-current", "step") : a.removeAttribute("aria-current")));
}

links.forEach((a) =>
  a.addEventListener("click", (e) => {
    e.preventDefault();
    showStep(a.dataset.step);
    history.replaceState(null, "", a.hash);
  })
);
showStep(location.hash.replace("#step-", "") || links[0]?.dataset.step);

// The page tabs: the walkthrough first, the brief when the link asks for it (#brief).
const brief = document.getElementById("brief");
if (brief) {
  const onBrief = location.hash === "#brief";
  brief.hidden = !onBrief;
  document.getElementById("walkthrough").hidden = onBrief;
  document.getElementById("brief-tab").setAttribute("aria-selected", String(onBrief));
  document.getElementById("walkthrough-tab").setAttribute("aria-selected", String(!onBrief));
}

document.querySelectorAll('[role="tablist"]').forEach((list) => {
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const select = (tab) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    tab.focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (e) => {
      const move = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (move) select(tabs[(i + move + tabs.length) % tabs.length]);
    });
  });
});

document.querySelectorAll("[data-copy]").forEach((button) =>
  button.addEventListener("click", async () => {
    const code = button.closest(".file").nextElementSibling.querySelector("code");
    try {
      await navigator.clipboard.writeText(code.innerText);
      const label = button.textContent;
      button.textContent = "✓";
      setTimeout(() => (button.textContent = label), 1500);
    } catch {
      /* clipboard refused: the text stays selectable */
    }
  })
);
