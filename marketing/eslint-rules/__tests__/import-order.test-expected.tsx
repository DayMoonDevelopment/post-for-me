// TEST CASE 1: Properly ordered imports (AFTER auto-fix)
// This shows the expected order after running eslint --fix

import { IconCheckmark1, IconHome } from "@central-icons/outlined";
import { format } from "date-fns";
import { useState } from "react";
import { useLoaderData } from "react-router";

import { Link } from "~/components/link";

import { parseSocialLink } from "~/lib/social-links";

import { Button } from "~/ui/button";
import { Card } from "~/ui/card";

import { AnotherComponent } from "./another-component";

import type { Route } from "./+types/route";

export function TestComponent() {
  return <div>Test</div>;
}
