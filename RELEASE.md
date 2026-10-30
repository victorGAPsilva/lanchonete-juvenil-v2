# v1.1.0-rc.1 — pré-hospedagem

Versão candidata para publicação em VPS da Hostinger. Mantém cardápio, logo, carrossel, carrinho, WhatsApp e painel.

- Compose de produção com Caddy/HTTPS e volumes de banco, imagens e backups; Node sem porta pública.
- Cookies Secure obrigatórios, validação de origem HTTPS e configuração explícita do proxy.
- Health check HTTP, encerramento com espera por requisições e diretório de backup gravável no contêiner.
- Verificação técnica/comercial, sem apagar cadastros, e bloqueio de pedidos com produtos fictícios em produção.
- Testes de produção e leitura dos dados de um backup restaurado.
- Automação no GitHub para validar Node, Compose, imagem Docker, saúde e backup em Linux.

`npm run check` passou: sintaxe de 20 módulos, **13 testes**, auditoria sem vulnerabilidades e preflight técnico. A verificação comercial apontou produtos de exemplo ativos e falta de bairros para a entrega habilitada. Os cadastros foram preservados para configuração pelo responsável.

Docker não está instalado neste Windows. Os testes locais executaram produção em processo Node separado, com cookies seguros, recusa de exemplos e verificação de banco/imagens do backup. A execução do contêiner/Caddy está prevista na automação de Linux e precisa ser confirmada no VPS. Nenhum domínio, certificado ou hospedagem foi configurado externamente.

Antes de abrir: definir VPS/domínio, seguir `deploy/HOSTINGER.md`, criar/migrar administrador e dados reais, substituir/desativar exemplos e passar o preflight comercial. Aprovação técnica não representa publicação concluída nem aprovação dos dados comerciais.
