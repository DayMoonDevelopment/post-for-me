// TEST CASE 3: Minimal imports (edge case - already properly ordered)
// This should not trigger any errors

import { useState } from "react";

export function MinimalComponent() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}
