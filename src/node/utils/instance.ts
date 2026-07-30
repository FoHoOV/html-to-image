export const isInstanceOfElement = <
  T extends
    | typeof Element
    | typeof HTMLElement
    | typeof SVGElement
    | typeof SVGImageElement
    | typeof Node,
>(
  node: Element | HTMLElement | SVGElement | SVGImageElement | Node,
  instance: T,
): node is T["prototype"] => {
  if (node instanceof instance) return true;

  const nodePrototype = Object.getPrototypeOf(node);

  if (nodePrototype === null) return false;

  return (
    nodePrototype.constructor.name === instance.name ||
    isInstanceOfElement(nodePrototype, instance)
  );
};
