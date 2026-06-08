declare module "nspell" {
  export type NSpell = {
    correct(word: string): boolean;
    add(word: string): void;
  };

  export default function nspell(aff: string, dic: string): NSpell;
}
