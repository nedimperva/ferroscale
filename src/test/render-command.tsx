/**
 * Harness for component tests of the command bar.
 *
 * The bar's behaviour lives in keyboard routing, chip editing and suggestion
 * insertion — logic that only exists once React is driving it, and which the
 * vitest suites could not reach before (they cover the engine, parser and
 * stores; the components had e2e smoke coverage only). This mounts the real
 * `CommandShell` in jsdom with real messages, stubbing only what jsdom can't
 * provide (service worker registration, locale routing, clipboard).
 */

import { render, type RenderResult } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { vi } from "vitest";
import messages from "../../messages/en.json";

vi.mock("@/components/pwa-register", () => ({
  PwaRegister: () => null,
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

/** jsdom has no matchMedia, no clipboard and no layout — fill the gaps. */
export function installBrowserStubs({ width = 1280 }: { width?: number } = {}) {
  // Node ≥23 ships an experimental global `localStorage` that stays inert
  // without --localstorage-file, shadowing jsdom's working one. Give the
  // window a Map-backed stand-in so storage behaves on every Node.
  let storageUsable = false;
  try {
    window.localStorage.setItem("__probe", "1");
    window.localStorage.removeItem("__probe");
    storageUsable = true;
  } catch {
    storageUsable = false;
  }
  if (!storageUsable) {
    const mem = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => (mem.has(key) ? mem.get(key)! : null),
        setItem: (key: string, value: string) => void mem.set(key, String(value)),
        removeItem: (key: string) => void mem.delete(key),
        clear: () => void mem.clear(),
      },
    });
  }
  window.localStorage.clear();
  // The shell mirrors the query into the URL, and jsdom keeps that URL across
  // tests in a file — without this reset the next mount hydrates from the
  // previous test's ?q= instead of the demo query.
  window.history.replaceState(null, "", "/");
  Object.defineProperty(window, "innerWidth", { value: width, writable: true, configurable: true });
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
  }
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
  if (!("randomUUID" in crypto)) {
    Object.defineProperty(crypto, "randomUUID", {
      configurable: true,
      value: () => `test-${Math.random().toString(16).slice(2)}-${Date.now()}`,
    });
  }
}

export interface CommandHarness extends RenderResult {
  user: ReturnType<typeof userEvent.setup>;
  /** The command line input (medium and wide desktop both expose one). */
  input: () => HTMLInputElement;
}

export async function renderCommandShell(
  options: { width?: number } = {},
): Promise<CommandHarness> {
  installBrowserStubs(options);
  // The shell's stores are module-level singletons that cache their snapshot,
  // so a fresh localStorage isn't enough — each test needs a fresh graph.
  vi.resetModules();
  const { CommandShell } = await import("@/components/command/command-shell");
  const user = userEvent.setup({ delay: null });
  const result = render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <CommandShell />
    </NextIntlClientProvider>,
  );
  return {
    ...result,
    user,
    input: () => result.getByLabelText("FerroScale Command query") as HTMLInputElement,
  };
}

/** The full query, chips included — the wide layout keeps completed tokens as
 *  chips and only the trailing partial in the input. */
export function currentQuery(harness: CommandHarness): string {
  const chips = harness
    .queryAllByRole("button", { name: /^Edit / })
    .map((el) => el.textContent?.trim() ?? "");
  const partial = harness.input().value;
  return [...chips, partial].filter(Boolean).join(" ");
}
