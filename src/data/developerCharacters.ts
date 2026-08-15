import { ImageSourcePropType } from 'react-native';

export type DeveloperCharacter = {
  year: number;
  name: string;
  label: string;
  gender: 'male' | 'female';
  image: ImageSourcePropType;
};

const characterNames = [
  '평범한 학생',
  '견습 개발자',
  '버그 헌터',
  '디버깅 탐정',
  '프로덕션 수호기사',
  '코드 연금술사',
  '시스템 건축가',
  '테크 리드',
  '시스템 탐험가',
  '개발 현자',
  '대마법사',
] as const;

const maleImages = [
  require('../../assets/characters/lowres/year00_male_student.png'),
  require('../../assets/characters/lowres/year01_male_apprentice.png'),
  require('../../assets/characters/lowres/year02_male_bug_hunter.png'),
  require('../../assets/characters/lowres/year03_male_debug_detective.png'),
  require('../../assets/characters/lowres/year04_male_prod_guardian.png'),
  require('../../assets/characters/lowres/year05_male_code_alchemist.png'),
  require('../../assets/characters/lowres/year06_male_system_architect.png'),
  require('../../assets/characters/lowres/year07_male_tech_lead.png'),
  require('../../assets/characters/lowres/year08_male_system_explorer.png'),
  require('../../assets/characters/lowres/year09_male_developer_sage.png'),
  require('../../assets/characters/lowres/year10_male_archmage.png'),
] as const;

const femaleImages = [
  require('../../assets/characters/lowres/year00_female_student.png'),
  require('../../assets/characters/lowres/year01_female_apprentice.png'),
  require('../../assets/characters/lowres/year02_female_bug_hunter.png'),
  require('../../assets/characters/lowres/year03_female_debug_detective.png'),
  require('../../assets/characters/lowres/year04_female_prod_guardian.png'),
  require('../../assets/characters/lowres/year05_female_code_alchemist.png'),
  require('../../assets/characters/lowres/year06_female_system_architect.png'),
  require('../../assets/characters/lowres/year07_female_tech_lead.png'),
  require('../../assets/characters/lowres/year08_female_system_explorer.png'),
  require('../../assets/characters/lowres/year09_female_developer_sage.png'),
  require('../../assets/characters/lowres/year10_female_archmage.png'),
] as const;

const clampRatio = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

export const getDeveloperYear = (learningRatio: number, problemRatio: number) => {
  const growthRatio = (clampRatio(learningRatio) + clampRatio(problemRatio)) / 2;
  return Math.max(0, Math.min(10, Math.round(growthRatio * 10)));
};

export const getDeveloperCharacterPair = (year: number) => {
  const safeYear = Math.max(0, Math.min(10, Math.round(year)));
  const name = characterNames[safeYear];
  const label = `${safeYear}년차 ${name}`;

  return [
    {
      year: safeYear,
      name,
      label,
      gender: 'male',
      image: maleImages[safeYear],
    },
    {
      year: safeYear,
      name,
      label,
      gender: 'female',
      image: femaleImages[safeYear],
    },
  ] satisfies DeveloperCharacter[];
};
