import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

function HelloCanopy() {
  return <div>Hello Canopy</div>;
}

describe("Smoke test", () => {
  it("renders Hello Canopy", () => {
    const { getByText } = render(<HelloCanopy />);
    expect(getByText("Hello Canopy")).toBeInTheDocument();
  });
});
