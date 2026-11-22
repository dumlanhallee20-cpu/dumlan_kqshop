// Sample products (placeholder data). They are copied into localStorage the first time the site loads.
// Different colorways reuse the same photos with a CSS `tint` filter, so you can swap in real photos later.
// Raise SEED_VERSION whenever you edit this list so browsers load the new data.
const SEED_VERSION = 1;

function makeSizes(from, to) {
  const list = [];
  for (let s = from; s <= to; s += 0.5) list.push(s);
  return list;
}

const MEN = makeSizes(6, 11.5);
const WOMEN = makeSizes(5, 9.5);
const KIDS = makeSizes(3, 6.5);

const SEED_PRODUCTS = [
  {
    id: "kq63-neon-pink",
    name: "Padidas Adizero Select 3.0 KQ63",
    category: "men",
    colorway: "Neon Pink / White / Lime Green",
    price: 5800,
    featured: true,
    images: ["images/shoe-pink.png", "images/shoe-laces.png"],
    tint: "none",
    sizes: MEN,
    description:
      "Basketball shoe from the Kevin Quiambao × Quiccs collaboration, in a neon pink upper with white stripes and a lime green midsole.",
  },
  {
    id: "kq63-court-blue",
    name: "Padidas Adizero Select 3.0 KQ63",
    category: "men",
    colorway: "Court Blue / White",
    price: 5800,
    salePrice: 4640,
    featured: true,
    images: ["images/shoe-pink.png"],
    tint: "hue-rotate(250deg)",
    sizes: MEN,
    description: "The KQ63 in a cool court-blue colorway. Same fit and feel, different look.",
  },
  {
    id: "kq63-solar-orange",
    name: "Padidas Adizero Select 3.0 KQ63",
    category: "men",
    colorway: "Solar Orange / White",
    price: 5800,
    featured: true,
    images: ["images/shoe-pink.png"],
    tint: "hue-rotate(50deg)",
    sizes: MEN,
    description: "A bold orange colorway of the KQ63 for players who like to stand out.",
  },
  {
    id: "kq63-wmns-pink",
    name: "Padidas Adizero Select 3.0 KQ63 W",
    category: "women",
    colorway: "Neon Pink / White",
    price: 5400,
    featured: true,
    images: ["images/shoes-pair.png", "images/shoe-pink.png"],
    tint: "none",
    sizes: WOMEN,
    description: "Women's fit of the KQ63 in the signature neon pink colorway.",
  },
  {
    id: "kq63-wmns-lime",
    name: "Padidas Adizero Select 3.0 KQ63 W",
    category: "women",
    colorway: "Lime / White",
    price: 5400,
    images: ["images/shoe-pink.png"],
    tint: "hue-rotate(130deg)",
    sizes: WOMEN,
    description: "Women's fit of the KQ63 in a fresh lime colorway.",
  },
  {
    id: "kq63-wmns-violet",
    name: "Padidas Adizero Select 3.0 KQ63 W",
    category: "women",
    colorway: "Violet / White",
    price: 5400,
    salePrice: 4320,
    images: ["images/shoe-pink.png"],
    tint: "hue-rotate(290deg)",
    sizes: WOMEN,
    description: "Women's fit of the KQ63 in a deep violet colorway.",
  },
  {
    id: "kq63-kids-pink",
    name: "Padidas Adizero Select 3.0 KQ63 Kids",
    category: "kids",
    colorway: "Neon Pink / White",
    price: 3200,
    images: ["images/shoe-pink.png"],
    tint: "none",
    sizes: KIDS,
    description: "Kids' version of the KQ63 so the next generation can play in style.",
  },
  {
    id: "kq63-kids-sky",
    name: "Padidas Adizero Select 3.0 KQ63 Kids",
    category: "kids",
    colorway: "Sky Blue / White",
    price: 3200,
    salePrice: 2560,
    images: ["images/shoe-pink.png"],
    tint: "hue-rotate(250deg)",
    sizes: KIDS,
    description: "Kids' KQ63 in a bright sky-blue colorway.",
  },
];
