# buscARPE — Requisitos, Épicos e Histórias de Usuário

## Histórico de Versões

| Versão | Data | Descrição |
|---|---|---|
| 0.1.0 | 2026-09-25 | Definição inicial dos atores e mapa de épicos (MVP e pós-MVP) |
| 0.2.0 | 2026-09-25 | Refinamento do EP-01: HU-01 e HU-02 com critérios de aceite |
| 0.3.0 | 2026-09-25 | Decisões D-01 e D-02 resolvidas; CA-05 adicionado à HU-01; CA-05 da HU-02 atualizado com fallback confirmado |

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

### Decisões pendentes do EP-01

| # | Decisão | Estado |
|---|---|---|
| D-01 | Diferenciação visual de marcadores: bens **Inoperantes** exibidos com opacidade reduzida | 🟢 Confirmado |
| D-02 | Cor de fallback para clusters mistos (SAA + SES): cor intermediária entre azul e verde-azulado | 🟢 Confirmado |

---

### HU-01 — Visualizar os bens no mapa

**Como** Usuário Comum,
**quero** ver todos os bens reversíveis distribuídos no mapa ao acessar o sistema,
**para** ter uma visão espacial imediata de todo o patrimônio de saneamento de Pernambuco.

**Estado:** 🟡 Em refinamento

#### Critérios de Aceite

**CA-01 — Bens plotados ao carregar o mapa**
> Dado que existem bens cadastrados no sistema,
> quando o usuário acessa o buscARPE,
> então todos os bens pai devem estar representados no mapa, posicionados nas suas coordenadas geográficas.

**CA-02 — Enquadramento inicial de Pernambuco**
> Dado que o usuário acessa o sistema,
> quando o mapa é exibido pela primeira vez,
> então a visualização inicial deve enquadrar o estado de Pernambuco de modo que o conjunto de bens seja perceptível.

**CA-03 — Bens filhos não aparecem como marcadores independentes**
> Dado que bens filhos (equipamentos) não possuem coordenadas próprias,
> quando o mapa é exibido,
> então nenhum bem filho deve ser plotado como marcador independente no mapa.

**CA-04 — Diferenciação visual por tipo de sistema**
> Dado que o mapa exibe bens de sistemas diferentes,
> quando os marcadores individuais são exibidos,
> então bens do SAA devem aparecer em **azul** e bens do SES em **verde-azulado**, permitindo identificação visual imediata do tipo de sistema.

**CA-05 — Opacidade reduzida para bens Inoperantes**
> Dado que um bem pai possui situação **Inoperante**,
> quando o marcador é exibido no mapa,
> então deve aparecer com opacidade visivelmente reduzida em relação aos bens Operando, indicando seu estado sem removê-lo da visualização.

#### Observações

- A definição do valor exato de opacidade é decisão de implementação/design visual.

---

### HU-02 — Navegar pelo mapa com clustering

**Como** Usuário Comum,
**quero** que bens próximos sejam agrupados automaticamente conforme o nível de zoom,
**para** que o mapa permaneça legível independente de quantos bens existam na região visualizada.

**Estado:** 🟡 Em refinamento

#### Critérios de Aceite

**CA-01 — Bens agrupados em zoom distante**
> Dado que há múltiplos bens próximos no mapa,
> quando o zoom está afastado,
> então esses bens devem aparecer agrupados com um indicador numérico da quantidade.

**CA-02 — Desmembramento ao aproximar o zoom**
> Dado que um cluster está visível,
> quando o usuário aumenta o zoom sobre ele,
> então o cluster deve se desmembrar gradualmente, revelando os bens individuais.

**CA-03 — Marcadores individuais em zoom próximo**
> Dado que os bens estão suficientemente distantes entre si,
> quando o zoom está próximo,
> então cada bem deve ser exibido como um marcador individual.

**CA-04 — Cor de cluster homogêneo**
> Dado que um cluster agrupa bens de um único tipo de sistema,
> quando o cluster é exibido,
> então deve ter a cor correspondente ao sistema: **azul** para SAA e **verde-azulado** para SES.

**CA-05 — Cor de cluster misto (SAA + SES)**
> Dado que um cluster agrupa bens de SAA e SES,
> quando o cluster é exibido,
> então o marcador do cluster deve apresentar as duas cores (metade azul / metade verde-azulado), refletindo a composição mista.
>
> ⚠️ **Implicação técnica:** marcadores bipartidos dependem do suporte da biblioteca de mapas utilizada. Caso tecnicamente inviável, aplicar **cor intermediária entre azul e verde-azulado** como fallback (D-02 🟢 Confirmado).

#### Observações

- Clusters mistos com cor dividida são a preferência declarada. A viabilidade será confirmada na escolha da biblioteca de mapas.

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
