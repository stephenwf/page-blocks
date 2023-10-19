import { BlockEditor } from './blocks/block-editor.lazy';
import { Blocks } from './blocks/directory';
import { Slot } from './blocks/slot';
import styles from './page.module.css';

export default function Page(): JSX.Element {
  return (
    <main className={styles.main}>
      <h1>Testing page blocks</h1>

      <Slot name="footer" context={{}}>
        <Blocks.Card
          href="https://vercel.com?utm_source=create-turbo&utm_medium=basic&utm_campaign=create-turbo"
          title="TESTING"
          text="Deployed with Vercel"
        />
      </Slot>

      {process.env.NODE_ENV !== 'production' ? <BlockEditor showToggle /> : null}
    </main>
  );
}
