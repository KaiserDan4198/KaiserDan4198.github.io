const CONFIG = window.PREMIER_APP_CONFIG;

const state = {
  teamsByName: new Map(),
  fixturesTab: "next",
  fixtures: { today: [], next: [], past: [] },
  sourceStatus: {
    footballData: "warn",
    sportsDb: "warn",
    newsApi: "warn"
  }
};

const els = {
  loadingBar: document.querySelector("#loadingBar"),
  sourceStatus: document.querySelector("#sourceStatus"),
  dataHealth: document.querySelector("#dataHealth"),
  lastUpdated: document.querySelector("#lastUpdated"),
  liveMatches: document.querySelector("#liveMatches"),
  standingsBody: document.querySelector("#standingsBody"),
  fixturesList: document.querySelector("#fixturesList"),
  newsGrid: document.querySelector("#newsGrid"),
  navToggle: document.querySelector("#navToggle"),
  navLinks: document.querySelector("#navLinks"),
  refreshNow: document.querySelector("#refreshNow"),
  refreshLive: document.querySelector("#refreshLive")
};

const API = {
  footballData(path) {
    return requestJson(`https://api.football-data.org/v4${path}`, {
      headers: {
        "X-Auth-Token": CONFIG.apis.footballDataKey,
        "X-Unfold-Goals": "true"
      }
    });
  },
  sportsDb(path) {
    return requestJson(`https://www.thesportsdb.com/api/v1/json/${CONFIG.apis.sportsDbKey}${path}`);
  },
  news() {
    const params = new URLSearchParams({
      q: CONFIG.news.query,
      language: CONFIG.news.language,
      sortBy: "publishedAt",
      pageSize: String(CONFIG.news.pageSize),
      apiKey: CONFIG.apis.newsApiKey
    });

    return requestJson(`https://newsapi.org/v2/everything?${params.toString()}`);
  }
};

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
}

function setLoading(isLoading) {
  els.loadingBar.classList.toggle("is-loading", isLoading);
}

function setSource(name, status) {
  state.sourceStatus[name] = status;
  renderSourceStatus();
}

function renderSourceStatus() {
  const labels = {
    footballData: "football-data.org",
    sportsDb: "TheSportsDB",
    newsApi: "NewsAPI"
  };

  els.sourceStatus.innerHTML = Object.entries(state.sourceStatus)
    .map(([key, value]) => {
      const label = value === "ok" ? "Connected" : value === "error" ? "Error" : "Needs key";
      return `
        <div class="source-item">
          <span>${labels[key]}</span>
          <span class="status-pill status-${value}">${label}</span>
        </div>
      `;
    })
    .join("");

  const okCount = Object.values(state.sourceStatus).filter((value) => value === "ok").length;
  els.dataHealth.textContent = `${okCount}/3 sources connected`;
}

function teamBadge(name) {
  const normalized = normalizeName(name);
  const team = state.teamsByName.get(normalized);
  return team?.strBadge || "";
}

function normalizeName(name = "") {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/fc|afc|cf/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function badgeHtml(teamName) {
  const badge = teamBadge(teamName);
  if (!badge) return `<span class="brand-mark" aria-hidden="true">${teamName.slice(0, 2).toUpperCase()}</span>`;
  return `<img src="${badge}" alt="" loading="lazy" />`;
}

function formatDate(value) {
  if (!value) return "TBD";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatStatus(match) {
  const status = match.status || match.strStatus || "SCHEDULED";
  const minute = match.minute || match.intPlayed;
  if (minute) return `${minute}'`;
  return status.replaceAll("_", " ");
}

function scoreText(match) {
  const home = match.score?.fullTime?.home ?? match.intHomeScore;
  const away = match.score?.fullTime?.away ?? match.intAwayScore;
  if (home === null || home === undefined || away === null || away === undefined) return "vs";
  return `${home} - ${away}`;
}

function emptyState(title, body) {
  return `
    <div class="empty-state">
      <h3>${title}</h3>
      <p>${body}</p>
    </div>
  `;
}

async function loadTeams() {
  try {
    const data = await API.sportsDb(`/search_all_teams.php?l=English_Premier_League`);
    const teams = data.teams || [];
    state.teamsByName.clear();
    teams.forEach((team) => state.teamsByName.set(normalizeName(team.strTeam), team));
    setSource("sportsDb", "ok");
  } catch (error) {
    setSource("sportsDb", "error");
  }
}

async function loadStandings() {
  if (!CONFIG.apis.footballDataKey) {
    setSource("footballData", "warn");
    els.standingsBody.innerHTML = `
      <tr>
        <td colspan="8">Add your football-data.org key in config.js to load the real Premier League table.</td>
      </tr>
    `;
    return;
  }

  try {
    const data = await API.footballData(`/competitions/${CONFIG.league.footballDataCode}/standings`);
    const table = data.standings?.find((standing) => standing.type === "TOTAL")?.table || [];
    els.standingsBody.innerHTML = table
      .map((row) => {
        const club = row.team.shortName || row.team.name;
        return `
          <tr>
            <td>${row.position}</td>
            <td>
              <span class="club-cell">
                <img src="${row.team.crest}" alt="" loading="lazy" />
                ${club}
              </span>
            </td>
            <td>${row.playedGames}</td>
            <td>${row.won}</td>
            <td>${row.draw}</td>
            <td>${row.lost}</td>
            <td>${row.goalDifference}</td>
            <td><strong>${row.points}</strong></td>
          </tr>
        `;
      })
      .join("");
    setSource("footballData", "ok");
  } catch (error) {
    setSource("footballData", "error");
    els.standingsBody.innerHTML = `
      <tr><td colspan="8">Could not load real standings: ${error.message}</td></tr>
    `;
  }
}

async function loadLiveMatches() {
  if (!CONFIG.apis.footballDataKey) {
    els.liveMatches.innerHTML = emptyState(
      "Live API key required",
      "Add your football-data.org key in config.js to display live Premier League scores, status, goals and minute data."
    );
    return;
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const data = await API.footballData(
      `/competitions/${CONFIG.league.footballDataCode}/matches?dateFrom=${today}&dateTo=${today}`
    );
    const liveStatuses = new Set(["IN_PLAY", "PAUSED", "LIVE"]);
    const matches = (data.matches || []).filter((match) => liveStatuses.has(match.status));
    if (!matches.length) {
      els.liveMatches.innerHTML = emptyState(
        "No Premier League match is live right now",
        "This is real API output. The panel will update automatically when live data becomes available."
      );
      return;
    }
    els.liveMatches.innerHTML = matches.map(renderMatchCard).join("");
  } catch (error) {
    els.liveMatches.innerHTML = emptyState("Live data unavailable", error.message);
  }
}

function renderMatchCard(match) {
  const home = match.homeTeam?.shortName || match.homeTeam?.name || match.strHomeTeam;
  const away = match.awayTeam?.shortName || match.awayTeam?.name || match.strAwayTeam;
  const status = formatStatus(match);
  const score = scoreText(match);
  const goals = match.goals || [];
  const bookings = match.bookings || [];

  return `
    <article class="match-card reveal is-visible">
      <div class="match-top">
        <span>${match.competition?.name || "Premier League"}</span>
        <span class="status-pill status-ok">${status}</span>
      </div>
      <div class="team-line">
        <span class="team-name">${badgeHtml(home)}${home}</span>
      </div>
      <div class="team-line">
        <span class="team-name">${badgeHtml(away)}${away}</span>
        <span class="score">${score}</span>
      </div>
      <div class="events">
        ${goals.slice(0, 4).map((goal) => `<span>Goal ${goal.minute || ""}' ${goal.scorer?.name || ""}</span>`).join("")}
        ${bookings.slice(0, 3).map((card) => `<span>Card ${card.minute || ""}' ${card.player?.name || ""}</span>`).join("")}
        ${!goals.length && !bookings.length ? "<span>Goals and cards appear here when supplied by the API.</span>" : ""}
      </div>
    </article>
  `;
}

async function loadFixtures() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [todayData, nextData, pastData] = await Promise.all([
      API.sportsDb(`/eventsday.php?d=${today}&l=${CONFIG.league.sportsDbLeagueId}`),
      API.sportsDb(`/eventsnextleague.php?id=${CONFIG.league.sportsDbLeagueId}`),
      API.sportsDb(`/eventspastleague.php?id=${CONFIG.league.sportsDbLeagueId}`)
    ]);

    state.fixtures.today = todayData.events || [];
    state.fixtures.next = nextData.events || [];
    state.fixtures.past = pastData.events || [];
    setSource("sportsDb", "ok");
    renderFixtures();
  } catch (error) {
    setSource("sportsDb", "error");
    els.fixturesList.innerHTML = emptyState("Fixtures unavailable", error.message);
  }
}

function renderFixtures() {
  const fixtures = state.fixtures[state.fixturesTab] || [];
  if (!fixtures.length) {
    els.fixturesList.innerHTML = emptyState(
      "No fixtures returned for this filter",
      "TheSportsDB returned no Premier League events for the selected tab."
    );
    return;
  }

  els.fixturesList.innerHTML = fixtures
    .map((event) => {
      const home = event.strHomeTeam;
      const away = event.strAwayTeam;
      const date = event.strTimestamp || `${event.dateEvent}T${event.strTime || "00:00:00"}`;
      return `
        <article class="fixture-row">
          <div class="fixture-main">
            <span class="fixture-team">${badgeHtml(home)}${home}</span>
            <span class="fixture-score">${scoreText(event)}</span>
            <span class="fixture-team">${badgeHtml(away)}${away}</span>
          </div>
          <span class="fixture-meta">${formatDate(date)}</span>
        </article>
      `;
    })
    .join("");
}

async function loadNews() {
  if (!CONFIG.apis.newsApiKey) {
    setSource("newsApi", "warn");
    els.newsGrid.innerHTML = emptyState(
      "NewsAPI key required",
      "Add your NewsAPI key in config.js to load real Premier League headlines, dates, images and links."
    );
    return;
  }

  try {
    const data = await API.news();
    const articles = (data.articles || []).filter((article) => article.title && article.url);
    els.newsGrid.innerHTML = articles.length
      ? articles.map(renderNewsCard).join("")
      : emptyState("No news returned", "NewsAPI returned no articles for the configured query.");
    setSource("newsApi", "ok");
  } catch (error) {
    setSource("newsApi", "error");
    els.newsGrid.innerHTML = emptyState("News unavailable", error.message);
  }
}

function renderNewsCard(article) {
  const image = article.urlToImage || "assets/news-derby.svg";
  return `
    <article class="news-card reveal is-visible">
      <img src="${image}" alt="" loading="lazy" />
      <div class="news-body">
        <div class="news-meta">
          <span>${article.source?.name || "Football news"}</span>
          <span>${formatDate(article.publishedAt)}</span>
        </div>
        <h3><a href="${article.url}" target="_blank" rel="noopener noreferrer">${article.title}</a></h3>
        <p>${article.description || "Open the article for the full report."}</p>
      </div>
    </article>
  `;
}

async function refreshAll() {
  setLoading(true);
  await Promise.allSettled([loadTeams(), loadStandings(), loadLiveMatches(), loadFixtures(), loadNews()]);
  els.lastUpdated.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  setLoading(false);
}

function setupTabs() {
  document.querySelectorAll("[data-fixture-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-fixture-tab]").forEach((tab) => tab.classList.remove("is-active"));
      button.classList.add("is-active");
      state.fixturesTab = button.dataset.fixtureTab;
      renderFixtures();
    });
  });
}

function setupNav() {
  els.navToggle.addEventListener("click", () => {
    const isOpen = els.navLinks.classList.toggle("is-open");
    els.navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  els.navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      els.navLinks.classList.remove("is-open");
      els.navToggle.setAttribute("aria-expanded", "false");
    });
  });
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

renderSourceStatus();
setupNav();
setupTabs();
setupRevealAnimations();
els.refreshNow.addEventListener("click", refreshAll);
els.refreshLive.addEventListener("click", loadLiveMatches);
refreshAll();
window.setInterval(loadLiveMatches, CONFIG.refresh.liveMs);
window.setInterval(refreshAll, CONFIG.refresh.fullMs);
