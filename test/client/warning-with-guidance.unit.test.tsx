// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WarningWithGuidance } from "../../src/client/components/shared/WarningWithGuidance.js";

describe("WarningWithGuidance", () => {
  it("renders warning copy, what-now guidance, and an optional link", () => {
    render(
      <WarningWithGuidance
        title="No required apps found for this target group."
        guidance="Review app assignments in Intune."
        link={{ label: "Open Intune", url: "https://intune.microsoft.com/" }}
      />
    );

    expect(screen.getByText("No required apps found for this target group.")).toBeInTheDocument();
    expect(screen.getByText(/What now:/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open intune/i })).toHaveAttribute(
      "href",
      "https://intune.microsoft.com/"
    );
  });
});
