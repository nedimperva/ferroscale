import { getRequestConfig } from "next-intl/server";
import { routing, type AppLocale } from "./routing";
import enMessages from "../../messages/en.json";
import bsMessages from "../../messages/bs.json";

type MessageValue = string | number | boolean | null;
type MessageTree = {
  [key: string]: MessageValue | MessageTree;
};

function isAppLocale(value: string): value is AppLocale {
  return routing.locales.includes(value as AppLocale);
}

function mergeMessages(base: MessageTree, overrides: MessageTree): MessageTree {
  const merged: MessageTree = { ...base };

  for (const [key, value] of Object.entries(overrides)) {
    const existing = merged[key];
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      existing !== null &&
      typeof existing === "object" &&
      !Array.isArray(existing)
    ) {
      merged[key] = mergeMessages(existing as MessageTree, value as MessageTree);
      continue;
    }

    merged[key] = value;
  }

  return merged;
}

function getLocaleMessages(locale: AppLocale): MessageTree {
  switch (locale) {
    case "bs":
      return mergeMessages(enMessages as MessageTree, bsMessages as MessageTree);
    case "en":
    default:
      return enMessages as MessageTree;
  }
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested && isAppLocale(requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: getLocaleMessages(locale),
  };
});
