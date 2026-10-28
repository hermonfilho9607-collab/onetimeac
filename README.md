# Template HVAC

Gerador de sites para empresas de HVAC / ar-condicionado, baseado em um padrão extraído de sites de referência do nicho.

- `PADRAO.md` / `padrao.json` — o padrão (seções, visual, copy, SEO local)
- `template.html` — o layout do site
- `clientes/*.json` — dados de cada cliente
- `gerar.js` — gera o site

## Uso

```bash
node gerar.js clientes/nome-do-cliente.json
```

O site sai em `saida/nome-do-cliente/index.html`.
