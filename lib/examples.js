// Dados fictícios, separados da configuração comercial da lanchonete.
export const exampleProducts = [
  {
    id: "example-croissant",
    name: "Croissant de presunto e queijo",
    categoryId: "category-0",
    description:
      "Massa folhada, presunto e queijo derretido. Produto e preço fictícios para demonstração; imagem ilustrativa gerada por IA.",
    price: 1500,
    promoPrice: 1200,
    image: "/assets/products/croissant.webp",
    groups: [
      {
        id: "example-extras",
        name: "Adicionais",
        min: 0,
        max: 2,
        options: [
          { id: "example-cheese", name: "Queijo extra", price: 250 },
          { id: "example-tomato", name: "Tomate", price: 150 },
        ],
      },
    ],
  },
  {
    id: "example-suco",
    name: "Suco de laranja",
    categoryId: "category-1",
    description:
      "Um toque cítrico para acompanhar seu lanche. Produto e preço fictícios para demonstração; imagem ilustrativa gerada por IA.",
    price: 800,
    promoPrice: null,
    image: "/assets/products/suco.webp",
    groups: [
      {
        id: "example-ice",
        name: "Gelo",
        min: 1,
        max: 1,
        options: [
          { id: "example-with-ice", name: "Com gelo", price: 0 },
          { id: "example-without-ice", name: "Sem gelo", price: 0 },
        ],
      },
    ],
  },
  {
    id: "example-hamburguer",
    name: "Hambúrguer clássico",
    categoryId: "category-2",
    description:
      "Pão com gergelim, hambúrguer, queijo, alface e tomate. Produto e preço fictícios para demonstração; imagem ilustrativa gerada por IA.",
    price: 2200,
    promoPrice: null,
    image: "/assets/products/hamburguer.webp",
    groups: [],
  },
].map((p, order) => ({
  ...p,
  order,
  active: true,
  soldOut: false,
  featured: true,
  demo: true,
}));
