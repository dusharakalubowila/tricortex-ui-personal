import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import StatusBadge from "../StatusBadge";

describe("StatusBadge", () => {
  it.each([
    ["active", "bg-green-100"],
    ["registered", "bg-blue-100"],
    ["stale", "bg-amber-100"],
    ["disabled", "bg-red-100"],
    ["completed", "bg-green-100"],
    ["failed", "bg-red-100"],
  ])("renders %s with a distinct, non-default color", (status, expectedClassFragment) => {
    render(<StatusBadge status={status} />);
    const badge = screen.getByText(status.replace(/_/g, " "));
    expect(badge.className).toContain(expectedClassFragment);
  });

  it("falls back to gray for an unrecognized status rather than throwing", () => {
    render(<StatusBadge status="totally_unknown_status" />);
    const badge = screen.getByText("totally unknown status");
    expect(badge.className).toContain("bg-gray-100");
  });
});
