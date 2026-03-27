import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

function HelloCanopy() {
  return <div>Hello Canopy</div>;
}

describe("Smoke test", () => {
  it("renders Hello Canopy", () => {
    render(<HelloCanopy />);
    expect(screen.getByText("Hello Canopy")).toBeInTheDocument();
  });
});
