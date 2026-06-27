export type SkinTone = 'Light' | 'Tan' | 'Medium' | 'Dark';
export type HairColor = 'Black' | 'Brown' | 'Blonde' | 'Red' | 'Grey' | 'White';
export type HairStyle = 'Short' | 'Long' | 'Curly' | 'Wavy';
export type EyeColor = 'Brown' | 'Blue' | 'Green' | 'Hazel' | 'Grey';
export type AgeGroup = 'Young' | 'Adult' | 'Senior';
export type Gender = 'Male' | 'Female';

export interface GWCharacter {
  id: number;
  name: string;
  gender: Gender;
  hairColor: HairColor;
  hairStyle: HairStyle;
  eyeColor: EyeColor;
  skinTone: SkinTone;
  glasses: boolean;
  hat: boolean;
  beard: boolean;
  mustache: boolean;
  bald: boolean;
  ageGroup: AgeGroup;
}

export const GW_CHARACTERS: GWCharacter[] = [
  { id: 1,  name: 'Sophia',  gender: 'Female', hairColor: 'Blonde', hairStyle: 'Long',  eyeColor: 'Blue',  skinTone: 'Light',  glasses: true,  hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Young' },
  { id: 2,  name: 'Marcus',  gender: 'Male',   hairColor: 'Black',  hairStyle: 'Short', eyeColor: 'Brown', skinTone: 'Dark',   glasses: false, hat: false, beard: true,  mustache: false, bald: false, ageGroup: 'Adult' },
  { id: 3,  name: 'Elena',   gender: 'Female', hairColor: 'Brown',  hairStyle: 'Wavy',  eyeColor: 'Green', skinTone: 'Medium', glasses: false, hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Young' },
  { id: 4,  name: 'James',   gender: 'Male',   hairColor: 'Brown',  hairStyle: 'Short', eyeColor: 'Blue',  skinTone: 'Light',  glasses: true,  hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Adult' },
  { id: 5,  name: 'Aisha',   gender: 'Female', hairColor: 'Black',  hairStyle: 'Curly', eyeColor: 'Brown', skinTone: 'Dark',   glasses: false, hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Young' },
  { id: 6,  name: 'Oliver',  gender: 'Male',   hairColor: 'Blonde', hairStyle: 'Short', eyeColor: 'Blue',  skinTone: 'Light',  glasses: false, hat: true,  beard: false, mustache: false, bald: false, ageGroup: 'Adult' },
  { id: 7,  name: 'Maya',    gender: 'Female', hairColor: 'Red',    hairStyle: 'Wavy',  eyeColor: 'Green', skinTone: 'Tan',    glasses: false, hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Young' },
  { id: 8,  name: 'Carlos',  gender: 'Male',   hairColor: 'Black',  hairStyle: 'Short', eyeColor: 'Brown', skinTone: 'Tan',    glasses: false, hat: false, beard: false, mustache: true,  bald: false, ageGroup: 'Adult' },
  { id: 9,  name: 'Lily',    gender: 'Female', hairColor: 'Blonde', hairStyle: 'Long',  eyeColor: 'Blue',  skinTone: 'Light',  glasses: false, hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Young' },
  { id: 10, name: 'Robert',  gender: 'Male',   hairColor: 'Grey',   hairStyle: 'Short', eyeColor: 'Blue',  skinTone: 'Light',  glasses: true,  hat: false, beard: true,  mustache: false, bald: false, ageGroup: 'Senior' },
  { id: 11, name: 'Priya',   gender: 'Female', hairColor: 'Black',  hairStyle: 'Long',  eyeColor: 'Brown', skinTone: 'Medium', glasses: false, hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Adult' },
  { id: 12, name: 'David',   gender: 'Male',   hairColor: 'Brown',  hairStyle: 'Short', eyeColor: 'Hazel', skinTone: 'Light',  glasses: false, hat: true,  beard: false, mustache: false, bald: false, ageGroup: 'Adult' },
  { id: 13, name: 'Zoe',     gender: 'Female', hairColor: 'Red',    hairStyle: 'Curly', eyeColor: 'Green', skinTone: 'Light',  glasses: true,  hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Young' },
  { id: 14, name: 'Samuel',  gender: 'Male',   hairColor: 'Black',  hairStyle: 'Short', eyeColor: 'Brown', skinTone: 'Dark',   glasses: false, hat: false, beard: true,  mustache: true,  bald: false, ageGroup: 'Adult' },
  { id: 15, name: 'Aria',    gender: 'Female', hairColor: 'Brown',  hairStyle: 'Long',  eyeColor: 'Blue',  skinTone: 'Tan',    glasses: false, hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Young' },
  { id: 16, name: 'Chen',    gender: 'Male',   hairColor: 'Black',  hairStyle: 'Short', eyeColor: 'Brown', skinTone: 'Medium', glasses: true,  hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Adult' },
  { id: 17, name: 'Nadia',   gender: 'Female', hairColor: 'Blonde', hairStyle: 'Wavy',  eyeColor: 'Grey',  skinTone: 'Light',  glasses: true,  hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Adult' },
  { id: 18, name: 'Tom',     gender: 'Male',   hairColor: 'Brown',  hairStyle: 'Short', eyeColor: 'Green', skinTone: 'Light',  glasses: false, hat: true,  beard: true,  mustache: false, bald: false, ageGroup: 'Adult' },
  { id: 19, name: 'Luna',    gender: 'Female', hairColor: 'Black',  hairStyle: 'Long',  eyeColor: 'Blue',  skinTone: 'Dark',   glasses: false, hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Young' },
  { id: 20, name: 'Felix',   gender: 'Male',   hairColor: 'Blonde', hairStyle: 'Short', eyeColor: 'Blue',  skinTone: 'Light',  glasses: false, hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Young' },
  { id: 21, name: 'Rosa',    gender: 'Female', hairColor: 'Brown',  hairStyle: 'Curly', eyeColor: 'Brown', skinTone: 'Tan',    glasses: false, hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Adult' },
  { id: 22, name: 'Hugo',    gender: 'Male',   hairColor: 'Grey',   hairStyle: 'Short', eyeColor: 'Grey',  skinTone: 'Light',  glasses: true,  hat: false, beard: false, mustache: true,  bald: true,  ageGroup: 'Senior' },
  { id: 23, name: 'Amara',   gender: 'Female', hairColor: 'Black',  hairStyle: 'Curly', eyeColor: 'Brown', skinTone: 'Dark',   glasses: false, hat: true,  beard: false, mustache: false, bald: false, ageGroup: 'Adult' },
  { id: 24, name: 'Liam',    gender: 'Male',   hairColor: 'Brown',  hairStyle: 'Short', eyeColor: 'Green', skinTone: 'Light',  glasses: true,  hat: false, beard: true,  mustache: false, bald: false, ageGroup: 'Young' },
  { id: 25, name: 'Ingrid',  gender: 'Female', hairColor: 'Blonde', hairStyle: 'Long',  eyeColor: 'Blue',  skinTone: 'Light',  glasses: false, hat: true,  beard: false, mustache: false, bald: false, ageGroup: 'Adult' },
  { id: 26, name: 'Diego',   gender: 'Male',   hairColor: 'Black',  hairStyle: 'Short', eyeColor: 'Brown', skinTone: 'Tan',    glasses: false, hat: false, beard: true,  mustache: false, bald: false, ageGroup: 'Adult' },
  { id: 27, name: 'Fatima',  gender: 'Female', hairColor: 'Black',  hairStyle: 'Long',  eyeColor: 'Brown', skinTone: 'Dark',   glasses: true,  hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Adult' },
  { id: 28, name: 'Patrick', gender: 'Male',   hairColor: 'Red',    hairStyle: 'Short', eyeColor: 'Green', skinTone: 'Light',  glasses: false, hat: false, beard: true,  mustache: false, bald: false, ageGroup: 'Adult' },
  { id: 29, name: 'Yuki',    gender: 'Female', hairColor: 'Black',  hairStyle: 'Short', eyeColor: 'Brown', skinTone: 'Medium', glasses: false, hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Young' },
  { id: 30, name: 'Andre',   gender: 'Male',   hairColor: 'Black',  hairStyle: 'Short', eyeColor: 'Brown', skinTone: 'Dark',   glasses: false, hat: false, beard: true,  mustache: false, bald: true,  ageGroup: 'Adult' },
  { id: 31, name: 'Cleo',    gender: 'Female', hairColor: 'Red',    hairStyle: 'Short', eyeColor: 'Blue',  skinTone: 'Light',  glasses: false, hat: true,  beard: false, mustache: false, bald: false, ageGroup: 'Young' },
  { id: 32, name: 'Viktor',  gender: 'Male',   hairColor: 'White',  hairStyle: 'Short', eyeColor: 'Grey',  skinTone: 'Light',  glasses: true,  hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Senior' },
  { id: 33, name: 'Keisha',  gender: 'Female', hairColor: 'Brown',  hairStyle: 'Wavy',  eyeColor: 'Brown', skinTone: 'Dark',   glasses: false, hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Adult' },
  { id: 34, name: 'Finn',    gender: 'Male',   hairColor: 'Blonde', hairStyle: 'Curly', eyeColor: 'Blue',  skinTone: 'Light',  glasses: false, hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Young' },
  { id: 35, name: 'Sara',    gender: 'Female', hairColor: 'Grey',   hairStyle: 'Long',  eyeColor: 'Green', skinTone: 'Light',  glasses: false, hat: false, beard: false, mustache: false, bald: false, ageGroup: 'Senior' },
  { id: 36, name: 'Omar',    gender: 'Male',   hairColor: 'Black',  hairStyle: 'Short', eyeColor: 'Brown', skinTone: 'Tan',    glasses: false, hat: true,  beard: false, mustache: true,  bald: false, ageGroup: 'Adult' },
];

export interface GWQuestion {
  id: string;
  category: string;
  text: string;
  attr: keyof GWCharacter;
  value: string | boolean | string[];
}

export const GW_QUESTIONS: GWQuestion[] = [
  // Gender
  { id: 'g_female', category: 'Gender', text: 'Is your character female?',          attr: 'gender',    value: 'Female' },
  { id: 'g_male',   category: 'Gender', text: 'Is your character male?',            attr: 'gender',    value: 'Male' },

  // Hair color
  { id: 'hc_black',  category: 'Hair Color', text: 'Does your character have black hair?',          attr: 'hairColor', value: 'Black' },
  { id: 'hc_brown',  category: 'Hair Color', text: 'Does your character have brown hair?',          attr: 'hairColor', value: 'Brown' },
  { id: 'hc_blonde', category: 'Hair Color', text: 'Does your character have blonde hair?',         attr: 'hairColor', value: 'Blonde' },
  { id: 'hc_red',    category: 'Hair Color', text: 'Does your character have red hair?',            attr: 'hairColor', value: 'Red' },
  { id: 'hc_greyw',  category: 'Hair Color', text: 'Does your character have grey or white hair?',  attr: 'hairColor', value: ['Grey', 'White'] },

  // Hair style
  { id: 'hs_bald',  category: 'Hair Style', text: 'Is your character bald?',                    attr: 'bald',      value: true },
  { id: 'hs_long',  category: 'Hair Style', text: 'Does your character have long hair?',        attr: 'hairStyle', value: 'Long' },
  { id: 'hs_curly', category: 'Hair Style', text: 'Does your character have curly hair?',       attr: 'hairStyle', value: 'Curly' },
  { id: 'hs_wavy',  category: 'Hair Style', text: 'Does your character have wavy hair?',        attr: 'hairStyle', value: 'Wavy' },

  // Eyes
  { id: 'e_blue',   category: 'Eyes', text: 'Does your character have blue eyes?',          attr: 'eyeColor', value: 'Blue' },
  { id: 'e_brown',  category: 'Eyes', text: 'Does your character have brown eyes?',         attr: 'eyeColor', value: 'Brown' },
  { id: 'e_green',  category: 'Eyes', text: 'Does your character have green eyes?',         attr: 'eyeColor', value: 'Green' },
  { id: 'e_hazgr',  category: 'Eyes', text: 'Does your character have hazel or grey eyes?', attr: 'eyeColor', value: ['Hazel', 'Grey'] },

  // Skin
  { id: 's_light',  category: 'Skin Tone', text: 'Does your character have light skin?', attr: 'skinTone', value: 'Light' },
  { id: 's_dark',   category: 'Skin Tone', text: 'Does your character have dark skin?',  attr: 'skinTone', value: 'Dark' },
  { id: 's_tan',    category: 'Skin Tone', text: 'Does your character have tan skin?',   attr: 'skinTone', value: 'Tan' },

  // Accessories
  { id: 'a_glasses', category: 'Accessories', text: 'Does your character wear glasses?', attr: 'glasses', value: true },
  { id: 'a_hat',     category: 'Accessories', text: 'Does your character wear a hat?',   attr: 'hat',     value: true },

  // Facial hair
  { id: 'f_beard',    category: 'Facial Hair', text: 'Does your character have a beard?',    attr: 'beard',    value: true },
  { id: 'f_mustache', category: 'Facial Hair', text: 'Does your character have a mustache?', attr: 'mustache', value: true },

  // Age
  { id: 'ag_young',  category: 'Age', text: 'Is your character young (under 30)?', attr: 'ageGroup', value: 'Young' },
  { id: 'ag_senior', category: 'Age', text: 'Is your character a senior (60+)?',   attr: 'ageGroup', value: 'Senior' },
];

export const GW_QUESTION_CATEGORIES = [...new Set(GW_QUESTIONS.map(q => q.category))];

export function gwAnswerQuestion(character: GWCharacter, questionId: string): boolean {
  const q = GW_QUESTIONS.find(q => q.id === questionId);
  if (!q) return false;

  // Bald characters don't match hair color or style questions (only the 'bald' question itself)
  if (q.attr === 'hairColor' && character.bald) return false;
  if (q.attr === 'hairStyle' && character.bald) return false;

  const attrValue = character[q.attr];
  if (Array.isArray(q.value)) {
    return (q.value as string[]).includes(attrValue as string);
  }
  return attrValue === q.value;
}
