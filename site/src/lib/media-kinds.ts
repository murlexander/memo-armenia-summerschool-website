// What a project is (a film, a zine, a mosaic…), independent of the studio that made it: studios suggest a medium,
// but their members also made other things. Projects list keys from this vocabulary in `medium` (one or more);
// an unknown key fails the content checks. The order here is the order of the FOUND filter chips.
import type { Lang } from './ui.ts';

export const mediumLabels = {
  film: { ru: 'фильм', en: 'film', hy: 'ֆիլմ' },
  animation: { ru: 'анимация', en: 'animation', hy: 'անիմացիա' },
  play: { ru: 'спектакль', en: 'play', hy: 'ներկայացում' },
  zine: { ru: 'зин', en: 'zine', hy: 'զին' },
  comic: { ru: 'комикс', en: 'comic', hy: 'կոմիքս' },
  mosaic: { ru: 'мозаика', en: 'mosaic', hy: 'խճանկար' },
  mural: { ru: 'роспись', en: 'mural', hy: 'որմնանկար' },
  lightbox: { ru: 'ланчбокс', en: 'light box', hy: 'լուսատուփ' },
  installation: { ru: 'инсталляция', en: 'installation', hy: 'ինստալյացիա' },
  sculpture: { ru: 'скульптура', en: 'sculpture', hy: 'քանդակ' },
} as const satisfies Record<string, Record<Lang, string>>;

export type Medium = keyof typeof mediumLabels;
export const mediums = Object.keys(mediumLabels) as [Medium, ...Medium[]];

/** The two camp shifts (смены). */
export const shifts = [1, 2] as const;
export type Shift = (typeof shifts)[number];

export const shiftLabels: Record<Lang, (shift: Shift) => string> = {
  ru: (shift) => `${shift}-я смена`,
  en: (shift) => `Session ${shift}`,
  hy: (shift) => `${shift}-ին հերթափոխ`,
};
