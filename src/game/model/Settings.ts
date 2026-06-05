export type Locale = 'fr' | 'en';

export type AnimationMode = 'normal' | 'reduced' | 'off';

export type ContrastMode = 'normal' | 'high';

export type GameSettings = {
  locale: Locale;
  animationMode: AnimationMode;
  contrastMode: ContrastMode;
};
