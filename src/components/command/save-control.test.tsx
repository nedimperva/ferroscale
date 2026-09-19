// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/en.json";
import { SaveControl } from "./save-control";

function setup(props: Partial<Parameters<typeof SaveControl>[0]> = {}) {
  const onPrimary = vi.fn();
  const onOpenPicker = vi.fn();
  const user = userEvent.setup({ delay: null });
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SaveControl
        projectName={null}
        saved={false}
        onPrimary={onPrimary}
        onOpenPicker={onOpenPicker}
        {...props}
      />
    </NextIntlClientProvider>,
  );
  return { user, onPrimary, onOpenPicker };
}

describe("SaveControl", () => {
  afterEach(cleanup);

  it("names the job being worked out of", () => {
    setup({ projectName: "Gate job" });
    expect(screen.getByRole("button", { name: "Add to Gate job" })).toBeDefined();
  });

  it("falls back to a plain save when there is no job", () => {
    setup();
    expect(screen.getByRole("button", { name: "Save" })).toBeDefined();
  });

  it("shows the bookmark state when Save is the primary", () => {
    setup({ saved: true });
    expect(screen.getByRole("button", { name: "Saved" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("does not claim a line is saved while it is being filed into a job", () => {
    // The bookmark state is about the library; with a job in play the primary
    // is filing, and a pressed state there would be about the wrong thing.
    setup({ projectName: "Gate job", saved: true });
    const primary = screen.getByRole("button", { name: "Add to Gate job" });
    expect(primary.getAttribute("aria-pressed")).toBeNull();
  });

  it("runs the primary action and opens the picker from the caret", async () => {
    const { user, onPrimary, onOpenPicker } = setup({ projectName: "Gate job" });
    await user.click(screen.getByRole("button", { name: "Add to Gate job" }));
    expect(onPrimary).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Save somewhere else" }));
    expect(onOpenPicker).toHaveBeenCalledTimes(1);
  });

  it("disables both halves together", async () => {
    const { user, onPrimary, onOpenPicker } = setup({ disabled: true });
    await user.click(screen.getByRole("button", { name: "Save" }));
    await user.click(screen.getByRole("button", { name: "Save somewhere else" }));
    expect(onPrimary).not.toHaveBeenCalled();
    expect(onOpenPicker).not.toHaveBeenCalled();
  });
});
