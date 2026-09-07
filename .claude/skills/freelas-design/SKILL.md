---
name: freelas-design
description: Guia de design do Freelas — paleta de cores, tokens de tema (claro/escuro) e de papel (freelancer/contratante), tipografia e padrões de componentes. Use ao criar ou redesenhar qualquer tela, componente ou mockup da plataforma para manter consistência visual.
---

# Freelas — Design System

Este skill descreve o sistema visual **já implementado** em `src/index.css` e usado em
todas as páginas de freelancer e contratante. Ele existe para que qualquer novo
componente, tela ou mockup (inclusive protótipos `.jsx` soltos, artifacts ou imagens)
siga a mesma linguagem visual em vez de inventar cores/estilos novos.

Sempre que for desenhar algo novo para o Freelas:
1. Releia `src/index.css` (fonte da verdade) antes de propor cores literais.
2. Use **variáveis CSS** (`var(--primary)`, `var(--surface-color)`, etc.), nunca hex
   fixos, exceto para os poucos tons "fixos" documentados abaixo (verde de preço,
   dourado de avaliação).
3. Teste mentalmente (ou visualmente) as **4 combinações** de tema × papel:
   claro+freelancer, claro+contratante, escuro+freelancer, escuro+contratante.

## Como o tema funciona

Dois atributos independentes no `<html>` (ou no elemento raiz do protótipo)
controlam a aparência via seletores de atributo em CSS:

- `data-theme="light" | "dark"` — controlado por `ContextoTema.jsx` (`useTheme`).
- `data-role="freelancer" | "contractor"` — controlado por `ContextoPapel.jsx`
  (`useRole`). `freelancer` é o padrão (sem atributo); `contractor` sobrescreve
  as variáveis de acento.

As variáveis de cor mudam de valor conforme esses atributos, então o **mesmo
markup e as mesmas classes** já se adaptam automaticamente — nunca condicione
cor no JS (`role === 'contractor' ? '#7C3AED' : '#FF826E'`); condicione no CSS
via `[data-role='contractor']`.

## Paleta — modo claro (padrão)

| Token | Valor | Uso |
|---|---|---|
| `--bg-color` | `#F8FAFC` | fundo da página |
| `--surface-color` | `#FFFFFF` | cards, navbar, dropdowns |
| `--text-color` | `#0F172A` | texto principal |
| `--text-secondary` | `#475569` | texto auxiliar/legendas |
| `--border-color` | `#E2E8F0` | bordas e divisores |
| `--shadow-color` | `rgba(15,23,42,0.05)` | sombras suaves |

## Paleta — modo escuro (`[data-theme='dark']`)

| Token | Valor | Uso |
|---|---|---|
| `--bg-color` | `#0F172A` | fundo da página |
| `--surface-color` | `#1E293B` | cards, navbar, dropdowns |
| `--text-color` | `#F8FAFC` | texto principal |
| `--text-secondary` | `#94A3B8` | texto auxiliar |
| `--border-color` | `#334155` | bordas e divisores |
| `--shadow-color` | `rgba(0,0,0,0.3)` | sombras (mais fortes que no claro) |

## Acento por papel (o que muda entre Freelancer e Contratante)

O acento (`--primary`/`--accent`/`--secondary`) é a única coisa que troca com o
papel — todo o resto do tema (fundo, superfície, texto) é compartilhado.

**Freelancer (padrão, tom salmão/coral):**
- `--primary: #FF826E` · `--primary-hover: #FF6B54`
- `--secondary: #FFF1EE` (fundo suave de badges/chips)
- `--accent: #8CD6FF`
- `--role-contrast: #43160F` (texto sobre `--primary` no claro) / `#23110E` (escuro)
- `--primary-gradient`: diagonal salmão → lilás → azul, usado em `.btn`, avatares e
  botão de tema/papel.

**Contratante (`[data-role='contractor']`, tom roxo):**
- `--primary: #7C3AED` · `--primary-hover: #6D28D9`
- `--secondary: #F5F3FF`
- `--accent: #6EE7B7`
- `--role-contrast: #FFFFFF` (claro e escuro)
- `--primary-gradient`: diagonal roxo → azul → verde-água.

Use essa troca de matiz como o principal "indicativo de papel" em qualquer nova UI
(borda, ícone ativo, badge do papel atual) — não invente uma segunda cor de marca.

## Estados semânticos (iguais nos dois papéis, variam só com o tema)

| Estado | Claro | Escuro |
|---|---|---|
| Sucesso | `--success-color #18794E` / `--success-soft` | `#69D49B` / soft |
| Aviso | `--warning-color #8A6100` / `--warning-soft` | `#F0C35A` / soft |
| Perigo | `--danger-color #C7384A` / `--danger-soft` | `#FF8792` / soft |
| Pendente/neutro | `--pending-accent #52677F` | `#9FB3C8` |

Sempre usar o par cor+`-soft` (ex.: `--danger-color` no texto/ícone,
`--danger-soft` no fundo do chip) em vez de opacidade improvisada.

## Tipografia

- Títulos (`h1–h6`): **Poppins**, peso 700, `letter-spacing: -0.5px`.
- Corpo/UI: **Outfit**, peso 400–600.
- Marca "FREELAS" na navbar: Poppins 800, uppercase, `letter-spacing: -1px`,
  preenchida com `var(--primary-gradient-hover)` via `background-clip: text`.

## Padrões de componente a reaproveitar

- **Botão primário** (`.btn`): `border-radius: 8px`, fundo `--primary-gradient`,
  texto branco, sombra `0 4px 6px -1px var(--shadow-color)`, hover levanta
  (`translateY(-2px)`) e troca para `--primary-gradient-hover`.
- **Botão secundário** (`.btn-secondary`): fundo transparente, borda
  `--border-color`, texto `--text-color`.
- **Card** (`.card`): `--surface-color`, borda 1px `--border-color`,
  `border-radius: 12px`, sombra offset "hard shadow" no claro
  (`2px 2px 0 var(--shadow-color)`) e sombra difusa no escuro.
- **Badge/chip** (`.badge`): fundo `--secondary`, texto `--primary`,
  `border-radius: 6px`; variação "pill" com `border-radius: 999px` para tags de
  papel/status (ex.: `.chat-papel-tag`, `.chat-status-chip`).
- **Ícone em círculo colorido** (padrão "summary icon" de Meus Freelas): círculo
  38–56px, fundo `--secondary` (ou `-soft` do estado), ícone `--primary` (ou cor
  do estado). Reaproveitar esse padrão em qualquer novo menu com itens
  ilustrados por ícone.
- **Dropdown/menu flutuante**: `--surface-color`, borda 1px `--border-color`,
  `border-radius: 8–14px`, sombra `0 8–24px var(--shadow-color)`, entrada com
  `fadeInDown 0.16–0.25s ease`.
- **Notificação/badge numérico**: círculo/pílula vermelho `#ff4757` fixo (não
  segue o tema — é sempre "alerta"), borda `2px solid var(--surface-color)`
  para destacar do fundo; pulso único (`notifPulse`) quando surge algo novo.
- **Switch/alternância de papel**: trilho com `--primary-gradient`, thumb
  circular `--surface-color`, texto do rótulo oculto/visível por
  opacidade+translação (~114px de curso), transição `cubic-bezier(0.68,-0.55,0.27,1.55)`.
- **Ícones**: biblioteca `lucide-react`, stroke padrão, tamanho 20–24px na navbar.
- **Motion**: transições de 0.15–0.4s `ease`/`cubic-bezier`; nada abrupto; respeitar
  `prefers-reduced-motion`.

## Ao propor um redesign (ex.: navbar, dropdowns, novos painéis)

- Pode mudar **layout, agrupamento e hierarquia visual** livremente — isso é o que
  normalmente se pede num "redesign".
- Não pode mudar **os valores de cor por trás dos tokens** nem introduzir uma
  paleta paralela; a identidade "salmão = freelancer / roxo = contratante" e
  "claro/escuro" definidos acima devem continuar reconhecíveis.
- Prefira compor com classes/tokens já existentes (`.card`, `.badge`, `--secondary`,
  ícones em círculo) a criar um vocabulário visual do zero, para o redesign parecer
  "a próxima versão" da tela atual, não uma plataforma diferente.
- Documente no próprio arquivo/mockup quais variáveis foram usadas, para facilitar
  a integração posterior no `index.css` real.
