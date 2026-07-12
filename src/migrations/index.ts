import * as migration_20260712_150435_initial from './20260712_150435_initial';
import * as migration_20260712_191953_roadmap from './20260712_191953_roadmap';

export const migrations = [
  {
    up: migration_20260712_150435_initial.up,
    down: migration_20260712_150435_initial.down,
    name: '20260712_150435_initial',
  },
  {
    up: migration_20260712_191953_roadmap.up,
    down: migration_20260712_191953_roadmap.down,
    name: '20260712_191953_roadmap'
  },
];
