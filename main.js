const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

const BASE_URL = "https://wiki.vc-mp.org";
const OUTPUT_DIR = "./docs-site";

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(`${OUTPUT_DIR}/pages`, { recursive: true });

// ---------------- FETCH ----------------
async function fetchHTML(url) {
  const { data } = await axios.get(url);
  return cheerio.load(data);
}

// ---------------- UTIL ----------------
function toFileName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "_") + ".html";
}

// ---------------- GET ITEMS (Functions + Events) ----------------
async function getItems(url, filter) {
  const $ = await fetchHTML(url);
  const items = [];

  $(".mw-parser-output ul li a").each((i, el) => {
    const name = $(el).text().trim();
    const href = $(el).attr("href");

    if (href && href.includes(filter)) {
      items.push({ name, url: BASE_URL + href, file: toFileName(name) });
    }
  });

  return items;
}

// ---------------- SCRAPE PAGE ----------------
async function scrapePage(item) {
  const $ = await fetchHTML(item.url);

  const notExist = $(".new").length > 0;
  const syntax = $("pre").first().text().trim() || "Not available";
  const example = $(".mw-highlight pre").text().trim() || "Not available";

  let argumentsText = "";
  $("#Arguments, #Description").each((i, el) => {
    argumentsText += $(el).parent().next("ul, p").text().trim() + "\n";
  });
  if (!argumentsText) argumentsText = "Not available";

  const related = [];
  $("#Related_Functions, #Related_Events")
    .parent()
    .next("ul")
    .find("a")
    .each((i, el) => {
      const name = $(el).text().trim();
      const href = $(el).attr("href");
      related.push({
        name,
        file: href ? toFileName(name) : "",
        notExist: href && href.includes("redlink=1"),
      });
    });

  return { ...item, syntax, arguments: argumentsText, example, related, notExist };
}

// ---------------- LAYOUT ----------------
function layout(title, content, allItems) {
  return `
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<link rel="stylesheet" href="../style.css">
</head>
<body>

<button class="toggle-sidebar-btn" onclick="toggleSidebar()">☰ Functions & Events</button>

<div class="container">
  <aside class="sidebar">
    <h2>Functions & Events</h2>
    <input type="text" id="search" placeholder="Search..." />
    <ul id="functionList">
      ${allItems
        .map(
          f =>
            `<li${f.notExist ? ' style="color:red;"' : ""}><a href="./${f.file}" data-name="${f.name.toLowerCase()}">${f.name}</a></li>`
        )
        .join("")}
    </ul>
  </aside>

  <main class="content">
    ${content}
  </main>
</div>

<script src="../script.js"></script>
</body>
</html>
`;
}

// ---------------- PAGE ----------------
function generatePage(data, allItems) {
  const content = `
<h1${data.notExist ? ' style="color:red;"' : ""}>${data.name}</h1>

<h2>Syntax</h2>
<pre>${data.syntax}</pre>

<h2>Arguments / Description</h2>
<pre>${data.arguments}</pre>

<h2>Example</h2>
<pre>${data.example}</pre>

${data.related.length ? `<h2>Related</h2><ul>${data.related
    .map(
      r =>
        `<li${r.notExist ? ' style="color:red;"' : ""}><a href="./${r.file}">${r.name}</a></li>`
    )
    .join("")}</ul>` : ""}
`;
  return layout(data.name, content, allItems);
}

// ---------------- INDEX ----------------
function generateIndex(allItems) {
  const content = `<h1>VC-MP Docs</h1><p>Select a function or event from the sidebar.</p>`;
  return layout("VC-MP Docs", content, allItems);
}

// ---------------- CSS ----------------
function generateCSS() {
  return `
body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: linear-gradient(135deg, #ffc0cb, #00bfff);
  color: #111;
}

.container {
  display: flex;
  flex-direction: row;
  height: 100vh;
}

.sidebar {
  width: 260px;
  background: rgba(255,255,255,0.85);
  padding: 15px;
  overflow-y: auto;
  border-right: 1px solid rgba(0,0,0,0.2);
  transition: transform 0.3s ease;
}

.sidebar input {
  width: 100%;
  padding: 8px;
  margin-bottom: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  background: white;
}

.sidebar ul { list-style: none; padding: 0; }
.sidebar a { color: #ff69b4; text-decoration: none; font-size: 14px; }
.sidebar a:hover { text-decoration: underline; }

.content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: rgba(255,255,255,0.85);
  border-radius: 10px;
  margin: 10px;
}

pre {
  background: rgba(0,0,0,0.05);
  padding: 10px;
  border-radius: 6px;
  overflow-x: auto;
}

/* Mobile */
@media screen and (max-width: 768px) {
  .container { flex-direction: column; }
  .sidebar {
    width: 100%;
    height: auto;
    transform: translateY(-100%);
    position: fixed;
    z-index: 100;
  }
  .sidebar.show { transform: translateY(0); }
  .toggle-sidebar-btn {
    display: block;
    padding: 10px 20px;
    background: #ff69b4;
    color: white;
    border: none;
    font-weight: bold;
    cursor: pointer;
    width: 100%;
  }
}
`;
}

// ---------------- SEARCH + TOGGLE SCRIPT ----------------
function generateScript() {
  return `
const search = document.getElementById("search");
const items = document.querySelectorAll("#functionList li");

search.addEventListener("input", () => {
  const value = search.value.toLowerCase();
  items.forEach(li => {
    const name = li.innerText.toLowerCase();
    li.style.display = name.includes(value) ? "" : "none";
  });
});

function toggleSidebar() {
  document.querySelector(".sidebar").classList.toggle("show");
}
`;
}

// ---------------- MAIN ----------------
(async () => {
  console.log("Fetching Functions...");
  const functions = await getItems(`${BASE_URL}/wiki/Scripting/Squirrel/Functions`, "/Scripting/Squirrel/Functions/");
  console.log("Fetching Events...");
  const events = await getItems(`${BASE_URL}/wiki/Scripting/Squirrel/Events`, "/wiki/");

  const allItems = [...functions, ...events];

  for (const item of allItems) {
    console.log("Scraping:", item.name);
    try {
      const data = await scrapePage(item);
      fs.writeFileSync(`${OUTPUT_DIR}/pages/${data.file}`, generatePage(data, allItems));
    } catch (err) {
      console.log("Failed:", item.name, err.message);
    }
  }

  fs.writeFileSync(`${OUTPUT_DIR}/index.html`, generateIndex(allItems));
  fs.writeFileSync(`${OUTPUT_DIR}/style.css`, generateCSS());
  fs.writeFileSync(`${OUTPUT_DIR}/script.js`, generateScript());

  console.log("✅ Docs generated! Open docs-site/index.html");
})();