const defaultDocsUrl = "https://dashbored.mintlify.app";

export const docsUrl = (process.env.NEXT_PUBLIC_DOCS_URL || defaultDocsUrl).replace(/\/+$/, "");

export function docsHref(path = "") {
  return `${docsUrl}${path}`;
}
