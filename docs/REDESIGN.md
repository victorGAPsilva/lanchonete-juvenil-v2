# Redesenho do cardápio

Implementado e verificado em 04/11/2026, a partir da referência visual fornecida pelo usuário.

## Apresentação

- Abertura com título condensado, fundo amarelo, chamada para o cardápio e carrossel de produtos.
- Identidade Juvenil preservada na logo original e no laranja das ações de pedido; verde, vermelho e creme complementam a composição.
- Faixas quadriculadas, preços em selos e cardápio em linhas com fotos.
- Busca, categorias com estado acessível e contagem de resultados.
- Seção de instruções de pedido e rodapé redesenhados.
- Diálogos e sacola com o mesmo tratamento visual da loja.
- Fontes Anton e DM Sans servidas localmente; nenhuma dependência nova ou exceção à CSP.
- Apresentação alternativa quando não há fotos/produtos. Exemplos e preços fictícios continuam identificados.

O CSS do redesenho está em `public/storefront.css`, carregado apenas pelo cardápio. O painel mantém o estilo anterior. Backend, configuração comercial e fluxo de confirmação pelo WhatsApp permanecem existentes.

## Verificação

- Sintaxe aprovada nos 20 módulos JavaScript.
- `npm test`: 13 testes aprovados, sem falhas.
- `git diff --check`: aprovado.
- Estrutura HTML validada com `HTMLParser`: tags balanceadas, IDs únicos e referências estáticas preservadas.
- Conferência no navegador com larguras de 320, 390, 768, 960, 1280 e 1440 px; sem overflow horizontal da página nas medições. Categorias usam rolagem interna em telas estreitas.
- Busca sem resultados, filtro por categoria, retorno a todos os produtos, indicadores/pausa do carrossel e navegação por âncoras conferidos.
- Personalização: 2 croissants a R$ 12,00 com queijo extra de R$ 2,50 por unidade; botão e revisão totalizaram R$ 29,00, retirada e Pix de demonstração.
- Modal móvel sem overflow horizontal, com rolagem vertical para revisar o pedido.
- Estado sem produtos e login administrativo conferidos em instância temporária separada.
- Nenhum erro de console observado nas páginas de cardápio verificadas.

O fluxo completo foi testado em sessão de navegador separada na porta 3002, usando a base de demonstração. Os itens de teste foram removidos ao final. A sacola preexistente na porta 3001 foi preservada. O estado vazio foi conferido em base temporária na porta 3003. Não houve envio de mensagem ou pedido ao WhatsApp nem publicação externa.

## Capturas

- `screenshots/redesign-desktop.jpg`: abertura no desktop compacto.
- `screenshots/redesign-desktop-menu.jpg`: cardápio no desktop compacto.
- `screenshots/redesign-mobile-menu.jpg`: cardápio a 390 px.
- `screenshots/redesign-mobile-review.jpg`: revisão móvel do pedido de demonstração.
- `screenshots/redesign-how-to-order.jpg`: instruções e rodapé.

São capturas do navegador no Windows, não de dispositivos físicos. Para reproduzir a prévia local, execute `npm run demo` e abra `http://localhost:3001`.
