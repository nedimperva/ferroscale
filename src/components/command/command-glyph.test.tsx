// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { CommandGlyph } from "./command-glyph";

describe("CommandGlyph", () => {
  it("renders H-beam for HEA, HEB, HEM and default beam", () => {
    const { container: def } = render(<CommandGlyph fam="beam" />);
    expect(def.querySelector("path")?.getAttribute("d")).toBe("M5 4h14M5 20h14M12 4v16");

    const { container: hea } = render(<CommandGlyph fam="beam" alias="hea" />);
    expect(hea.querySelector("path")?.getAttribute("d")).toBe("M5 4h14M5 20h14M12 4v16");

    const { container: heb } = render(<CommandGlyph fam="beam" alias="heb" />);
    expect(heb.querySelector("path")?.getAttribute("d")).toBe("M5 4h14M5 20h14M12 4v16");

    const { container: hem } = render(<CommandGlyph fam="beam" alias="hem" />);
    expect(hem.querySelector("path")?.getAttribute("d")).toBe("M5 4h14M5 20h14M12 4v16");
  });

  it("renders I-beam shape for IPE and IPN", () => {
    const { container: ipe } = render(<CommandGlyph fam="beam" alias="ipe" />);
    expect(ipe.querySelector("path")?.getAttribute("d")).toBe("M8 4h8M8 20h8M12 4v16");

    const { container: ipn } = render(<CommandGlyph fam="beam" alias="ipn" />);
    expect(ipn.querySelector("path")?.getAttribute("d")).toBe("M8 4h8M8 20h8M12 4v16");

    const { container: ibeamFam } = render(<CommandGlyph fam="ibeam" />);
    expect(ibeamFam.querySelector("path")?.getAttribute("d")).toBe("M8 4h8M8 20h8M12 4v16");

    const { container: fullId } = render(<CommandGlyph fam="beam" alias="beam_ipe_en" />);
    expect(fullId.querySelector("path")?.getAttribute("d")).toBe("M8 4h8M8 20h8M12 4v16");
  });

  it("renders U shape for UPN and UPE", () => {
    const { container: upn } = render(<CommandGlyph fam="beam" alias="upn" />);
    expect(upn.querySelector("path")?.getAttribute("d")).toBe("M6 4v13a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V4");

    const { container: upe } = render(<CommandGlyph fam="beam" alias="upe" />);
    expect(upe.querySelector("path")?.getAttribute("d")).toBe("M6 4v13a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V4");

    const { container: channelFam } = render(<CommandGlyph fam="channel" />);
    expect(channelFam.querySelector("path")?.getAttribute("d")).toBe("M6 4v13a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V4");

    const { container: fullId } = render(<CommandGlyph fam="beam" alias="channel_upn_en" />);
    expect(fullId.querySelector("path")?.getAttribute("d")).toBe("M6 4v13a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V4");
  });

  it("renders T shape for tee", () => {
    const { container: tee } = render(<CommandGlyph fam="tee" />);
    expect(tee.querySelector("path")?.getAttribute("d")).toBe("M4 5h16M12 5v15");
  });

  it("renders angle shape for angle / L-profile", () => {
    const { container: angle } = render(<CommandGlyph fam="angle" />);
    expect(angle.querySelector("path")?.getAttribute("d")).toBe("M7 4v13h13");
  });

  it("renders plate/panel shape for plate", () => {
    const { container: panel } = render(<CommandGlyph fam="panel" />);
    expect(panel.querySelector("rect")?.getAttribute("width")).toBe("18");
  });

  it("renders hollow section shape for SHS", () => {
    const { container: shs } = render(<CommandGlyph fam="shs" />);
    expect(shs.querySelectorAll("rect").length).toBe(2);
  });
});
