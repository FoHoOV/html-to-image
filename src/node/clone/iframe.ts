import type { Cloner } from "./types";

export const cloneIFrameElement: Cloner<HTMLIFrameElement> = ({
  originalNode,
}) => {
  try {
    if (originalNode.contentDocument?.body) {
      return originalNode.contentDocument.body.cloneNode(false);
    }
  } catch {
    // Cross-origin iframe contents cannot be cloned.
  }

  return originalNode.cloneNode(false);
};
