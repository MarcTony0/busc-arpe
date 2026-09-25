# buscARPE — Requisitos, Épicos e Histórias de Usuário

## Histórico de Versões

| Versão | Data | Descrição |
|---|---|---|
| 0.1.0 | 2026-09-25 | Definição inicial dos atores, mapa de épicos (MVP e pós-MVP) |

---

## Atores

| Ator | Descrição | Relevância |
|---|---|---|
| **Usuário Comum** | Acesso somente de visualização, pesquisa e filtragem dos bens e suas informações | ⭐ Foco do MVP |
| **Especialista Técnico** | Tudo do Usuário Comum + adição, edição e exclusão de bens e documentos | Pós-MVP |
| **Gestor** | Visão gerencial, gestão de usuários, permissões e histórico de alterações | 🔵 Decisão pendente |

---

## Mapa de Épicos

### MVP — Usuário Comum

| ID | Épico | Ator principal | Estado |
|---|---|---|---|
| EP-01 | Visualização Geográfica dos Bens | Usuário Comum | 🟡 Em discussão |
| EP-02 | Pesquisa e Filtragem de Bens | Usuário Comum | ⚪ Descoberta |
| EP-03 | Consulta de Detalhes do Bem | Usuário Comum | ⚪ Descoberta |

### Pós-MVP — identificados, não refinados

| ID | Épico | Ator principal | Estado |
|---|---|---|---|
| EP-04 | Gestão de Documentos | Especialista Técnico | ⚪ Descoberta |
| EP-05 | Gestão de Bens | Especialista Técnico | ⚪ Descoberta |
| EP-06 | Gestão da Aplicação | Gestor | 🔵 Decisão pendente |

> **Nota:** existe uma necessidade implícita de acesso controlado ao sistema (autenticação e perfis), já que existem atores com permissões diferentes. Não mapeado como épico ainda — pode ser pré-condição técnica ou história de valor. A ser discutido quando chegar a hora.

---

## EP-01 — Visualização Geográfica dos Bens

**Necessidade:** o usuário precisa de uma visão espacial dos bens reversíveis para entender a distribuição geográfica do patrimônio de saneamento de Pernambuco.

**Valor:** localização rápida e contextualizada dos bens sem depender de planilhas ou documentos fragmentados.

**Ator principal:** Usuário Comum

**Estado:** 🟡 Em discussão

### Histórias de Usuário

> _A ser preenchido durante o refinamento._

---

## EP-02 — Pesquisa e Filtragem de Bens

**Necessidade:** o universo de bens é grande e o usuário precisa chegar rapidamente a um subconjunto específico.

**Valor:** reduzir o tempo de localização de bens de uma região, sistema ou situação específica.

**Ator principal:** Usuário Comum

**Estado:** ⚪ Descoberta

### Histórias de Usuário

> _A ser preenchido durante o refinamento._

---

## EP-03 — Consulta de Detalhes do Bem

**Necessidade:** ao localizar um bem, o usuário precisa acessar suas informações completas — dados cadastrais, equipamentos vinculados e documentos.

**Valor:** centralizar em um só lugar informações hoje dispersas sobre o patrimônio.

**Ator principal:** Usuário Comum

**Estado:** ⚪ Descoberta

> **Escopo do MVP:** documentos são somente para visualização (leitura). Upload e gestão de documentos pertencem ao EP-04 (pós-MVP).

### Histórias de Usuário

> _A ser preenchido durante o refinamento._

---

## EP-04 — Gestão de Documentos

**Ator principal:** Especialista Técnico

**Estado:** ⚪ Descoberta

> _A ser refinado em iteração futura._

---

## EP-05 — Gestão de Bens

**Ator principal:** Especialista Técnico

**Estado:** ⚪ Descoberta

> _A ser refinado em iteração futura._

---

## EP-06 — Gestão da Aplicação

**Ator principal:** Gestor

**Estado:** 🔵 Decisão pendente

> _Existência e escopo ainda não definidos._
