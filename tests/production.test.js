import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { readRuntime } from "../lib/runtime.js";
import { launchIssues } from "../lib/readiness.js";

test("produção exige domínio HTTPS, cookie seguro e configuração de proxy restrita", () => {
  const env = {
    NODE_ENV: "production",
    PUBLIC_ORIGIN: "https://juvenil.example",
  };
  assert.throws(() => readRuntime({ NODE_ENV: "production" }), /PUBLIC_ORIGIN/);
  for (const PUBLIC_ORIGIN of [
    "http://juvenil.example",
    "https://juvenil.example/admin",
    "https://user:pass@juvenil.example",
    "invalid",
  ])
    assert.throws(() => readRuntime({ ...env, PUBLIC_ORIGIN }));
  assert.throws(
    () => readRuntime({ ...env, COOKIE_SECURE: "false" }),
    /seguros/,
  );
  assert.throws(
    () => readRuntime({ ...env, TRUST_PROXY_HOPS: "true" }),
    /TRUST_PROXY/,
  );
  assert.throws(() => readRuntime({ ...env, PORT: "-1" }), /PORT/);
  assert.throws(
    () => readRuntime({ ...env, DATA_DIR: "uploads/private" }),
    /Separe/,
  );
  const actual = readRuntime({
    ...env,
    PUBLIC_ORIGIN: "https://juvenil.example/",
    TRUST_PROXY_HOPS: "1",
  });
  assert.equal(actual.origin, "https://juvenil.example");
  assert.equal(actual.cookieSecure, true);
  assert.equal(actual.proxyHops, 1);
});

test("verificação comercial identifica exemplos e dados pendentes sem alterar cadastros", () => {
  const categories = [{ id: "c", active: true }];
  const config = {
    payments: [{ id: "pix" }],
    pickup: true,
    delivery: false,
    address: "Endereço real de teste",
    neighborhoods: [],
    mode: "closed",
    hours: [],
  };
  const products = [
    {
      id: "p",
      active: true,
      soldOut: false,
      categoryId: "c",
      demo: false,
      image: "",
    },
  ];
  const context = { config, products, categories, adminCount: 1 };
  const before = JSON.stringify(context);
  assert.deepEqual(launchIssues(context), []);
  assert.equal(JSON.stringify(context), before);
  assert.match(
    launchIssues({
      ...context,
      products: [{ ...products[0], demo: true }],
    }).join(" "),
    /demonstração/,
  );
  assert.match(
    launchIssues({
      ...context,
      config: { ...config, payments: [], address: "" },
      adminCount: 0,
    }).join(" "),
    /administrador/,
  );
});

test("produção: saúde, cookie Secure, recusa de exemplos e restauração verificável do backup", () => {
  const dir = mkdtempSync(join(tmpdir(), "juvenil-production-"));
  const env = {
    ...process.env,
    NODE_ENV: "production",
    PUBLIC_ORIGIN: "https://juvenil.example",
    COOKIE_SECURE: "true",
    TRUST_PROXY_HOPS: "1",
    DATA_DIR: dir,
    UPLOAD_DIR: join(dir, "uploads"),
    BACKUP_DIR: join(dir, "backups"),
  };
  const source = `
    import assert from 'node:assert/strict';
    import {mkdirSync,writeFileSync,readFileSync,readdirSync} from 'node:fs';
    import {join} from 'node:path';
    import {DatabaseSync} from 'node:sqlite';
    import {spawnSync} from 'node:child_process';
    import {app} from './server.js';
    import {db,config,put} from './lib/db.js';
    import {hashPassword} from './lib/security.js';
    db.prepare('INSERT INTO admins(email,hash) VALUES (?,?)').run('qa@test.local',hashPassword('senha-apenas-para-teste'));
    const settings={...config(),mode:'open',delivery:false,address:'Endereço fictício para teste',payments:[{id:'pix',name:'Pix',cash:false}]};
    db.prepare('UPDATE config SET value=? WHERE id=1').run(JSON.stringify(settings));
    const p={id:'real',name:'Produto teste',description:'',categoryId:'category-0',price:1000,promoPrice:null,groups:[],active:true,soldOut:false,featured:false,order:0,image:'',demo:false};
    put('products','real',p); put('products','demo',{...p,id:'demo',demo:true});
    const server=app.listen(0,'127.0.0.1'); await new Promise(r=>server.once('listening',r));
    try {
      const base='http://127.0.0.1:'+server.address().port;
      const health=await fetch(base+'/api/health'); assert.equal(health.status,200);assert.equal((await health.json()).version,'1.1.0-rc.1');
      assert.match(health.headers.get('strict-transport-security'),/max-age/);
      const login=await fetch(base+'/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://juvenil.example'},body:JSON.stringify({email:'qa@test.local',password:'senha-apenas-para-teste'})});
      assert.equal(login.status,200);assert.match(login.headers.get('set-cookie'),/; Secure/);
      const customer={name:'Cliente teste',method:'pickup',payment:'pix'};
      const send=productId=>fetch(base+'/api/checkout',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://juvenil.example'},body:JSON.stringify({cart:[{productId,quantity:1,selections:{}}],customer})});
      assert.equal((await send('real')).status,200);
      const demo=await send('demo');assert.equal(demo.status,400);assert.match((await demo.json()).error,/fictícios/);
      mkdirSync(process.env.UPLOAD_DIR,{recursive:true});writeFileSync(join(process.env.UPLOAD_DIR,'backup-test.webp'),'fixture');
      const backup=spawnSync(process.execPath,['scripts/backup.js'],{env:process.env,encoding:'utf8'});assert.equal(backup.status,0,backup.stderr);
      const folder=join(process.env.BACKUP_DIR,readdirSync(process.env.BACKUP_DIR)[0]);
      const restored=new DatabaseSync(join(folder,'juvenil.sqlite'),{readOnly:true});
      assert.equal(restored.prepare('SELECT COUNT(*) AS total FROM products').get().total,2);restored.close();
      assert.equal(readFileSync(join(folder,'uploads','backup-test.webp'),'utf8'),'fixture');
      assert.equal(JSON.parse(readFileSync(join(folder,'backup.json'),'utf8')).version,1);
      console.log('Produção e backup verificados.');
    } finally {await new Promise(r=>server.close(r));db.close();}
  `;
  try {
    const result = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", source],
      { env, encoding: "utf8", timeout: 30000 },
    );
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    assert.match(result.stdout, /Produção e backup verificados/);
  } finally {
    assert.ok(dir.startsWith(join(tmpdir(), "juvenil-production-")));
    rmSync(dir, { recursive: true, force: true });
  }
});
