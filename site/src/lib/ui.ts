// Interface strings and language routing. Editorial copy lives in the content directory, not here.
// Russian is the working language; English and Armenian follow the same pages and show visible
// placeholders wherever their content has not been written yet.

export const langs = ['en', 'ru', 'hy'] as const;
export type Lang = (typeof langs)[number];
export const defaultLang = 'ru' satisfies Lang;
/** Languages served under their own prefix (/en/, /hy/); Russian lives at the root. */
export const translatedLangs = ['en', 'hy'] as const;

/** Labels of the language switch, in its order. */
export const langLabels: Record<Lang, string> = { en: 'ENG', ru: 'RUS', hy: 'ARM' };

const ru = {
  lang: 'ru',
  skipToContent: 'К содержанию',
  sections: 'Разделы сайта',
  language: 'Язык',
  objects: 'Предметы',
  chooseObject: 'Выберите предмет, чтобы открыть его проект.',
  homeVariant: 'Вариант главной',
  catalogue: 'Все проекты',
  catalogueEmpty: 'Проекты скоро появятся.',
  team: 'Команда',
  studio: 'Студия',
  materials: 'Из чего сделано',
  history: 'История проекта',
  fromAuthor: 'От автора',
  media: 'Фото и видео',
  projectObjects: 'Предметы проекта',
  project: 'проект',
  findOnField: 'Найти на поле LOST',
  allProjects: 'Все проекты',
  playVideo: 'Смотреть видео',
  photoCredit: 'Фото',
  longreadPending: 'Текст о Покр Айрум готовится.',
  notFoundTitle: 'Страница не найдена',
  notFoundText: 'Возможно, ссылка устарела. Начните с поля предметов или со списка проектов.',
  instagram: 'Instagram',
  partners: 'Партнёры',
  // Team preview placeholders
  noObject: 'Предмет не выбран',
  objectUncertain: 'Предмет под вопросом',
  noVideo: 'Видео пока нет',
  noPlace: 'Место пока не отмечено на карте',
  day: 'День',
  night: 'Ночь',
  processPhotos: 'Процесс',
  openPhoto: 'Открыть фото во весь экран',
  close: 'Закрыть',
  noText: 'Текста пока нет',
  noPhotos: 'Фото пока нет',
  notSpecified: 'не указано',
  // Untranslated content (English and Armenian only)
  pendingTitle: 'Название',
  pendingText: 'Текст готовится',
  pendingName: 'Имя',
  pendingAlt: 'Описание изображения готовится',
};

export type UiStrings = { [K in keyof typeof ru]: string };

const en: UiStrings = {
  lang: 'en',
  skipToContent: 'Skip to content',
  sections: 'Site sections',
  language: 'Language',
  objects: 'Objects',
  chooseObject: 'Choose an object to open its project.',
  homeVariant: 'Home variant',
  catalogue: 'All projects',
  catalogueEmpty: 'Projects are coming soon.',
  team: 'Team',
  studio: 'Studio',
  materials: 'Made from',
  history: 'Project story',
  fromAuthor: 'From the author',
  media: 'Photos and video',
  projectObjects: 'Project objects',
  project: 'project',
  findOnField: 'Find on the LOST field',
  allProjects: 'All projects',
  playVideo: 'Play video',
  photoCredit: 'Photo',
  longreadPending: 'The text about Pokr Ayrum is being written.',
  notFoundTitle: 'Page not found',
  notFoundText: 'The link may be out of date. Start from the object field or the project list.',
  instagram: 'Instagram',
  partners: 'Partners',
  noObject: 'No object chosen',
  objectUncertain: 'Object not settled yet',
  noVideo: 'No video yet',
  noPlace: 'Not marked on the map yet',
  day: 'Day',
  night: 'Night',
  processPhotos: 'Process',
  openPhoto: 'Open the photo full screen',
  close: 'Close',
  noText: 'No text yet',
  noPhotos: 'No photos yet',
  notSpecified: 'not specified',
  pendingTitle: 'Title',
  pendingText: 'English text coming',
  pendingName: 'Name',
  pendingAlt: 'Image description coming',
};

const hy: UiStrings = {
  lang: 'hy',
  skipToContent: 'Անցնել բովանդակությանը',
  sections: 'Կայքի բաժիններ',
  language: 'Լեզու',
  objects: 'Առարկաներ',
  chooseObject: 'Ընտրեք առարկա՝ նրա նախագիծը բացելու համար։',
  homeVariant: 'Գլխավոր էջի տարբերակ',
  catalogue: 'Բոլոր նախագծերը',
  catalogueEmpty: 'Նախագծերը շուտով կհայտնվեն։',
  team: 'Թիմ',
  studio: 'Ստուդիա',
  materials: 'Ինչից է պատրաստված',
  history: 'Նախագծի պատմությունը',
  fromAuthor: 'Հեղինակից',
  media: 'Լուսանկարներ և տեսանյութեր',
  projectObjects: 'Նախագծի առարկաները',
  project: 'նախագիծ',
  findOnField: 'Գտնել LOST դաշտում',
  allProjects: 'Բոլոր նախագծերը',
  playVideo: 'Դիտել տեսանյութը',
  photoCredit: 'Լուսանկար',
  longreadPending: 'Պոկր Այրումի մասին տեքստը պատրաստվում է։',
  notFoundTitle: 'Էջը չի գտնվել',
  notFoundText: 'Հնարավոր է՝ հղումը հնացած է։ Սկսեք առարկաների դաշտից կամ նախագծերի ցանկից։',
  instagram: 'Instagram',
  partners: 'Գործընկերներ',
  noObject: 'Առարկան ընտրված չէ',
  objectUncertain: 'Առարկան դեռ ճշտվում է',
  noVideo: 'Տեսանյութը դեռ չկա',
  noPlace: 'Տեղը դեռ նշված չէ քարտեզում',
  day: 'Ցերեկ',
  night: 'Գիշեր',
  processPhotos: 'Գործընթաց',
  openPhoto: 'Բացել լուսանկարը ամբողջ էկրանով',
  close: 'Փակել',
  noText: 'Տեքստը դեռ չկա',
  noPhotos: 'Լուսանկարները դեռ չկան',
  notSpecified: 'նշված չէ',
  pendingTitle: 'Վերնագիր',
  pendingText: 'Հայերեն տեքստը պատրաստվում է',
  pendingName: 'Անուն',
  pendingAlt: 'Պատկերի նկարագրությունը պատրաստվում է',
};

const strings: Record<Lang, UiStrings> = { ru, en, hy };

export const uiFor = (lang: Lang): UiStrings => strings[lang];

/** Russian strings, for code that runs outside a page (checks, tests). */
export const ui = ru;
