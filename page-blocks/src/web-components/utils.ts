import { createContext } from './context';

const svgElements = ['svg', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon'];

export const pageContext = createContext('page-context', {});

export const slotContext = createContext<string | null>('slot-context', null);

export function el(tag: string, attributes: any, handlers: Record<string, (e: any) => void>, children: any[]) {
  if (typeof document === 'undefined') {
    return null;
  }

  const isSvg = svgElements.includes(tag);
  const element = isSvg ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);

  Object.keys(attributes).forEach((key) => {
    if (isSvg) {
      element.setAttributeNS(null, key, attributes[key]);
      return;
    }
    element.setAttribute(key, attributes[key]);
  });
  Object.keys(handlers).forEach((key) => {
    element.addEventListener(key, handlers[key]);
  });

  children.forEach((child) => {
    if (!child) {
      return;
    }
    if (child instanceof HTMLElement) {
      element.appendChild(child);
    } else if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof SVGElement) {
      element.appendChild(child);
    }
  });

  return element;
}
