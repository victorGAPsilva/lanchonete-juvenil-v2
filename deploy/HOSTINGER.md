# Hostinger VPS — v1.1.0-rc.1

Roteiro para um **VPS Linux com Docker Engine e Docker Compose**, mantendo SQLite, fotos e backups em volumes persistentes. O site ainda não foi publicado na Hostinger.

A Hostinger também oferece Node.js em planos Business e Cloud. Este roteiro usa VPS para manter SQLite e a arquitetura Docker atual; a documentação da Hostinger indica VPS como alternativa para SQLite. Enviar somente `public/` a uma hospedagem estática não atende o painel e a revisão dos pedidos.

## Requisitos

- VPS com Docker/Compose e acesso SSH.
- Domínio com registro DNS A apontando ao IP do VPS. Só configure AAAA se o IPv6 estiver funcionando.
- Portas TCP 80 e 443 disponíveis para Caddy e certificados, além do acesso SSH necessário à administração. Não instale outro proxy nas mesmas portas.
- Dados reais: produtos, fotos, preços, endereço, bairros e pagamentos. A loja pode ficar fechada durante a configuração.

Nenhum serviço foi contratado ou configurado automaticamente. `seu-dominio.example` é apenas um marcador, não um domínio para publicar.

## Instalar

No SSH do VPS:

```bash
git clone --branch v1.1.0-rc.1 --depth 1 https://github.com/victorGAPsilva/lanchonete-juvenil-v2.git
cd lanchonete-juvenil-v2
cp .env.production.example .env.production
```

Edite `.env.production`. Defina `DOMAIN` com o domínio real, sem protocolo nem barra final; ajuste `PUBLIC_ORIGIN` para a mesma origem com HTTPS. O Compose deriva a origem a partir de `DOMAIN`. Os caminhos `/app/data`, `/app/uploads` e `/app/backups` pertencem ao contêiner, não são pastas para criar no Windows. `.env.production` fica fora do Git e não contém senha padrão.

```bash
docker compose --env-file .env.production -f compose.production.yaml config --quiet
docker compose --env-file .env.production -f compose.production.yaml build --pull
docker compose --env-file .env.production -f compose.production.yaml up -d
docker compose --env-file .env.production -f compose.production.yaml ps
```

Caddy aguarda a saúde da aplicação, solicita/renova certificados e redireciona HTTP para HTTPS. Isso depende de DNS e portas corretos e pode levar alguns instantes. A porta Node 3000 fica interna. O nome do projeto está fixado para preservar a identificação dos volumes. **Não use `down -v`**, que apaga os volumes.

## Configurar a loja

```bash
docker compose --env-file .env.production -f compose.production.yaml exec juvenil node scripts/create-admin.js
docker compose --env-file .env.production -f compose.production.yaml exec juvenil node scripts/preflight.js
```

Entre em `https://SEU-DOMINIO/admin` e configure os dados reais. O banco novo começa fechado e vazio, com as três categorias iniciais. A conta local não aparece automaticamente no VPS. Se quiser aproveitar cadastros locais, migre por backup antes de abrir; não copie o arquivo SQLite enquanto estiver em uso.

```bash
docker compose --env-file .env.production -f compose.production.yaml exec juvenil node scripts/preflight.js --live
curl --fail https://SEU-DOMINIO/api/health
```

O preflight comercial retorna erro enquanto faltarem administrador, produto real disponível, pagamento, endereço para retirada ou bairros para entrega, conforme os modos habilitados. Também identifica exemplos ativos. Taxa a combinar é permitida, com total parcial. O modo fechado não é um erro: a loja pode aguardar a conferência do responsável.

Os exemplos continuam no projeto local e não são inseridos automaticamente em produção. O servidor de produção recusa pedidos com itens marcados como fictícios. Substitua/desative os exemplos pelo painel; não basta retirar a marcação sem cadastrar conteúdo e preço reais.

Confira busca, carrossel, adicionais, entrega/retirada e totais no celular e computador. Copie o texto de um pedido e confira WhatsApp, endereço, valores e pagamento com o responsável. Não envie um teste como venda real. `/api/health` comprova saúde do processo/banco e mostra a versão, mas não valida os dados comerciais.

## Backup

```bash
docker compose --env-file .env.production -f compose.production.yaml exec -T juvenil node scripts/backup.js
docker compose --env-file .env.production -f compose.production.yaml cp juvenil:/app/backups ./backups
```

Copie a pasta exportada para armazenamento protegido fora do VPS: o volume no mesmo servidor não protege contra perda do servidor inteiro. O backup contém banco, contas/sessões e imagens; guarde `.env.production` separadamente. Faça backup regularmente e antes de atualizar.

Para restaurar, pare a aplicação e preserve o estado atual. Substitua banco e imagens dentro dos volumes do mesmo projeto, com o aplicativo parado. Revogue as sessões restauradas antes de reabrir; o README contém o comando e os cuidados com WAL/SHM.

## Atualizar

Faça backup, busque as tags e selecione a nova versão aprovada:

```bash
git fetch --tags origin
# git checkout NOVA_TAG_APROVADA
docker compose --env-file .env.production -f compose.production.yaml build --pull
docker compose --env-file .env.production -f compose.production.yaml pull caddy
docker compose --env-file .env.production -f compose.production.yaml up -d
```

`--pull` renova a base Node.js 24 com correções disponíveis. Volumes não são apagados na atualização. Para voltar, selecione a tag anterior e reconstrua; se uma versão futura mudar o esquema, confira a compatibilidade e o backup antes do retorno.

## Diagnóstico

```bash
docker compose --env-file .env.production -f compose.production.yaml logs --tail 100 juvenil caddy
docker compose --env-file .env.production -f compose.production.yaml ps
```

- Certificado pendente: confira DNS, AAAA e portas 80/443.
- Origem não autorizada: acesse exatamente o domínio de `DOMAIN`. Domínio com `www` e sem `www` são origens diferentes.
- Login não persiste: confira HTTPS. O Compose já usa cookies seguros.
- Banco parece vazio: confira Compose e volumes corretos; não apague volumes para tentar corrigir.

`TRUST_PROXY_HOPS=1` pressupõe o único proxy Caddy deste Compose. Não exponha Node diretamente nem acrescente outro proxy/CDN sem revisar essa configuração. O limite de login considera o IP do proxy confiável; os contadores ficam em memória e reiniciam com o processo.

## Fontes oficiais

- [Bancos e SQLite na Hostinger](https://www.hostinger.com/support/1583226-which-database-management-system-is-used-at-hostinger/)
- [Opções Node.js na Hostinger](https://www.hostinger.com/support/node-js-hosting-options-at-hostinger/)
- [HTTPS automático do Caddy](https://caddyserver.com/docs/automatic-https)

As opções comerciais podem mudar. O roteiro depende de um VPS capaz de executar Compose e manter volumes; não depende de preço ou nome de pacote específico.
