import { getHref, setHref, createOrGetSvgDefs } from "./utils";
import { Cloner } from "../types";
import { fetchResource } from "@/utils";
import { isInstanceOfElement } from "@/node/utils";
import { Context } from "@/context";

export const cloneUseElement: Cloner<SVGUseElement> = async ({
  originalNode,
  clonedParentNode,
  context,
}) => {
  const cloned = originalNode.cloneNode(false) as SVGUseElement;
  if (!clonedParentNode || !isInstanceOfElement(clonedParentNode, Element)) {
    return cloned;
  }

  const ownerSvg = clonedParentNode.closest("svg");
  if (!ownerSvg) {
    return cloned;
  }

  const href = getHref(cloned);
  const parsed = href ? splitSvgHref(href) : null;
  if (!href || !parsed?.id) {
    return cloned;
  }

  if (!hasDefinition(ownerSvg, parsed.id)) {
    await embedDefinition(ownerSvg, href, context);
    setHref(cloned, `#${parsed.id}`);
  }

  setHref(cloned, `#${parsed.id}`);
  return cloned;
};

function hasDefinition(ownerSvg: SVGSVGElement, id: string) {
  return ownerSvg.querySelector(`#${CSS.escape(id)}`) !== null;
}

function splitSvgHref(href: string) {
  const hashIndex = href.indexOf("#");
  if (hashIndex === -1) {
    return null;
  }

  return {
    url: href.slice(0, hashIndex),
    id: href.slice(hashIndex + 1),
  };
}

function* collectDefinitionWithDependencies(
  definition: SVGElement,
  ownerDocument: Document,
  collectedIds = new Set<string>(),
): Generator<SVGElement, void, undefined> {
  const id = definition.getAttribute("id");
  if (id && collectedIds.has(id)) {
    return;
  }

  if (id) {
    collectedIds.add(id);
    yield definition;
  }

  for (const referencedId of getReferencedIds(definition)) {
    const referencedElement = ownerDocument.getElementById(referencedId);
    if (
      referencedElement &&
      isInstanceOfElement(referencedElement, SVGElement)
    ) {
      yield* collectDefinitionWithDependencies(
        referencedElement,
        ownerDocument,
        collectedIds,
      );
    }
  }
}

async function fetchSvgDefinitions(href: string, context: Context) {
  const parsed = splitSvgHref(href);
  if (!parsed?.id) {
    return null;
  }

  const ownerDocument = parsed.url
    ? await fetchExternalSvgDocument(parsed.url, context)
    : document;
  if (!ownerDocument) {
    return null;
  }

  const definition = ownerDocument.getElementById(parsed.id);
  if (!definition || !isInstanceOfElement(definition, SVGElement)) {
    return null;
  }

  return collectDefinitionWithDependencies(definition, ownerDocument);
}

async function fetchExternalSvgDocument(url: string, context: Context) {
  try {
    const response = await fetchResource(url, undefined, context);
    const document = new DOMParser().parseFromString(
      response.asString(),
      "image/svg+xml",
    );

    if (document.querySelector("parsererror")) {
      console.warn(`Failed to parse external SVG: ${url}`);
      return null;
    }

    return document;
  } catch (error) {
    console.warn(`Failed to inline external SVG: ${url}`, error);
    return null;
  }
}

function* getReferencedIds(
  element: Element,
): Generator<string, void, undefined> {
  for (const node of traverseElements(element)) {
    for (let index = 0; index < node.attributes.length; index += 1) {
      yield* getUrlReferenceIds(node.attributes[index].value);
    }
    const href = getHref(node);
    if (href?.startsWith("#")) {
      yield href.slice(1);
    }
  }
}

function* traverseElements(element: Element): Generator<Element> {
  yield element;
  for (
    let child = element.firstElementChild;
    child;
    child = child.nextElementSibling
  ) {
    yield* traverseElements(child);
  }
}

function* getUrlReferenceIds(
  value: string,
): Generator<string, void, undefined> {
  if (!value.includes("url(")) {
    return;
  }

  const matcher = /url\(\s*["']?#([^)"'\s]+)["']?\s*\)/g;
  let match = matcher.exec(value);
  while (match) {
    if (match[1]) {
      yield match[1];
    }
    match = matcher.exec(value);
  }
}

async function embedDefinition(
  ownerSvg: SVGSVGElement,
  href: string,
  context: Context,
) {
  const definitions = await fetchSvgDefinitions(href, context);
  if (!definitions) {
    return;
  }

  const svgDefElement = createOrGetSvgDefs(ownerSvg);
  for (const definition of definitions) {
    const id = definition.getAttribute("id");
    if (!id) {
      continue;
    }

    const clonedDefinition = definition.cloneNode(true);
    if (!hasDefinition(ownerSvg, id)) {
      svgDefElement.appendChild(clonedDefinition);
    }
  }
}
