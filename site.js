// lumnik.fr — micro-interactions (aucune dépendance)

// Barre de dégel : la lecture réchauffe la page.
const thermo = document.getElementById("thermometre");
if (thermo) {
  const maj = () => {
    const h = document.documentElement;
    const total = h.scrollHeight - h.clientHeight;
    thermo.style.width = total > 0 ? (h.scrollTop / total) * 100 + "%" : "0";
  };
  document.addEventListener("scroll", maj, { passive: true });
  maj();
}

// Révélation des sections au défilement.
const observer = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add("vu");
        observer.unobserve(e.target);
      }
    }
  },
  { threshold: 0.12 }
);
document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
