'use client';
import { useQueryClient } from '@tanstack/react-query';

export function Test() {
  const query = useQueryClient();
  console.log(query);

  return <div>Test client component</div>;
}
