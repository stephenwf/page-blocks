export function blockSlot(renderSlot?: (htmlProps?: any) => any, htmlProps: any = {}, fallback = null) {
  return renderSlot ? renderSlot(htmlProps) : <div {...htmlProps}>{fallback}</div>;
}
