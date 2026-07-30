import { Cloner } from "./types";

export const cloneSelectElement: Cloner<HTMLSelectElement> = ({
  originalNode,
}) => originalNode.cloneNode(false);

export const cloneOptionElement: Cloner<HTMLOptionElement> = ({
  originalNode,
}) => {
  const cloned = originalNode.cloneNode(false) as HTMLOptionElement;
  if (originalNode.selected) {
    cloned.setAttribute("selected", "");
  } else {
    cloned.removeAttribute("selected");
  }
  return cloned;
};
