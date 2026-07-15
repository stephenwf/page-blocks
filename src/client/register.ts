export function register(tag: string, clazzCreator: () => CustomElementConstructor) {
  if (typeof document === 'undefined') {
    return;
  }

  const clazz = clazzCreator();

  try {
    customElements.define(tag, clazz);
  } catch (e) {
    console.error(`Failed to register element: ${tag}`, e);
  }
}
