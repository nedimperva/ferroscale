// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { FaqView } from "./faq-view";
import messages from "../../../messages/en.json";

const { pushMock, replaceMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/faq",
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("FaqView component", () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
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
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = vi.fn();
    }
    user = userEvent.setup({ delay: null });
  });

  afterEach(() => {
    cleanup();
  });

  function renderFaq() {
    return render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <FaqView />
      </NextIntlClientProvider>
    );
  }

  function openVerifier() {
    fireEvent.click(screen.getByRole("button", { name: /Open verifier/i }));
  }

  it("renders hero title, badges and the profile data sheet", () => {
    renderFaq();
    expect(
      screen.getByRole("heading", { level: 1, name: /Metal Weight Calculation FAQ/i })
    ).toBeDefined();
    expect(screen.getByText(/Engineering Reference/i)).toBeDefined();
    expect(screen.getByText(/EN \/ ISO Standards/i)).toBeDefined();

    // Data sheet leads the page: every profile row is present up front.
    expect(screen.getByRole("button", { name: /Round tube/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Beam HEA \/ HEB \/ IPE/i })).toBeDefined();
    expect(screen.getByText(/Alu ×0\.344/i)).toBeDefined();
  });

  it("keeps the verifier behind a strip until it is opened", () => {
    renderFaq();
    expect(screen.queryByRole("heading", { name: /Interactive Formula Verifier/i })).toBeNull();

    openVerifier();
    expect(screen.getByRole("heading", { name: /Interactive Formula Verifier/i })).toBeDefined();
    expect(screen.getByText(/Step-by-step Verifier/i)).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /^Close/i }));
    expect(screen.queryByRole("heading", { name: /Interactive Formula Verifier/i })).toBeNull();
  });

  it("opens the matching answer when a data sheet row is clicked", () => {
    renderFaq();
    fireEvent.click(screen.getByRole("button", { name: /Round tube/i }));

    const toggle = screen.getByRole("button", {
      name: /weight of hollow circular pipes and tubes/i,
    });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(/The annulus area is/i)).toBeDefined();
  });

  it("filters questions by category tab", () => {
    renderFaq();
    const tubesTab = screen.getByRole("tab", { name: /Hollow Sections/i });
    fireEvent.click(tubesTab);
    expect(tubesTab.getAttribute("aria-selected")).toBe("true");

    const answers = screen.getByRole("region", { name: /How each formula is derived/i });
    expect(within(answers).getByText(/circular pipes and tubes/i)).toBeDefined();
    expect(within(answers).getByText(/square and rectangular hollow sections/i)).toBeDefined();
    expect(within(answers).queryByText(/steel sheets and plates/i)).toBeNull();
  });

  it("filters the data sheet and the questions together, then clears", async () => {
    renderFaq();
    const searchInput = screen.getByPlaceholderText(/Search formulas, profiles/i) as HTMLInputElement;

    await user.type(searchInput, "UPN");

    // Question survives, and so does the matching data sheet row.
    expect(screen.getAllByText(/UPN and UPE/i)[0]).toBeDefined();
    expect(screen.getByRole("button", { name: /Channel UPN \/ UPE/i })).toBeDefined();
    // Unrelated profile and question are both gone.
    expect(screen.queryByText(/steel sheets and plates/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /^Plate & sheet/i })).toBeNull();

    fireEvent.click(screen.getByLabelText(/Clear search/i));
    expect(searchInput.value).toBe("");
    expect(screen.getByText(/steel sheets and plates/i)).toBeDefined();
  });

  it("shows empty state when no questions match search and resets category", async () => {
    renderFaq();
    fireEvent.click(screen.getByRole("tab", { name: /Beams & Structural/i }));

    const searchInput = screen.getByPlaceholderText(/Search formulas, profiles/i);
    await user.type(searchInput, "nonexistenttermxyz");

    expect(screen.getByText(/No questions matched your search/i)).toBeDefined();
    expect(screen.getByText(/No profile matches that search/i)).toBeDefined();

    fireEvent.click(screen.getByText(/Search in all categories/i));
    expect(screen.getByRole("tab", { name: /All Topics/i }).getAttribute("aria-selected")).toBe("true");
  });

  it("updates formula verifier trace when changing profile and parameters", () => {
    renderFaq();
    openVerifier();

    fireEvent.click(screen.getByRole("button", { name: /^Round Bar$/i }));

    const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    const diamInput = inputs.find((i) => i.value === "20" || i.value === "60.3");
    if (diamInput) {
      fireEvent.change(diamInput, { target: { value: "30" } });
    }

    expect(screen.getByText(/3\. Total calculated mass/i)).toBeDefined();
    expect(screen.getByText(/33\.29/)).toBeDefined();
  });

  it("copies command string from formula verifier", async () => {
    renderFaq();
    openVerifier();

    const copySpy = vi.spyOn(navigator.clipboard, "writeText");
    await user.click(screen.getByRole("button", { name: /Copy command/i }));

    expect(copySpy).toHaveBeenCalledWith(expect.stringContaining("tube60.3x3.2 6m"));
    await waitFor(() => {
      expect(screen.getByText(/Copied!/i)).toBeDefined();
    });
  });

  it("opens one answer at a time", () => {
    renderFaq();
    const first = screen.getByRole("button", {
      name: /How is the weight of any metal profile calculated/i,
    });
    const second = screen.getByRole("button", {
      name: /weight of hollow circular pipes and tubes/i,
    });

    // Nothing is open by default — the data sheet already carries the formulas.
    expect(first.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(first);
    expect(first.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(second);
    expect(second.getAttribute("aria-expanded")).toBe("true");
    expect(first.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(second);
    expect(second.getAttribute("aria-expanded")).toBe("false");
  });

  it("switches locale when clicking EN / BS buttons", () => {
    renderFaq();
    fireEvent.click(screen.getByRole("button", { name: "BS" }));
    expect(replaceMock).toHaveBeenCalledWith("/faq", { locale: "bs" });
  });
});
