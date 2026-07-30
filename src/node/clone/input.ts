import { Cloner } from "./types";

export const cloneInputElement: Cloner<HTMLInputElement> = ({
  originalNode,
}) => {
  const cloned = originalNode.cloneNode(false) as HTMLInputElement;
  cloned.setAttribute("value", originalNode.value);
  return cloned;
};
