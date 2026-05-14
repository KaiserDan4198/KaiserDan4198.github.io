/*
  Premier League Live Hub configuration.

  Real-time data needs API keys. Keep public demo keys limited and rotate them.
  For production, use a small backend/proxy so private keys are never exposed in
  the browser. This static version reads keys from this file to keep setup easy.
*/
window.PREMIER_APP_CONFIG = {
  league: {
    name: "Premier League",
    footballDataCode: "PL",
    sportsDbLeagueId: "4328",
    seasonLabel: "2025-26"
  },
  apis: {
    // Get a key at https://www.football-data.org/client/register
    // Used for official standings and match data.
    footballDataKey: "",

    // TheSportsDB public example key. Replace with your own key for higher limits.
    // Docs: https://www.thesportsdb.com/documentation
    sportsDbKey: "123",

    // Get a key at https://newsapi.org/register
    // NewsAPI may require a backend proxy for production deployments.
    newsApiKey: ""
  },
  refresh: {
    liveMs: 60000,
    fullMs: 300000
  },
  news: {
    query: "\"Premier League\" OR Arsenal OR Liverpool OR Chelsea OR \"Manchester City\"",
    language: "en",
    pageSize: 8
  }
};
