(async function () {
  const jsonPath = "Cassette-Setlist Background/cassette.setlist.background.json";

  async function loadList() {
    const response = await fetch(jsonPath);
    return await response.json();
  }

  function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function applyBackground(file) {
    const app = document.querySelector("#app");
    app.style.backgroundImage = `url("Cassette-Setlist Background/${file}")`;
    app.style.backgroundSize = "cover";
    app.style.backgroundPosition = "center";
    app.style.backgroundRepeat = "no-repeat";

    document.querySelectorAll(".settings-overlay").forEach(el => {
      el.style.backgroundColor = "rgba(0,0,0,0.85)";
      el.style.backdropFilter = "blur(4px)";
    });
  }

  const list = await loadList();
  if (!Array.isArray(list) || list.length === 0) {
    console.error("No background images found.");
    return;
  }

  applyBackground(pickRandom(list));

  function scheduleNextChange() {
    const delay = Math.random() * (10 * 60 * 1000);

    setTimeout(() => {
      applyBackground(pickRandom(list));
      scheduleNextChange(); // loop forever
    }, delay);
  }

  scheduleNextChange();
})();
