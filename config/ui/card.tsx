'use client';

import * as React from 'react';
import { block } from '@page-blocks/react';
import { z } from 'zod';
import { useState } from 'react';

export default block(
  {
    label: 'Card example',
    props: z.object({
      className: z.string().optional(),
      title: z.string(),
      text: z.string(),
      href: z.string(),
    }),
    examples: [
      {
        label: 'Example',
        context: {},
        props: {
          title: 'Example title',
          text: 'Example text',
          href: 'https://example.com',
        },
      },
    ],
  },
  function Card({ className, title, text, href }) {
    const [count, setCount] = useState(0);
    return (
      <div
        className={className}
        // href={`${href}?utm_source=create-turbo&utm_medium=basic&utm_campaign=create-turbo"`}
        // rel="noopener noreferrer"
        // target="_blank"
      >
        <h2>
          {title} <span>-&gt;</span>
        </h2>
        <p>{text}</p>
        <button onClick={() => setCount(count + 1)}>Click me {count}</button>
      </div>
    );
  }
);
