export const BAN_DURATION_PRESETS = [
  { value: "1", label: "1 dag" },
  { value: "7", label: "7 dagen" },
  { value: "30", label: "30 dagen" },
  { value: "90", label: "90 dagen (3 maanden)" },
  { value: "180", label: "180 dagen (6 maanden)" },
  { value: "365", label: "1 jaar" },
  { value: "0", label: "Permanent" },
  { value: "custom", label: "Aangepast..." },
] as const;

export function parseBanDurationDays(
  selectValue: string,
  customDays = ""
): number | null {
  if (selectValue === "0" || selectValue === "") return null;
  if (selectValue === "custom") {
    const parsed = parseInt(customDays, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  const parsed = parseInt(selectValue, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
