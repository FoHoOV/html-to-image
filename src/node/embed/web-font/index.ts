import type { Context } from "@/context";
import { getComputedStyle, isInstanceOfElement } from "@/node/utils";
import type { FontFaceCollection } from "./collector";
import { collectDocumentFontFaces } from "./collector";
import { addUsedFontFamilies } from "./font-family";
import { FontResolver } from "./resolver";
import { addFontStyleNode } from "./serialize";

import type { EmbedContext, Embedder } from "../types";

/**
 * Runs per node during the single source-DOM traversal, recording the families
 * that node uses. The root additionally queues the one deferred job that turns
 * those families into CSS; it waits for `context.cloning` because the families
 * are still being collected while it is queued.
 */
export const embedWebFonts: Embedder<HTMLElement | SVGElement, void> = (
  config,
) => {
  const context = config.context;
  if (context.options.skipFonts) {
    return;
  }

  const suppliedCSS = context.options.fontEmbedCSS;
  if (suppliedCSS != null) {
    if (config.isRoot) {
      context.embedding.font.add(() =>
        addFontStyleNode(config.clonedNode, [suppliedCSS]),
      );
    }
    return;
  }

  trackUsedFamilies(config);

  if (config.isRoot) {
    context.embedding.font.add(async () => {
      await context.cloning.ready;
      addFontStyleNode(config.clonedNode, await resolveUsedFamilies(context));
    });
  }
};

function trackUsedFamilies({
  originalNode,
  context,
  isRoot,
}: EmbedContext<HTMLElement | SVGElement>) {
  const fontSource = getFontSourceElement(originalNode);

  if (fontSource) {
    trackFamilies(
      fontSource.ownerDocument,
      getComputedStyle(fontSource).getPropertyValue("font-family"),
      context,
    );
  }

  // The root also honors an explicit root font-family override.
  if (isRoot) {
    const style = context.options.style as
      Record<string, string | number | null | undefined> | undefined;
    trackFamilies(
      fontSource?.ownerDocument ?? originalNode.ownerDocument,
      style?.fontFamily ?? style?.["font-family"],
      context,
    );
  }
}

function trackFamilies(
  document: Document,
  value: string | number | null | undefined,
  context: Context,
) {
  if (value == null) {
    return;
  }

  let used = context.embedding.font.usedFamiliesByDocument.get(document);
  if (!used) {
    used = { families: new Set(), parsedValues: new Set() };
    context.embedding.font.usedFamiliesByDocument.set(document, used);
  }

  // Identical to a value already parsed for this document, so the families it
  // names are present regardless of which node produced it.
  const sourceValue = String(value);
  if (used.parsedValues.has(sourceValue)) {
    return;
  }
  used.parsedValues.add(sourceValue);

  addUsedFontFamilies(sourceValue, used.families);
}

async function resolveUsedFamilies(context: Context) {
  const resolver = new FontResolver(context);
  const fontCache = context.options.cache.fontCache;
  const usedFamiliesByDocument = context.embedding.font.usedFamiliesByDocument;

  // The cache is consulted for every document first, so a document whose
  // families are all already embedded is never scanned at all.
  for (const used of usedFamiliesByDocument.values()) {
    await resolver.includeCached(used.families);
  }

  // What each document still has to supply no longer depends on what the
  // others found, so the scans, which fetch cross-origin stylesheets and
  // imports, all run concurrently.
  const scans: Array<{
    collection: Promise<FontFaceCollection>;
    sourceDocument: Document;
    wanted: Set<string>;
  }> = [];

  for (const [sourceDocument, used] of usedFamiliesByDocument) {
    const wanted = new Set<string>();
    for (const family of used.families) {
      if (
        !resolver.isResolved(family) &&
        !fontCache.isMissing(sourceDocument, family)
      ) {
        wanted.add(family);
      }
    }
    if (wanted.size === 0) {
      continue;
    }

    scans.push({
      collection: collectDocumentFontFaces(sourceDocument, wanted, context),
      sourceDocument,
      wanted,
    });
  }

  // Settled rather than all-or-nothing: one document failing to scan must not
  // discard the fonts the others found. `Promise.allSettled` is newer than the
  // supported browser floor, so each scan absorbs its own failure.
  const collections = await Promise.all(
    scans.map((scan) =>
      scan.collection.catch((error: unknown) => {
        console.error("Error while collecting web fonts", error);
        return null;
      }),
    ),
  );

  // Results are applied in document order, so the first document that supplies
  // a family still wins no matter which scan finished first.
  for (let index = 0; index < scans.length; index += 1) {
    const collection = collections[index];
    if (!collection) {
      continue;
    }

    const { sourceDocument, wanted } = scans[index];
    const { complete, sourcesByFamily } = collection;

    // Only a fully readable document proves a family is absent, so a failed
    // stylesheet read leaves the family retryable on the next render.
    if (complete) {
      for (const family of wanted) {
        if (!sourcesByFamily.has(family)) {
          fontCache.rememberMissing(sourceDocument, family);
        }
      }
    }

    await resolver.includeDiscovered(sourcesByFamily);
  }

  return resolver.cssTexts;
}

function getFontSourceElement(node: HTMLElement | SVGElement) {
  if (!isInstanceOfElement(node, HTMLIFrameElement)) {
    return node;
  }

  try {
    return node.contentDocument?.body ?? null;
  } catch {
    return null;
  }
}
