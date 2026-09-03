export function copyAttributes(replacedNode: Element, originalNode: Element) {
  for (const attribute of originalNode.attributes) {
    if (attribute.namespaceURI) {
      replacedNode.setAttributeNS(
        attribute.namespaceURI,
        attribute.name,
        attribute.value,
      );
    } else {
      replacedNode.setAttribute(attribute.name, attribute.value);
    }
  }
}
