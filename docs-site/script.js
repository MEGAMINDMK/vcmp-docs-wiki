// Search filter
const search = document.getElementById("search");
const items = document.querySelectorAll("#functionList li");

search.addEventListener("input", () => {
  const value = search.value.toLowerCase();
  items.forEach(li => {
    const name = li.innerText.toLowerCase();
    li.style.display = name.includes(value) ? "" : "none";
  });
});

// Toggle sidebar for desktop and mobile
function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");

  if (window.innerWidth <= 768) {
    // Mobile: toggle vertical slide
    sidebar.classList.toggle("show");
  } else {
    // Desktop: toggle horizontal slide
    sidebar.classList.toggle("hide");
  }
}

// Optional: auto-hide sidebar on resize (desktop -> mobile or mobile -> desktop)
window.addEventListener("resize", () => {
  const sidebar = document.querySelector(".sidebar");
  sidebar.classList.remove("show");
  sidebar.classList.remove("hide");
});