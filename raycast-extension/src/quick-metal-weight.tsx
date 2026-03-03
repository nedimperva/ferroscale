import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { calculateQuickFromQuery } from "@ferroscale/metal-core/quick";

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
          <List.Section title="How To Use">
            <List.Item
              title="Type in the search bar"
              subtitle="Format: <alias> <dimensions and length> [flags]"
              icon={Icon.Keyboard}
            />
            <List.Item
              title="Results show Single and Total"
              subtitle="When qty > 1, you get both values"
              icon={Icon.List}
            />
          </List.Section>

          <List.Section title="Main Aliases">
            <List.Item
              title="Round Tube: chs / pipe"
              subtitle="chs ODxT xL"
              icon={Icon.Circle}
            />
            <List.Item
              title="Round Bar: rb"
              subtitle="rb DxL"
              icon={Icon.Dot}
            />
            <List.Item
              title="Square Bar: sb"
              subtitle="sb AxL"
              icon={Icon.Square}
            />
            <List.Item
              title="Flat Bar: fb"
              subtitle="fb WxT xL"
              icon={Icon.Rectangle}
            />
            <List.Item
              title="Square/Rect Tubes: shs / rhs"
              subtitle="shs AxAxT xL, rhs WxHxT xL"
              icon={Icon.Box}
            />
          </List.Section>

          <List.Section title="Sheets And Plates">
            <List.Item
              title="Aliases: sheet/sht, plate/pl"
              subtitle="Use width x length x thickness or width x thickness x length"
              icon={Icon.AppWindowGrid2x2}
            />
          </List.Section>

          <List.Section title="Flags">
            <List.Item
              title="qty=<number>"
              subtitle="Default: qty=1"
              icon={Icon.Hashtag}
            />
            <List.Item
              title="mat=<grade or alias>"
              subtitle="Default: steel-s235jr"
              icon={Icon.Tag}
            />
            <List.Item
              title="dens=<kg/m3>"
              subtitle="Custom density override"
              icon={Icon.Gauge}
            />
            <List.Item
              title="unit=<mm|cm|m|in|ft>"
              subtitle="Fallback unit"
              icon={Icon.Ruler}
            />
          </List.Section>

          <List.Section title="Try These Queries">
            <List.Item
              title="shs 40x40x2x4500mm qty=5"
              icon={Icon.Text}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    content="shs 40x40x2x4500mm qty=5"
                    title="Copy Query"
                  />
                </ActionPanel>
              }
            />
            <List.Item
              title="chs 60.3x3.2x3000 qty=4"
              icon={Icon.Text}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    content="chs 60.3x3.2x3000 qty=4"
                    title="Copy Query"
                  />
                </ActionPanel>
              }
            />
            <List.Item
              title="sheet 1250x3000x2 qty=5"
              icon={Icon.Text}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    content="sheet 1250x3000x2 qty=5"
                    title="Copy Query"
                  />
                </ActionPanel>
              }
            />
            <List.Item
              title="plate 1500x3000x10"
              icon={Icon.Text}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    content="plate 1500x3000x10"
                    title="Copy Query"
                  />
                </ActionPanel>
              }
            />
            <List.Item
              title="ipe 200x6000 mat=s355"
              icon={Icon.Text}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    content="ipe 200x6000 mat=s355"
                    title="Copy Query"
                  />
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
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      ) : null}
    </List>
  );
}
