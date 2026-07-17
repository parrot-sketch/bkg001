import type { CSSProperties } from 'react';
import styles from './Loader.module.scss';

type LoaderProps = {
  size?: string;
  grid?: number;
};

export default function Loader({
  size = '2.5rem',
  grid = 4,
}: LoaderProps) {
  const cubes = Array.from({ length: grid * grid });

  return (
    <div
      className={styles.loader}
      style={{
        '--size': size,
        '--n': grid,
      } as CSSProperties}
    >
      {cubes.map((_, index) => {
        const i = index % grid;
        const j = Math.floor(index / grid);

        return (
          <div
            key={index}
            className={styles.cube}
            style={{
              '--i': i,
              '--j': j,
            } as CSSProperties}
          />
        );
      })}
    </div>
  );
}