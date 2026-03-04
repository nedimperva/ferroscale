import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { calculateQuickFromQuery } from "@ferroscale/metal-core/quick";

const QUICK_REFERENCE_MARKDOWN = [
  "# Alias Quick Reference",
  "",
  "## Tubes and Bars",
  "- `chs` / `pipe`: `OD x T x L`",
  "- `shs`: `A x A x T x L`",
  "- `rhs`: `W x H x T x L`",
  "- `rb`: `D x L`",
  "- `sb`: `A x L`",
  "- `fb`: `W x T x L`",
  "",
  "## Sheet and Plate",
  "- `sheet` / `sht`",
  "- `plate` / `pl`",
  "- Orders accepted:",
  "- `width x length x thickness`",
  "- `width x thickness x length`",
  "",
  "## EN Profiles",
  "- `ipe`, `ipn`, `hea`, `heb`, `hem`, `upn`, `upe`, `tee`",
  "- Format: `<alias> <size>x<length>`",
  "",
  "## Flags",
  "- `qty=<number>` (default `1`)",
  "- `mat=<grade|alias>` (default `steel-s235jr`)",
  "- `dens=<kg/m3>`",
  "- `unit=<mm|cm|m|in|ft>`",
  "",
  "## Examples",
  "- `shs 40x40x2x4500mm qty=5`",
  "- `chs 60.3x3.2x3000 qty=4`",
  "- `sheet 1250x3000x2 qty=5`",
  "- `plate 1500x3000x10`",
  "- `ipe 200x6000 mat=s355`",
].join("\n");

function AliasQuickReferenceDetail() {
  return <Detail markdown={QUICK_REFERENCE_MARKDOWN} />;
}

function AliasQuickReferenceActions() {
  return (
    <ActionPanel.Section title="Quick Reference">
      <Action.Push
        title="Open Alias Quick Reference"
        icon={Icon.Book}
        target={<AliasQuickReferenceDetail />}
      />
      <Action.CopyToClipboard
        content={QUICK_REFERENCE_MARKDOWN}
        title="Copy Alias Quick Reference"
      />
    </ActionPanel.Section>
  );
}

export default function Command() {
  const [query, setQuery] = useState("");
  const trimmedQuery = query.trim();

  const response = useMemo(() => {
    if (!trimmedQuery) {
      return null;
    }
    return calculateQuickFromQuery(trimmedQuery);
  }, [trimmedQuery]);

  return (
    <List
      searchBarPlaceholder="shs 40x40x2x4500mm qty=5"
      onSearchTextChange={setQuery}
      searchText={query}
    >
      {!trimmedQuery ? (
        <>
          <List.Section title="Reference">
            <List.Item
              title="Alias Quick Reference"
              subtitle="Open all aliases, formats, flags, and examples"
              icon={{ source: Icon.Book, tintColor: Color.Green }}
              accessories={[{ text: "always available" }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Open Alias Quick Reference"
                    icon={Icon.Book}
                    target={<AliasQuickReferenceDetail />}
                  />
                  <Action.CopyToClipboard
                    content={QUICK_REFERENCE_MARKDOWN}
                    title="Copy Alias Quick Reference"
                  />
                </ActionPanel>
              }
            />
          </List.Section>

          <List.Section title="Input Patterns and Aliases">
            <List.Item
              title="Tubes and Bars"
              subtitle="chs ODxT xL, rb DxL, sb AxL, fb WxT xL, shs AxAxT xL, rhs WxHxT xL"
              icon={{ source: Icon.Box, tintColor: Color.Blue }}
            />
            <List.Item
              title="Sheets and Plates"
              subtitle="sheet/sht or plate/pl: width x length x thickness (or width x thickness x length)"
              icon={{ source: Icon.AppWindowGrid2x2, tintColor: Color.Purple }}
            />
            <List.Item
              title="EN Structural Profiles"
              subtitle="ipe/ipn/hea/heb/hem/upn/upe/tee + size x length"
              icon={{ source: Icon.Building, tintColor: Color.Green }}
            />
          </List.Section>

          <List.Section title="Flags">
            <List.Item
              title="qty=<number>"
              subtitle="Default: qty=1"
              icon={{ source: Icon.Hashtag, tintColor: Color.Blue }}
            />
            <List.Item
              title="mat=<grade or alias>"
              subtitle="Default: steel-s235jr"
              icon={{ source: Icon.Tag, tintColor: Color.Orange }}
            />
            <List.Item
              title="dens=<kg/m3>"
              subtitle="Custom density override"
              icon={{ source: Icon.Gauge, tintColor: Color.Red }}
            />
            <List.Item
              title="unit=<mm|cm|m|in|ft>"
              subtitle="Fallback unit"
              icon={{ source: Icon.Ruler, tintColor: Color.Purple }}
            />
          </List.Section>

          <List.Section title="High-Value Examples">
            <List.Item
              title="shs 40x40x2x4500mm qty=5"
              subtitle="Square tube, shows Single + Total"
              icon={Icon.Text}
              accessories={[{ text: "SHS" }, { text: "qty" }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    content="shs 40x40x2x4500mm qty=5"
                    title="Copy Query"
                  />
                  <AliasQuickReferenceActions />
                </ActionPanel>
              }
            />
            <List.Item
              title="chs 60.3x3.2x3000 qty=4"
              subtitle="Round tube with quantity"
              icon={Icon.Text}
              accessories={[{ text: "CHS" }, { text: "qty" }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    content="chs 60.3x3.2x3000 qty=4"
                    title="Copy Query"
                  />
                  <AliasQuickReferenceActions />
                </ActionPanel>
              }
            />
            <List.Item
              title="sheet 1250x3000x2 qty=5"
              subtitle="Sheet in width x length x thickness order"
              icon={Icon.Text}
              accessories={[{ text: "SHEET" }, { text: "qty" }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    content="sheet 1250x3000x2 qty=5"
                    title="Copy Query"
                  />
                  <AliasQuickReferenceActions />
                </ActionPanel>
              }
            />
            <List.Item
              title="plate 1500x3000x10"
              subtitle="Plate default quantity (1 pc)"
              icon={Icon.Text}
              accessories={[{ text: "PLATE" }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    content="plate 1500x3000x10"
                    title="Copy Query"
                  />
                  <AliasQuickReferenceActions />
                </ActionPanel>
              }
            />
            <List.Item
              title="ipe 200x6000 mat=s355"
              subtitle="EN profile with material override"
              icon={Icon.Text}
              accessories={[{ text: "EN" }, { text: "mat" }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    content="ipe 200x6000 mat=s355"
                    title="Copy Query"
                  />
                  <AliasQuickReferenceActions />
                </ActionPanel>
              }
            />
          </List.Section>
        </>
      ) : null}

      {trimmedQuery && response && !response.ok ? (
        <List.Section title="Parse Error">
          <List.Item
            title={response.issues[0]?.message ?? "Invalid input"}
            subtitle="Try an explicit alias and full dimensions"
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  content={trimmedQuery}
                  title="Copy Query"
                />
                <Action.CopyToClipboard
                  content="shs 40x40x2x4500mm qty=5"
                  title="Copy Example Query"
                />
                <AliasQuickReferenceActions />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      {trimmedQuery && response && response.ok ? (
        <List.Section title="Result">
          {response.result.quantity > 1 ? (
            <>
              <List.Item
                title={`Single (1 pc): ${response.result.unitWeightKg.toFixed(3)} kg`}
                subtitle={`${response.result.profileAlias.toUpperCase()} - ${response.result.lengthMm.toFixed(0)} mm`}
                icon={{ source: Icon.Circle, tintColor: Color.Blue }}
                accessories={[{ text: `qty ${response.result.quantity}` }]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      content={`${response.result.unitWeightKg.toFixed(3)} kg`}
                      title="Copy Single Weight"
                    />
                    <Action.CopyToClipboard
                      content={`${response.result.totalWeightKg.toFixed(3)} kg`}
                      title="Copy Total Weight"
                    />
                    <Action.CopyToClipboard
                      content={response.result.normalizedInput}
                      title="Copy Normalized Input"
                    />
                    <AliasQuickReferenceActions />
                  </ActionPanel>
                }
              />
              <List.Item
                title={`Total (${response.result.quantity} pcs): ${response.result.totalWeightKg.toFixed(3)} kg`}
                subtitle={`${response.result.profileAlias.toUpperCase()} - ${response.result.materialGradeId}`}
                icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
                accessories={[
                  {
                    text: `${response.result.densityKgPerM3.toFixed(0)} kg/m3`,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      content={`${response.result.totalWeightKg.toFixed(3)} kg`}
                      title="Copy Total Weight"
                    />
                    <Action.CopyToClipboard
                      content={`${response.result.unitWeightKg.toFixed(3)} kg`}
                      title="Copy Single Weight"
                    />
                    <Action.CopyToClipboard
                      content={response.result.normalizedInput}
                      title="Copy Normalized Input"
                    />
                    <AliasQuickReferenceActions />
                  </ActionPanel>
                }
              />
            </>
          ) : (
            <List.Item
              title={`Weight: ${response.result.unitWeightKg.toFixed(3)} kg`}
              subtitle={`${response.result.profileAlias.toUpperCase()} - 1 pc - ${response.result.lengthMm.toFixed(0)} mm`}
              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
              accessories={[{ text: response.result.materialGradeId }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    content={`${response.result.unitWeightKg.toFixed(3)} kg`}
                    title="Copy Weight"
                  />
                  <Action.CopyToClipboard
                    content={response.result.normalizedInput}
                    title="Copy Normalized Input"
                  />
                  <AliasQuickReferenceActions />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      ) : null}
    </List>
  );
}
