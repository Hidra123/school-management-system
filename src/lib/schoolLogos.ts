const SCHOOL_LOGOS_PREFIX = "school-logos:v1:";

export type SchoolLogos = { left: string; right: string };

export function readSchoolLogos(storedValue: string): SchoolLogos {
  if (!storedValue.startsWith(SCHOOL_LOGOS_PREFIX)) {
    return { left: storedValue, right: "" };
  }

  const value: unknown = JSON.parse(storedValue.slice(SCHOOL_LOGOS_PREFIX.length));
  if (
    typeof value !== "object" ||
    value === null ||
    !("left" in value) ||
    !("right" in value) ||
    typeof value.left !== "string" ||
    typeof value.right !== "string"
  ) {
    throw new Error("Saved school logo data is invalid.");
  }

  return { left: value.left, right: value.right };
}

export function storeSchoolLogos(logos: SchoolLogos): string {
  return `${SCHOOL_LOGOS_PREFIX}${JSON.stringify(logos)}`;
}
