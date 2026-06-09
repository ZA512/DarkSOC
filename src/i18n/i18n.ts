import frActions from '../data/i18n/fr/actions.json';
import frAttacks from '../data/i18n/fr/attacks.json';
import frCommon from '../data/i18n/fr/common.json';
import frEmployees from '../data/i18n/fr/employees.json';
import frEmployeeTasks from '../data/i18n/fr/employeeTasks.json';
import frEvents from '../data/i18n/fr/events.json';
import frResources from '../data/i18n/fr/resources.json';
import frSave from '../data/i18n/fr/save.json';
import frTechnologies from '../data/i18n/fr/technologies.json';
import type { Locale } from '../game/model/Settings';

type Dictionary = Record<string, string>;

const dictionaries: Record<Locale, Dictionary> = {
  fr: {
    ...frCommon,
    ...frActions,
    ...frAttacks,
    ...frEmployees,
    ...frEmployeeTasks,
    ...frResources,
    ...frSave,
    ...frTechnologies,
    ...frEvents,
  },
  en: {},
};

export function t(key: string, locale: Locale = 'fr'): string {
  const value = dictionaries[locale]?.[key];

  if (value) {
    return value;
  }

  if (import.meta.env.DEV) {
    console.warn(`Missing i18n key: ${key}`);
  }

  return `[${key}]`;
}
