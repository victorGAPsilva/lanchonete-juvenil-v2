# Lanchonete Juvenil

Cardápio, sacola persistente no navegador, revisão no servidor, WhatsApp e painel administrativo. Interface em português com foco em celular. Node.js 24, Express e SQLite: um único processo, sem serviço de banco adicional e com backup simples. JavaScript e CSS sem framework ou compilação no cliente. Imagens locais convertidas para WebP com Sharp.

O cardápio usa um visual retrô com títulos condensados, cores sólidas, faixas quadriculadas e produtos em linhas. A apresentação pública está em `public/storefront.css`, separado do estilo compartilhado com o painel. As fontes Anton e DM Sans são locais, com licenças em `public/assets/fonts/`. Veja a [verificação do redesenho](docs/REDESIGN.md) e as capturas em `docs/screenshots/redesign-*.jpg`.

**Pré-hospedagem: v1.1.0-rc.1.** Para Hostinger VPS, use [deploy/HOSTINGER.md](deploy/HOSTINGER.md) e `compose.production.yaml`. As notas e os limites da verificação estão em [RELEASE.md](RELEASE.md). O `compose.yaml` serve para teste local, não substitui a configuração de produção.

## Instalação

Requer Node.js 24 e npm. No diretório do projeto:

```powershell
npm ci
Copy-Item .env.example .env
npm run admin:create
npm start
```

Em Linux/macOS, use `cp .env.example .env`. A criação do administrador solicita e-mail e senha oculta de 12 a 200 caracteres. Não há senha padrão nem cadastro público. Use uma senha exclusiva. Acesse [cardápio](http://localhost:3000) e [painel](http://localhost:3000/admin).

O banco `data/juvenil.sqlite` é criado e migrado na primeira execução. Configuração, produtos, categorias, contas e sessões persistem em SQLite; somente a sacola fica em localStorage. As imagens ficam em `uploads/`. Esses diretórios e `.env` são ignorados pelo Git. Não apague os volumes ao atualizar.

## Configuração inicial

A produção começa **fechada**, sem produtos, pagamentos, endereço, bairros, taxas ou horários comerciais. Categorias iniciais: Croissants, Bebidas e Outros. O WhatsApp começa em 5511960217697 e é editável.

1. Entre no painel e cadastre os produtos nas categorias. Valores de formulário são em reais; banco e API usam centavos inteiros.
2. Em cada produto, configure disponibilidade, ordem, foto opcional, promoção e grupos. Mínimo maior que zero torna um grupo obrigatório; máximo limita a seleção. As opções são por unidade, com seleção única de cada opção. Para personalizações diferentes, adicione linhas separadas na sacola.
3. Em **Loja e funcionamento**, cadastre endereço, Instagram, prazos e horários. A logo fornecida está em `public/assets/logo-juvenil.jpg`, preservada sem alterações no desenho ou na proporção, e aparece por padrão no cardápio, painel e ícone da aba. O laranja predominante extraído da imagem é `--orange: #fc6202`, centralizado em `public/style.css`; `--orange-text` é uma variante escura para contraste em textos sobre branco. O painel permite enviar outra imagem ou voltar à logo original. O upload preserva a proporção.
4. Em **Entrega e pagamento**, habilite os modos, cadastre bairros atendidos e pagamentos. Sem bairro cadastrado, nenhuma entrega é aceita. Taxa pendente gera **total parcial**, nunca frete grátis implícito. Para retirada, o endereço precisa estar cadastrado.
5. Abra temporariamente ou selecione horários automáticos. O fuso é sempre America/Sao_Paulo. Fechamento anterior à abertura representa passagem da meia-noite. Pausa excepcional (ISO com fuso, ex. `2026-12-25T23:59:00-03:00`) tem prioridade. Abertura/fechamento temporários permanecem até alteração manual. Não há agendamento.

## Demonstração separada

Para adicionar os três produtos fictícios com imagens ao banco usado pelo site atual:

```text
npm run seed:examples
```

O comando cadastra croissant de presunto e queijo, suco de laranja e hambúrguer clássico, com preços de exemplo. Não altera a abertura da loja, contas, endereço, taxas ou pagamentos, e não sobrescreve produtos já cadastrados. Executá-lo novamente preserva edições e desativações feitas pelo administrador. Os produtos têm a identificação **Exemplo fictício**, descrição de demonstração e imagens ilustrativas geradas por IA. Pelo editor de produto, é possível desativá-los ou marcar/desmarcar **Produto fictício (demonstração)**; só retire essa identificação depois de substituir conteúdo, foto e preço pelos dados reais.

O carrossel no topo mostra produtos ativos com imagem, em categorias ativas, excluindo esgotados. Alterna a cada cinco segundos, possui anterior/próximo, indicadores, pausa, navegação por setas do teclado e gesto horizontal no celular. A reprodução pausa com o mouse sobre o carrossel, com foco de teclado dentro dele e ao ocultar a aba. Preferência por movimento reduzido inicia o carrossel pausado. O botão **Ver produto** abre a personalização do mesmo produto usado no cardápio. Sem imagens disponíveis, o carrossel fica oculto.

```text
npm run demo
```

Abre em http://localhost:3001, usando exclusivamente `data-demo/` e `uploads-demo/`. Todos os produtos, preços, endereço e prazos são explicitamente fictícios. O console informa um login de demonstração com senha aleatória nova a cada execução. O botão WhatsApp usa o número configurado no exemplo: teste apenas revisão e cópia; não envie pedidos fictícios à lanchonete. O banco da porta 3000 não é alterado por esse comando.

## Pedidos e privacidade

O cliente não cria conta. Antes da revisão e novamente antes de abrir/copiar o WhatsApp, o servidor recalcula preço, promoção, adicionais, entrega, troco e disponibilidade. Se o texto mudar desde a revisão, o cliente precisa revisar novamente. Produtos desativados, esgotados, opções inválidas e bairros fora da lista são recusados. O navegador nunca determina os totais finais.

A sacola permanece após abrir WhatsApp e após atualizar a página. Nome e endereço existem apenas na memória do formulário e na solicitação de cálculo, sem gravação no banco. O site não registra um pedido confirmado, não processa pagamentos e não envia a mensagem automaticamente. O cliente deve enviar e aguardar a confirmação. Há alternativa de cópia do texto. Ao abrir a conversa, os dados do pedido são enviados ao WhatsApp pelo link escolhido pelo cliente.

## Publicação com banco persistente

Esta aplicação usa um processo Node.js com SQLite em disco. Não pode ser publicada como arquivos estáticos nem no runtime Workers do Sites sem adaptação de banco, uploads e servidor. O projeto inclui Docker para um servidor com armazenamento persistente. **Não foi publicado externamente nesta entrega.**

Siga `deploy/HOSTINGER.md` para validar o domínio, iniciar o Compose de produção, criar o administrador e conferir o site antes de abrir a loja.

Os volumes preservam banco e fotos. Não use múltiplas réplicas nem discos efêmeros para este SQLite. As senhas usam scrypt com salt individual; sessões aleatórias têm hash no banco, expiram em oito horas e usam cookie HttpOnly/SameSite=Strict. Em produção, Secure é obrigatório e uma origem HTTPS deve estar configurada. O limite de login considera o IP do cliente quando há exatamente um proxy confiável (`TRUST_PROXY_HOPS=1`, como no Compose de produção); acesso direto usa `0`. Reiniciar limpa os contadores em memória. Para escala maior, use controle persistente no proxy.

Uploads exigem login, têm limite de 5 MB e 25 milhões de pixels, aceitam somente JPEG/PNG/WebP decodificados, removem metadados pela recodificação e recebem nomes aleatórios. A pasta de uploads é pública: use somente imagens destinadas ao cardápio. Imagens substituídas ficam no disco para não quebrar sacolas e caches antigos; remova arquivos sem uso somente após backup e conferência.

## Backup e restauração

```text
npm run backup
```

Gera `backups/<data>/juvenil.sqlite` com a API de backup consistente do SQLite e uma cópia de `uploads/`. Para correspondência exata entre banco e fotos, interrompa alterações no painel durante a cópia. Guarde o backup fora do servidor, protegido: inclui hashes e sessões administrativas. `.env` deve ser guardado separadamente, sem publicação.

Em Docker: `docker compose exec juvenil node scripts/backup.js`, depois `docker compose cp juvenil:/app/backups ./backups`. Faça cópias externas regularmente.

Para restaurar, pare o aplicativo, preserve uma cópia do estado atual e substitua o banco e a pasta de imagens pelo backup. Remova os arquivos auxiliares antigos `juvenil.sqlite-wal` e `juvenil.sqlite-shm` **somente com o aplicativo parado**. Em Docker, faça a substituição dentro dos volumes nomeados por um contêiner de manutenção. Antes de voltar ao ar, revogue as sessões restauradas executando no mesmo ambiente: `node --input-type=module -e "import {db} from './lib/db.js'; db.exec('DELETE FROM sessions'); db.close();"`. Inicie e confira cardápio e login.

## Verificação

```text
npm test
npm audit
npm run preflight
npm run preflight:live
```

`npm run check` agrupa sintaxe, testes, auditoria e preflight técnico. `preflight:live` exige ambiente de produção e dados comerciais prontos, e sai com erro enquanto houver pendências. O endpoint `/api/health` informa a saúde do processo/banco e a versão, sem expor cadastros.

Os testes usam diretório temporário isolado e verificam centavos, promoções, adicionais, limites, quantidade, disponibilidade, entrega fixa/por bairro/pendente, retirada, pagamento, troco, horários e madrugada em São Paulo, mensagem codificada do WhatsApp, hash, proteção de todas as rotas administrativas, login/logout, bloqueio de origem, uploads, atualização pública e leitura dos dados por novo processo após fechar o banco.

O roteiro manual é: executar demonstração, entrar no painel, editar produto, conferir cardápio, personalizar dois itens de formas diferentes, atualizar a página, revisar retirada e entrega, alterar o preço entre revisão e WhatsApp e verificar aviso, copiar a mensagem, esgotar produto e conferir bloqueio. Repetir com largura de celular e desktop. Não envie o pedido fictício ao WhatsApp. Resultados da verificação realizada estão em `VERIFICATION.md`.

## Estrutura

- `server.js`: HTTP, sessão, APIs e uploads.
- `lib/`: banco, validação, cálculos e segurança.
- `migrations/`: esquema inicial versionado, sem preços fictícios.
- `public/`: cardápio, sacola, painel e estilos responsivos.
- `scripts/`: administrador, demonstração e backup.
- `tests/`: testes de domínio e integração HTTP.

Não há serviços de terceiros, fontes remotas, analytics ou processamento financeiro. No Node.js 24, `node:sqlite` pode emitir aviso de recurso experimental; o banco é um arquivo SQLite padrão. Nenhuma informação comercial foi presumida.
