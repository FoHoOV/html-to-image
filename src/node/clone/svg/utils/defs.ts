const SVG_NS = 'http://www.w3.org/2000/svg'

export function createOrGetSvgDefs(svg: SVGSVGElement) {
  const existingDefs = svg.querySelector<SVGDefsElement>(':scope > defs')
  if (existingDefs) {
    return existingDefs
  }

  const defs = document.createElementNS(SVG_NS, 'defs')
  svg.insertBefore(defs, svg.firstChild)
  return defs
}
