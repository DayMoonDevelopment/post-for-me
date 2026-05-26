import { data } from "react-router";

const CACHE_HEADERS = {
  "cache-control": "no-store, max-age=0",
};

export const loader = () => data({ status: "ok" }, { headers: CACHE_HEADERS });
