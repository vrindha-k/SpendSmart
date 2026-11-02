// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Button } from "./components/ui/button";
import { api, money } from "./api";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("keeps a disabled approval action inert", () => {
  const approve = vi.fn();
  render(
    <Button disabled onClick={approve}>
      Approve import
    </Button>,
  );
  fireEvent.click(screen.getByRole("button"));
  expect(approve).not.toHaveBeenCalled();
});
it("preserves link semantics for navigation", () => {
  render(
    <Button asChild>
      <a href="/statements">Import statement</a>
    </Button>,
  );
  expect(screen.getByRole("link")).toHaveAttribute("href", "/statements");
});
it("formats integer cents without treating them as dollars", () => {
  expect(money(1299)).toBe("$12.99");
  expect(money(-500)).toBe("-$5.00");
});
it("surfaces backend validation errors", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: false,
        json: async () => ({ detail: "Unsupported PDF" }),
      }),
  );
  await expect(api("/statements/preview")).rejects.toThrow("Unsupported PDF");
});
it("does not send JSON content type for multipart uploads", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ rows: [] }) });
  vi.stubGlobal("fetch", fetch);
  const form = new FormData();
  await api("/statements/preview", { method: "POST", body: form });
  expect(fetch.mock.calls[0][1].headers).toBeUndefined();
});
