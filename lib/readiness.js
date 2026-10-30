export function launchIssues({ config: c, categories, products, adminCount }) {
  const issues = [];
  if (!adminCount) issues.push("Crie o administrador no banco de produção.");
  const active = products.filter(
    (p) =>
      p.active &&
      categories.some(
        (category) => category.id === p.categoryId && category.active,
      ),
  );
  if (!active.some((p) => !p.soldOut && !p.demo))
    issues.push(
      "Cadastre pelo menos um produto real disponível em uma categoria ativa.",
    );
  if (active.some((p) => p.demo || /^\/assets\/products\//.test(p.image || "")))
    issues.push(
      "Substitua ou desative os produtos e imagens de demonstração antes de receber pedidos reais.",
    );
  if (!c.payments.length) issues.push("Cadastre as formas de pagamento.");
  if (!c.pickup && !c.delivery) issues.push("Habilite entrega ou retirada.");
  if (c.pickup && !c.address.trim())
    issues.push("Cadastre o endereço de retirada.");
  if (c.delivery && !c.neighborhoods.length)
    issues.push("Cadastre os bairros atendidos pela entrega.");
  if (c.mode === "auto" && !c.hours.some((h) => h.enabled))
    issues.push(
      "Configure pelo menos um dia de funcionamento ou mantenha o fechamento manual.",
    );
  return issues;
}
