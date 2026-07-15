import type { ReactNode } from 'react';

export function blockSlot(renderSlot?: (htmlProps?: any) => any, htmlProps: any = {}, fallback: ReactNode = null) {
  return renderSlot ? renderSlot(htmlProps) : <div {...htmlProps}>{fallback}</div>;
}
