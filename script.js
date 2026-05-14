const teams = [
  { name: "Madrid Solaris", pj: 14, g: 10, e: 2, p: 2, pts: 32 },
  { name: "Inter Nova", pj: 14, g: 9, e: 3, p: 2, pts: 30 },
  { name: "Atlas City", pj: 14, g: 8, e: 4, p: 2, pts: 28 },
  { name: "Royal Lisbon", pj: 14, g: 7, e: 4, p: 3, pts: 25 },
  { name: "Bayern Kronen", pj: 14, g: 6, e: 5, p: 3, pts: 23 },
  { name: "Olympique Azure", pj: 14, g: 5, e: 4, p: 5, pts: 19 },
  { name: "Valencia Norte", pj: 14, g: 4, e: 3, p: 7, pts: 15 },
  { name: "Dynamo Verona", pj: 14, g: 3, e: 4, p: 7, pts: 13 }
];

const players = [
  {
    name: "Mateo Aranda",
    position: "Delantero centro",
    rating: 92,
    photo: "assets/player-mateo.svg"
  },
  {
    name: "Thiago Morel",
    position: "Mediocampista",
    rating: 90,
    photo: "assets/player-thiago.svg"
  },
  {
    name: "Leon Valcarce",
    position: "Extremo derecho",
    rating: 89,
    photo: "assets/player-leon.svg"
  },
  {
    name: "Bruno Salvat",
    position: "Defensa central",
    rating: 88,
    photo: "assets/player-bruno.svg"
  }
];

const standingsBody = document.querySelector("#standingsBody");
const playersGrid = document.querySelector("#playersGrid");
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");
const simulateBtn = document.querySelector("#simulateBtn");
const homeTeam = document.querySelector("#homeTeam");
const awayTeam = document.querySelector("#awayTeam");
const homeScore = document.querySelector("#homeScore");
const awayScore = document.querySelector("#awayScore");
const winnerText = document.querySelector("#winnerText");
const scoreboard = document.querySelector(".scoreboard");

function getInitials(name) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function renderStandings() {
  standingsBody.innerHTML = teams
    .map(
      (team) => `
        <tr>
          <td>
            <span class="club-cell">
              <span class="club-badge">${getInitials(team.name)}</span>
              ${team.name}
            </span>
          </td>
          <td>${team.pj}</td>
          <td>${team.g}</td>
          <td>${team.e}</td>
          <td>${team.p}</td>
          <td><strong>${team.pts}</strong></td>
        </tr>
      `
    )
    .join("");
}

function renderPlayers() {
  playersGrid.innerHTML = players
    .map(
      (player) => `
        <article class="player-card reveal">
          <div class="player-photo">
            <img src="${player.photo}" alt="Retrato ilustrado de ${player.name}" />
            <span class="rating">${player.rating}</span>
          </div>
          <div class="player-info">
            <h3>${player.name}</h3>
            <p>${player.position}</p>
          </div>
        </article>
      `
    )
    .join("");
}

function randomScore() {
  const chance = Math.random();

  // Los marcadores bajos son mas realistas, con una pequena posibilidad de goleada.
  if (chance > 0.92) return Math.floor(Math.random() * 3) + 4;
  return Math.floor(Math.random() * 4);
}

function pickMatchTeams() {
  const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
  return [shuffledTeams[0], shuffledTeams[1]];
}

function simulateMatch() {
  const [home, away] = pickMatchTeams();
  const goalsHome = randomScore();
  const goalsAway = randomScore();

  homeTeam.textContent = home.name;
  awayTeam.textContent = away.name;
  winnerText.textContent = "Calculando intensidad, forma y precision...";
  scoreboard.classList.add("is-rolling");
  simulateBtn.disabled = true;

  let ticks = 0;
  const roll = window.setInterval(() => {
    homeScore.textContent = Math.floor(Math.random() * 6);
    awayScore.textContent = Math.floor(Math.random() * 6);
    ticks += 1;

    if (ticks >= 12) {
      window.clearInterval(roll);
      homeScore.textContent = goalsHome;
      awayScore.textContent = goalsAway;
      scoreboard.classList.remove("is-rolling");
      simulateBtn.disabled = false;

      if (goalsHome > goalsAway) {
        winnerText.textContent = `${home.name} gana con autoridad: ${goalsHome}-${goalsAway}.`;
      } else if (goalsAway > goalsHome) {
        winnerText.textContent = `${away.name} conquista la noche: ${goalsAway}-${goalsHome}.`;
      } else {
        winnerText.textContent = `Empate intenso: ${goalsHome}-${goalsAway}. Todo queda abierto.`;
      }
    }
  }, 90);
}

function setupRevealAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
}

function setupNavigation() {
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

renderStandings();
renderPlayers();
setupNavigation();
setupRevealAnimations();
simulateBtn.addEventListener("click", simulateMatch);
