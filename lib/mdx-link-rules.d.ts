export function isExternalHref(rawHref: unknown): boolean;
export function getLinkTarget(rawHref: unknown): {
  target: string | undefined;
  rel: string | undefined;
  isExternal: boolean;
};
