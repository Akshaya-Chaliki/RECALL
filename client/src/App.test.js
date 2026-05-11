/**
 * App.test.js — Ghost Test Scaffold (React Testing Library)
 *
 * Validates that the root <App /> component mounts without crashing.
 * Install dependencies before running:
 *   npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom
 *
 * Add to package.json scripts:
 *   "test": "vitest run"
 *
 * Run with:  npm test
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App Component", () => {
  it("renders without crashing", () => {
    // Basic smoke test — just verify the component tree mounts
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  it("displays the RECALL brand name somewhere in the tree", () => {
    render(<App />);
    // The login page (default unauthenticated route) should show "RECALL"
    const brandElement = screen.getByText(/RECALL/i);
    expect(brandElement).toBeTruthy();
  });
});
