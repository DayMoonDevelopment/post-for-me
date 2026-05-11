// TEST CASE 2: Complex imports with multiple from same modules (BEFORE auto-fix)

import { YouTubeBrandIcon } from "~/components/youtube-brand-icon";
import type { LoaderData } from "./types";
import { Card, CardHeader } from "~/ui/card";
import { motion } from "motion";
import { BlueskyBrandIcon } from "~/components/bluesky-brand-icon";
import { IconGlobe, IconChevronLeft } from "@central-icons/outlined";
import { FacebookBrandIcon } from "~/components/facebook-brand-icon";
import { Link as RouterLink } from "react-router-dom";
import { Button } from "~/ui/button";
import { parseUrl } from "~/lib/url-parser";
import { InstagramBrandIcon } from "~/components/instagram-brand-icon";
import { formatDate } from "~/lib/date-utils";
import type { Config } from "../config";
import { Separator } from "~/ui/separator";
import { XBrandIcon } from "~/components/x-brand-icon";
import { useEffect, useState } from "react";

export function ComplexComponent() {
  return <div>Complex Test</div>;
}
