// TEST CASE 2: Complex imports properly ordered (AFTER auto-fix)

import { IconGlobe, IconChevronLeft } from "@central-icons/outlined";
import { motion } from "motion";
import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";

import { BlueskyBrandIcon } from "~/components/bluesky-brand-icon";
import { FacebookBrandIcon } from "~/components/facebook-brand-icon";
import { InstagramBrandIcon } from "~/components/instagram-brand-icon";
import { XBrandIcon } from "~/components/x-brand-icon";
import { YouTubeBrandIcon } from "~/components/youtube-brand-icon";

import { formatDate } from "~/lib/date-utils";
import { parseUrl } from "~/lib/url-parser";

import { Button } from "~/ui/button";
import { Card, CardHeader } from "~/ui/card";
import { Separator } from "~/ui/separator";

import type { Config } from "../config";
import type { LoaderData } from "./types";

export function ComplexComponent() {
  return <div>Complex Test</div>;
}
