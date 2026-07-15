import * as migration_20260712_150435_initial from './20260712_150435_initial';
import * as migration_20260712_191953_roadmap from './20260712_191953_roadmap';
import * as migration_20260713_085651_notify_field from './20260713_085651_notify_field';
import * as migration_20260714_132826_jira_fields from './20260714_132826_jira_fields';

export const migrations = [
  {
    up: migration_20260712_150435_initial.up,
    down: migration_20260712_150435_initial.down,
    name: '20260712_150435_initial',
  },
  {
    up: migration_20260712_191953_roadmap.up,
    down: migration_20260712_191953_roadmap.down,
    name: '20260712_191953_roadmap',
  },
  {
    up: migration_20260713_085651_notify_field.up,
    down: migration_20260713_085651_notify_field.down,
    name: '20260713_085651_notify_field',
  },
  {
    up: migration_20260714_132826_jira_fields.up,
    down: migration_20260714_132826_jira_fields.down,
    name: '20260714_132826_jira_fields'
  },
];
