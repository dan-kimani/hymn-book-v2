import type { HymnRef } from "@/state/collectionsStore";

export interface DefaultCollection {
  id: string;
  name: string;
  emoji: string;
  hymns: HymnRef[];
}

export const DEFAULT_COLLECTIONS: DefaultCollection[] = [
  {
    id: "mahoya",
    name: "Nyimbo Cia Mahoya",
    emoji: "🙏",
    hymns: [
      { hymnId: "roho-mutheru:8", bookId: "roho-mutheru", number: 8, title: "Ngai wa aria me muoyo", bookName: "Nyimbo Cia Roho Mutheru" },
      {
        hymnId: "roho-mutheru:17",
        bookId: "roho-mutheru",
        number: 17,
        title: "Gĩtĩ gĩaku Jehova nĩ kĩrũmu",
        bookName: "Nyimbo Cia Roho Mutheru",
      },
      {
        hymnId: "roho-mutheru:136",
        bookId: "roho-mutheru",
        number: 136,
        title: "Mũtheru wa Iburahĩmu",
        bookName: "Nyimbo Cia Roho Mutheru",
      },
      {
        hymnId: "roho-mutheru:194",
        bookId: "roho-mutheru",
        number: 194,
        title: "Igongona rĩa ma rĩonanirio",
        bookName: "Nyimbo Cia Roho Mutheru",
      },
      { hymnId: "roho-mutheru:269", bookId: "roho-mutheru", number: 269, title: "Igongona rĩa ma", bookName: "Nyimbo Cia Roho Mutheru" },
      {
        hymnId: "roho-mutheru:421",
        bookId: "roho-mutheru",
        number: 421,
        title: "Mahoya hoyaga ndĩ gũkũ thĩ",
        bookName: "Nyimbo Cia Roho Mutheru",
      },
      {
        hymnId: "roho-mutheru:456",
        bookId: "roho-mutheru",
        number: 456,
        title: "Hingo ya kũhoya gwitũ",
        bookName: "Nyimbo Cia Roho Mutheru",
      },
      {
        hymnId: "roho-mutheru:507",
        bookId: "roho-mutheru",
        number: 507,
        title: "Ngai angĩgakũhe ũhoti",
        bookName: "Nyimbo Cia Roho Mutheru",
      },
    ],
  },
  {
    id: "kiumia",
    name: "Nyimbo Cia Kĩũmia",
    emoji: "⛪",
    hymns: [
      {
        hymnId: "roho-mutheru:50",
        bookId: "roho-mutheru",
        number: 50,
        title: "Ũkai andũ a Mwathani, na mwarahũre ngoro",
        bookName: "Nyimbo Cia Roho Mutheru",
      },
      { hymnId: "atumwo:53", bookId: "atumwo", number: 53, title: "He nyũmba njega ĩrĩ thĩinĩ wa andũ", bookName: "Nyimbo Cia Atumwo" },
      {
        hymnId: "roho-mutheru:57",
        bookId: "roho-mutheru",
        number: 57,
        title: "Nĩ ciugo cia gũtũthambia",
        bookName: "Nyimbo Cia Roho Mutheru",
      },
      {
        hymnId: "roho-mutheru:143",
        bookId: "roho-mutheru",
        number: 143,
        title: "Jehova nĩ Mũthamaki",
        bookName: "Nyimbo Cia Roho Mutheru",
      },
      { hymnId: "kiroho:323", bookId: "kiroho", number: 323, title: "Mũthenya wa kiumia marekererio", bookName: "Nyimbo Cia Kiroho" },
      { hymnId: "kiroho:355", bookId: "kiroho", number: 355, title: "Iguai athuri na atumia", bookName: "Nyimbo Cia Kiroho" },
    ],
  },
  {
    id: "muhothi",
    name: "Nyimbo Cia Mũhothi",
    emoji: "✝️",
    hymns: [
      {
        hymnId: "roho-mutheru:230",
        bookId: "roho-mutheru",
        number: 230,
        title: "Wehĩta mwĩhĩtwa ũkoniĩ Ngai",
        bookName: "Nyimbo Cia Roho Mutheru",
      },
      {
        hymnId: "roho-mutheru:387",
        bookId: "roho-mutheru",
        number: 387,
        title: "Ngoocaga atĩa Mũhonokia",
        bookName: "Nyimbo Cia Roho Mutheru",
      },
    ],
  },
  {
    id: "ruciini",
    name: "Nyimbo Cia Rũciinĩ",
    emoji: "🌅",
    hymns: [
      { hymnId: "atumwo:1", bookId: "atumwo", number: 1, title: "Rĩugũkũthĩ kwĩna Ũtheri", bookName: "Nyimbo Cia Atumwo" },
      { hymnId: "atumwo:156", bookId: "atumwo", number: 156, title: "Njĩra Ũhoro mwega", bookName: "Nyimbo Cia Atumwo" },
    ],
  },
  {
    id: "hwaini",
    name: "Nyimbo Cia Hwainĩ",
    emoji: "🌇",
    hymns: [
      { hymnId: "atumwo:4", bookId: "atumwo", number: 4, title: "Rĩu tũrathime Jesu", bookName: "Nyimbo Cia Atumwo" },
      { hymnId: "atumwo:171", bookId: "atumwo", number: 171, title: "Maikarĩte thĩ ũtukũ", bookName: "Nyimbo Cia Atumwo" },
    ],
  },
];

/** Increment this to trigger re-seeding of untouched default collections */
export const CURRENT_SEED_VERSION = 2;
