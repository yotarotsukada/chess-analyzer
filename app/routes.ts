import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("new", "routes/new.tsx"),
  route("g/:id", "routes/game.tsx"),
  route("g/:id/manage", "routes/manage.tsx"),
  route("api/games/:id/status", "routes/api.game-status.ts"),
  route("privacy", "routes/privacy.tsx"),
] satisfies RouteConfig;
