# Verificação da entrega

Executada em 30/10/2026, no projeto local, com Node.js 24.14.0.

## Automação

`npm test`: **10 testes passaram**, sem falhas. Os testes de integração criam um banco e uploads temporários, removidos ao final. Confirmados:

- Valores em centavos, preço promocional, adicionais e quantidades.
- Personalizações diferentes preservadas como linhas separadas.
- Limites de seleção, opções duplicadas/inexistentes e grupos removidos.
- Bloqueio de produto esgotado/desativado, categoria desativada e quantidade inválida.
- Entrega fixa, por bairro e pendente; bairro fora da área recusado.
- Retirada, pagamento, troco e fechamento.
- Horário America/Sao_Paulo, madrugada e pausa excepcional.
- Mensagem do WhatsApp com texto codificado idêntico ao texto revisado e totais calculados no servidor.
- Senhas scrypt com salt independente.
- Rotas administrativas protegidas, login/logout, cookie HttpOnly, bloqueio de origem diferente, upload inválido recusado e imagem raster convertida para WebP.
- Edição pela API administrativa visível na API pública.
- Após fechar o banco, um processo Node novo leu os mesmos produtos e configuração persistidos.

`npm audit`: **zero vulnerabilidades** na verificação final. Sintaxe dos scripts do cliente e servidor validada com `node --check`.

`npm run backup`: executado com sucesso; arquivo SQLite e pasta de imagens copiados para backup datado.

## Navegador

Testes executados em banco de demonstração isolado na porta 3001. Produção na porta 3000 permaneceu fechada, sem produtos ou dados comerciais inventados.

Desktop, viewport 1280 × 720:

1. Login pelo formulário do painel.
2. Alteração do preço promocional de um produto e conferência no cardápio público.
3. Inclusão de duas unidades com adicional e observação; após atualizar a página, a sacola foi preservada.
4. Entrega por bairro, pagamento em dinheiro e troco. Revisão mostrou subtotal R$ 31,00 + entrega R$ 5,00 = R$ 36,00; troco para R$ 50,00.
5. Alteração de preço no painel em outra aba após a revisão. Ao solicitar a cópia, o sistema exigiu nova revisão e atualizou subtotal para R$ 32,00 e total para R$ 37,00.
6. Segunda cópia confirmada pela leitura da área de transferência: texto atualizado, adicional, quantidade, observação, endereço, taxa, total e troco corresponderam à revisão.
7. Produto esgotado visível com botão desabilitado.

Layout móvel, viewport de documento 390 × 844:

- Cardápio e painel renderizados em quadros `srcdoc` temporários de 390 px, com o HTML real e os mesmos scripts, CSS e APIs. Usou-se esse método porque o controle de viewport do navegador não alterou a largura efetiva da aba. O quadro temporário foi removido da entrega.
- Sacola aberta e formulário de retirada preenchido com pagamento Pix de demonstração.
- Revisão de retirada confirmou R$ 32,00, taxa zero de retirada e total R$ 32,00.
- Aviso de confirmação pelo WhatsApp e botões ficaram legíveis na largura móvel, com rolagem vertical no modal.
- Configuração de prazo alterada e salva pelo painel móvel; a alteração apareceu no cardápio desktop.

Evidências em `docs/screenshots/`: `desktop-demo.jpg`, `mobile-review.jpg` e `production-initial.jpg`. As capturas de demonstração têm dados fictícios explicitamente identificados.

## Limites verificados e pendências comerciais

- Não houve envio de mensagem nem pedido fictício à lanchonete. O link e a codificação foram verificados automaticamente; a cópia foi verificada no navegador. A abertura do aplicativo externo do WhatsApp e a confirmação humana da lanchonete não foram simuladas como sucesso.
- Não foi usado celular físico, Safari/iOS ou Android real. A conferência móvel foi de layout e interação no navegador em documento de 390 px.
- Docker, proxy HTTPS e publicação em domínio externo estão documentados, mas não foram executados neste ambiente. A aplicação foi entregue localmente.
- A logo foi fornecida após a entrega inicial e integrada em `public/assets/logo-juvenil.jpg`, sem redesenho nem alteração do arquivo. O tom predominante do JPEG é `#fc6202`. Cardápio, painel e favicon usam o arquivo original por padrão; imagens personalizadas continuam configuráveis. As capturas da entrega inicial registram a marca provisória; `docs/screenshots/logo-integrated.jpg` mostra a atualização.
- O responsável ainda precisa criar o administrador de produção e informar produtos, preços, endereço, bairros, taxas, pagamentos e horários antes de abrir a loja.

## Integração da logo fornecida

- Arquivo original copiado sem transformação; SHA-256 da cópia confere com o anexo.
- Cor predominante medida nos pixels laranja do JPEG: RGB (252, 98, 2), `#fc6202`.
- Contraste de texto nos botões laranja: 5,74:1; texto laranja escuro em branco: 5,61:1.
- Logo carregada no cardápio e no login administrativo, conferidos no navegador. Captura da atualização em viewport de 319 px em `docs/screenshots/logo-integrated.jpg`.
- Sintaxe dos módulos alterados e `git diff --check` verificados.

## Produtos fictícios e carrossel

- Três produtos de exemplo cadastrados no banco local por solicitação do responsável: croissant de presunto e queijo, suco de laranja e hambúrguer clássico. Os exemplos usam identificação explícita no cardápio e no carrossel, preços fictícios e imagens geradas por IA, documentadas em `docs/PRODUCT-IMAGES.md`.
- Imagens WebP locais de 900 px: aproximadamente 53 KB, 37 KB e 54 KB. Nenhuma imagem depende de URL externa.
- `npm test`: 10 testes passaram. A integração foi ampliada para verificar que o cadastro dos exemplos não altera configurações existentes, não duplica registros e preserva edições e desativações do administrador. A API administrativa aceita as imagens locais dos exemplos e persiste a identificação de demonstração.
- Navegador: carrossel conferido em 319 px e 1280 × 900. Avanço automático observado; anterior/próximo, seleção por indicadores e seta direita do teclado verificados. O botão Ver produto abriu a personalização do hambúrguer correto. Todas as imagens carregaram e apenas um slide ficou visível por vez.
- Pausa verificada: após mais de cinco segundos, o slide continuou na posição 2/3 com o controle Reproduzir disponível. O layout móvel não teve rolagem horizontal (largura útil 304 px, largura de conteúdo 304 px).
- Capturas: `docs/screenshots/carousel-mobile.jpg` e `docs/screenshots/carousel-desktop.jpg`.
- O servidor local foi reiniciado para carregar as validações atualizadas; contas e configurações existentes foram mantidas.

## Pré-hospedagem v1.1.0-rc.1

- `npm run check` aprovado: sintaxe de 20 módulos, 13 testes, auditoria sem vulnerabilidades e preflight técnico.
- Novos testes verificam exigência de HTTPS/cookie Secure, limites da confiança no proxy, diagnóstico de dados comerciais, endpoint de saúde, bloqueio de produtos fictícios em produção e leitura do banco/imagens a partir de backup.
- Configurações e produtos locais foram preservados. O preflight indicou exemplos ativos e falta de bairros para a entrega habilitada.
- Preparados Compose de produção, proxy Caddy, volumes persistentes e instruções específicas para Hostinger VPS. O contêiner usa usuário não privilegiado e tem diretório de backup gravável.
- Docker não está instalado neste computador; execução do contêiner, validação nativa do Compose e validação do Caddy foram incluídas na automação de Linux. A configuração de DNS/HTTPS e a publicação real dependem do VPS/domínio, ainda não fornecidos.
