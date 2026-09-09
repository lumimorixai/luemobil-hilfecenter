import * as migration_20260712_150435_initial from './20260712_150435_initial';
import * as migration_20260712_191953_roadmap from './20260712_191953_roadmap';
import * as migration_20260713_085651_notify_field from './20260713_085651_notify_field';
import * as migration_20260714_132826_jira_fields from './20260714_132826_jira_fields';
import * as migration_20260904_180000_cockpit_daily from './20260904_180000_cockpit_daily';
import * as migration_20260906_150000_cockpit_registrations from './20260906_150000_cockpit_registrations';
import * as migration_20260909_153000_health_checks from './20260909_153000_health_checks';

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
  {
    up: migration_20260904_180000_cockpit_daily.up,
    down: migration_20260904_180000_cockpit_daily.down,
    name: '20260904_180000_cockpit_daily',
  },
  {
    up: migration_20260906_150000_cockpit_registrations.up,
    down: migration_20260906_150000_cockpit_registrations.down,
    name: '20260906_150000_cockpit_registrations',
  },
  {
    up: migration_20260909_153000_health_checks.up,
    down: migration_20260909_153000_health_checks.down,
    name: '20260909_153000_health_checks',
  },
];
