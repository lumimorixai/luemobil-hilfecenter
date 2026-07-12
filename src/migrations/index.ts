import * as migration_20260712_150435_initial from './20260712_150435_initial';

export const migrations = [
  {
    up: migration_20260712_150435_initial.up,
    down: migration_20260712_150435_initial.down,
    name: '20260712_150435_initial'
  },
];
