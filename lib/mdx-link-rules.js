const PROTOCOL_PATTERN = /^[a-z][a-z\d+\-.]*:\/\//i;
const MAILTO_PATTERN = /^mailto:/i;
const WWW_HOST_PATTERN = /^www\./i;

export function isExternalHref(rawHref) {
  if (typeof rawHref !== "string") {
    return false;
  }

  const href = rawHref.trim();
  const isProtocolRelative = href.startsWith("//");
  const isInternal = (href.startsWith("/") && !isProtocolRelative) || href.startsWith("#");

  if (isInternal) {
    return false;
  }

  return isProtocolRelative || PROTOCOL_PATTERN.test(href) || MAILTO_PATTERN.test(href) || WWW_HOST_PATTERN.test(href);
}

export function getLinkTarget(rawHref) {
  const isExternal = isExternalHref(rawHref);

  return {
    isExternal,
    target: isExternal ? "_blank" : undefined,
    rel: isExternal ? "noreferrer noopener" : undefined
  };
}
