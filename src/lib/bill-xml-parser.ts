/**
 * Bill XML parser — extracts structured sections from congress.gov bill XML.
 */

const CONTAINER_TAGS = new Set([
  "legis-body",
  "division",
  "title",
  "subtitle",
  "part",
  "subpart",
  "chapter",
  "subchapter",
  "section",
  "subsection",
  "paragraph",
  "subparagraph",
  "clause",
]);

const TEXTUAL_TAGS = new Set(["text"]);

export interface ParsedChunk {
  path: string[];
  content: string;
}

export const BillXmlParser = { extractSections };

/* eslint-disable @typescript-eslint/no-explicit-any */
async function extractSections(xmlObj: any): Promise<ParsedChunk[]> {
  if (xmlObj.bill) return parseBillOrResolution(xmlObj.bill);
  if (xmlObj.resolution) return parseBillOrResolution(xmlObj.resolution);
  return [];
}

function parseBillOrResolution(topNode: any): ParsedChunk[] {
  if (!Array.isArray(topNode.$$)) return [];
  const bodies = topNode.$$.filter((c: any) => c["#name"] === "legis-body");
  const results: ParsedChunk[] = [];
  for (const body of bodies) {
    results.push(...parseContainer(body, []));
  }
  return results;
}

function parseContainer(node: any, path: string[]): ParsedChunk[] {
  const results: ParsedChunk[] = [];
  const { enumVal, headerVal } = extractHeading(node);
  const localHeading = buildContainerHeading(node["#name"], enumVal, headerVal);
  const newPath = localHeading ? [...path, localHeading] : [...path];

  if (node.$$) {
    for (const child of node.$$) {
      const name = child["#name"];
      if (CONTAINER_TAGS.has(name)) {
        results.push(...parseContainer(child, newPath));
      } else if (TEXTUAL_TAGS.has(name)) {
        const text = parseTextNode(child);
        if (text) results.push({ path: newPath, content: text });
      }
    }
  }

  if (typeof node._ === "string") {
    const directText = tidyContent(node._);
    if (directText) results.push({ path: newPath, content: directText });
  }

  return results;
}

function extractHeading(node: any) {
  let enumVal = "";
  let headerVal = "";
  if (!Array.isArray(node.$$)) return { enumVal, headerVal };

  const eChild = node.$$.find((ch: any) => ch["#name"] === "enum");
  if (eChild && typeof eChild._ === "string") enumVal = eChild._.trim();

  const hChild = node.$$.find((ch: any) => ch["#name"] === "header");
  if (hChild) headerVal = parseNodeInReadingOrder(hChild);

  return { enumVal, headerVal };
}

function buildContainerHeading(
  nodeName: string,
  enumVal: string,
  headerVal: string,
): string {
  enumVal = enumVal.trim();
  headerVal = headerVal.trim();
  if (!enumVal && !headerVal) return "";

  if (nodeName === "division") {
    if (enumVal && headerVal)
      return tidyContent(`Division ${enumVal} ${headerVal}`);
    if (enumVal) return `Division ${enumVal}`;
    return tidyContent(`Division: ${headerVal}`);
  }

  if (nodeName === "section") {
    const cleanedEnum = enumVal.replace(/\.$/, "");
    if (cleanedEnum && headerVal)
      return tidyContent(`Section ${cleanedEnum}. ${headerVal}`);
    if (cleanedEnum) return tidyContent(`Section ${cleanedEnum}`);
    return tidyContent(`Section ${headerVal}`);
  }

  if (
    nodeName === "subsection" ||
    nodeName === "paragraph" ||
    nodeName === "subparagraph"
  ) {
    if (enumVal && headerVal) return tidyContent(`${enumVal} ${headerVal}`);
    return tidyContent(enumVal || headerVal);
  }

  if (enumVal && headerVal) return tidyContent(`${enumVal} ${headerVal}`);
  return tidyContent(enumVal || headerVal);
}

function parseNodeInReadingOrder(node: any): string {
  if (!node.$$) return typeof node._ === "string" ? tidyContent(node._) : "";
  let out = "";
  for (const child of node.$$) {
    const name = child["#name"];
    if (name === "_") out += child._ || "";
    else out += " " + parseNodeInReadingOrder(child);
  }
  return tidyContent(out);
}

function parseTextNode(node: any): string {
  return tidyContent(parseNodeInReadingOrder(node));
}

function tidyContent(str: string): string {
  return str
    .replace(/\s+([,.;?!])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s+/g, " ")
    .trim();
}
/* eslint-enable @typescript-eslint/no-explicit-any */
