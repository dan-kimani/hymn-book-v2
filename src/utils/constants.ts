import { BookId } from "@/data/types";
import { theme } from "@/theme/colors";

export const BOOK_COVERS: Record<string, any> = {
  "roho-mutheru": require("../../assets/books/nyimbo-cia-roho-mutheru.png"),
  atumwo: require("../../assets/books/nyimbo-cia-atumwo.png"),
  kiroho: require("../../assets/books/nyimbo-cia-kiroho.png"),
  "golden-bells": require("../../assets/books/golden-bells.png"),
};

export const BOOKS = [
  {
    id: "roho-mutheru" as BookId,
    name: "Nyimbo Cia Roho Mutheru",
    shortName: "Roho Mutheru",
    count: 555,
    color: theme.bookRohoMutheru,
    desc: "Hymns of the Holy Spirit",
    language: "Kikuyu",
  },
  {
    id: "atumwo" as BookId,
    name: "Nyimbo Cia Atumwo",
    shortName: "Atumwo",
    count: 218,
    color: theme.bookAtumwo,
    desc: "Hymns of the Apostles",
    language: "Kikuyu",
  },
  {
    id: "kiroho" as BookId,
    name: "Nyimbo Cia Kiroho",
    shortName: "Kiroho",
    count: 464,
    color: theme.bookKiroho,
    desc: "Spiritual Hymns",
    language: "Kikuyu",
  },
  {
    id: "golden-bells" as BookId,
    name: "Golden Bells",
    shortName: "Golden Bells",
    count: 771,
    color: theme.bookGoldenBells,
    desc: "English Hymnal",
    language: "English",
  },
];
