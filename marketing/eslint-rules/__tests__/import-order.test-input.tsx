// TEST CASE 1: Misordered imports (BEFORE auto-fix)
// This file demonstrates imports that violate the ordering rules

import type { Route } from "./+types/route";
import { Button } from "~/ui/button";
import { useState } from "react";
import { Link } from "~/components/link";
import { format } from "date-fns";
import { parseSocialLink } from "~/lib/social-links";
import { IconCheckmark1, IconHome } from "@central-icons/outlined";
import { Card } from "~/ui/card";
import { AnotherComponent } from "./another-component";
import { useLoaderData } from "react-router";

export function TestComponent() {
  return <div>Test</div>;
}
