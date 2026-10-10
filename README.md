# Acorde: loja de música com cadastro, estoque e assistente com Gemini

Produto funcional de uma **loja online de instrumentos e produtos de música**, com duas áreas separadas desde a tela de login:

- **Cliente**: cria a conta com endereço buscado pelo CEP e várias categorias de interesse, compra na loja (117 itens, do mais barato ao mais caro) e usa o **assistente de compras com o Gemini**, que compara preço e desempenho dos produtos da categoria dele.
- **Administrador**: gerencia clientes, consulta o estoque, cadastra novas mercadorias, registra entradas e vê relatórios de vendas por dia, itens mais vendidos e entradas e saídas de estoque, com uma **análise escrita pelo Gemini**.

O projeto tem duas partes:

- `app/`: interface feita com **React Native** e **Expo** (funciona no navegador e no celular).
- `backend/`: **API REST em Node.js** com banco **SQLite** próprio, regras de negócio, validações e a integração com o Gemini.

## 1. Como rodar

É necessário o **Node.js 22.13 ou mais novo** (`node -v`). Abra dois terminais.

**Terminal 1: API**

```bash
cd backend
npm start
```

Na primeira execução o banco é criado com o catálogo, os clientes de exemplo e 30 dias de histórico de vendas, para os relatórios já terem dados.

**Terminal 2: interface**

```bash
cd app
npm install
npm run web
```

Para usar no celular, rode `npm start` e leia o QR Code com o Expo Go (celular e computador na mesma rede Wi-Fi).

### Contas de demonstração

| Aba no login | E-mail | Senha |
| --- | --- | --- |
| Sou cliente | `cliente@acorde.com` | `acorde123` |
| Administrador | `admin@acorde.com` | `acorde123` |

A tela de login tem o botão **Usar a conta de demonstração**, que preenche a conta da aba escolhida. Uma conta de cliente não entra pela aba de administrador, e o contrário também é recusado.

Quem já usava a versão anterior não perde nada: ao iniciar, o backend atualiza o banco sozinho. A conta antiga `demo@acorde.com` vira administradora e os endereços e instrumentos dos clientes são convertidos para os novos campos.

### Ativando o Gemini

1. Crie uma chave em [Google AI Studio](https://aistudio.google.com/apikey).
2. Copie `backend/.env.example` para `backend/.env`.
3. Preencha `GEMINI_API_KEY=` com a chave e reinicie o backend.

O terminal mostra `Gemini: ativo (modelo gemini-flash-latest)`. Sem a chave, o assistente e a análise continuam funcionando em **modo local**, com regras calculadas pela própria API, e a tela avisa isso. O arquivo `.env` está no `.gitignore`, então a chave não vai para o GitHub.

## 2. Funcionalidades

### Área do cliente

| Tela | O que faz |
| --- | --- |
| Criar conta | dados pessoais, **endereço por CEP** (rua, número, complemento, bairro, cidade e UF em campos separados) e **várias categorias de interesse** |
| Início | saudação, interesses do cliente e atalhos para loja, carrinho, pedidos e cadastro |
| Loja | 117 produtos em 14 categorias, do mais barato ao mais caro; busca, filtro por categoria e ordenação |
| Assistente de compras | o cliente escolhe categorias (já vêm marcadas as dele), orçamento e o que procura; o Gemini devolve o **melhor preço**, o **melhor desempenho** e o **melhor custo-benefício**, com o motivo de cada escolha |
| Carrinho | quantidade por item, total e finalização do pedido |
| Meus pedidos | histórico com itens e valores |
| Meu cadastro | edição do endereço e dos interesses |

### Área do administrador

A loja não aparece para o administrador. O menu dele tem:

| Tela | O que faz |
| --- | --- |
| Início | faturamento, pedidos, itens com estoque baixo e unidades em estoque dos últimos 7 dias |
| Clientes | CRUD completo, com endereço por CEP e interesses |
| Estoque e mercadorias | todos os itens com quantidade, filtro de estoque baixo, busca e categorias |
| Mercadoria | detalhes, **registro de entrada de estoque** e histórico de movimentações |
| Cadastrar nova mercadoria | nome, marca, categoria, nível, preço, quantidade inicial, estoque mínimo e descrição |
| Relatórios e IA | **vendas por dia**, **entradas e saídas de estoque**, **itens mais vendidos**, vendas por categoria e estoque baixo, em 7, 15 ou 30 dias, mais a **análise do Gemini** |

### Catálogo

As 14 categorias: Violões, Guitarras, Baixos, Ukulele e cavaquinho, Teclados e pianos, Baterias e percussão, Sopros, Cordas de arco, Amplificadores, Pedais e efeitos, Microfones, Áudio e gravação, DJ e produção, e Acessórios (cordas, palhetas, cabos, estantes, capotrastes, afinadores e outros).

Cada categoria vai de opções de entrada a modelos profissionais. O item mais barato é uma palheta de R$ 4,90 e o mais caro é uma workstation de R$ 34.900,00.

## 3. Arquitetura

```
┌──────────────────────────┐   HTTP + JSON    ┌────────────────────────────────┐
│  App (React Native/Expo) │ ───────────────▶ │  API Node.js (node:http)       │
│  telas, contexto, Axios  │ ◀─────────────── │  rotas → validação → regras    │
└──────────────────────────┘   token JWT      │        │            │          │
                                              │   SQLite (node:sqlite)          │
                                              │        │            │          │
                                              └────────┼────────────┼──────────┘
                                                       ▼            ▼
                                               ViaCEP / BrasilAPI   Gemini API
```

- O app nunca fala direto com o Gemini nem com o serviço de CEP. Tudo passa pela API, que guarda a chave, valida os dados e decide o que enviar.
- O backend não tem dependências externas: usa só módulos que vêm com o Node (`node:http`, `node:sqlite`, `node:crypto`, `fetch`).

### Estrutura de pastas

```
app/src
├── components/      peças reutilizáveis (campos, endereço, gráfico, cartões de produto)
├── contexts/        AuthContext (login e perfil) e CartContext (carrinho)
├── navigation/      Auth, Customer e Admin: uma pilha de telas para cada perfil
├── screens/
│   ├── auth/        login com as duas abas e criação de conta
│   ├── customer/    início, loja, assistente, carrinho, pedidos e cadastro
│   └── admin/       início, clientes, estoque, mercadoria, nova mercadoria e relatórios
├── services/        Axios e as funções de cada rota da API
├── styles/          paleta de cores e espaçamentos
└── utils/           categorias, formatação, validações e máscaras

backend/src
├── server.js        registra as rotas e sobe o servidor
├── router.js        roteador HTTP (rotas, JSON, CORS e erros)
├── database.js      tabelas, migração do banco antigo e dados iniciais
├── catalog.js       categorias e os 117 produtos do catálogo inicial
├── validators.js    validação de tudo que chega na API
├── security.js      hash de senha (scrypt) e token JWT
├── middleware/      exige login, exige perfil (admin/cliente) e limita as chamadas à IA
├── routes/          auth, clientes, catálogo e estoque, pedidos, relatórios e IA
└── services/        CEP, Gemini, recomendações e relatórios
```

### Banco de dados

| Tabela | Conteúdo |
| --- | --- |
| `users` | contas de acesso, com `role` = `admin` ou `customer` |
| `clients` | cadastro do cliente: telefone, CEP, rua, número, complemento, bairro, cidade, UF e interesses |
| `products` | mercadorias: SKU, categoria, nível, preço em centavos, estoque e estoque mínimo |
| `orders` e `order_items` | pedidos e itens, com nome e preço gravados no momento da compra |
| `stock_movements` | cada entrada (estoque inicial, reposição) e saída (venda) |

Os valores em dinheiro são guardados em **centavos** (inteiros) para não ter erro de arredondamento.

## 4. Regras de negócio e validações

**Contas e acesso**
- Senha com hash `scrypt` e sal; token JWT válido por 7 dias.
- Cada rota exige o perfil certo: cliente não acessa estoque nem relatórios (403), administrador não compra.
- O login confere a aba escolhida: conta de cliente na aba de administrador é recusada, com a mensagem indicando a aba certa.

**Cadastro**
- Nome de 3 a 80 caracteres, e-mail válido e único, telefone com DDD (10 ou 11 dígitos), senha de 6 a 72 caracteres.
- CEP com 8 dígitos, número obrigatório (aceita "S/N"), complemento opcional, UF válida.
- Pelo menos uma categoria de interesse, todas do catálogo.
- O e-mail de um cliente que tem conta não pode ser trocado pelo administrador, e esse cliente não pode ser excluído.

**CEP**
- A API consulta o ViaCEP e, se ele falhar, a BrasilAPI. CEP inexistente devolve 404; os dois serviços fora do ar devolvem 502 e o usuário preenche à mão.

**Estoque e mercadorias**
- Preço entre R$ 0,01 e R$ 500.000,00, com até 2 casas decimais; não aceita mercadoria repetida (mesmo nome e marca).
- O SKU é gerado pela API a partir da categoria (ex.: `GUI-006`).
- Toda alteração de quantidade vira uma movimentação: a quantidade inicial é uma entrada, a reposição é uma entrada e cada venda é uma saída.
- O item é marcado como **estoque baixo** quando a quantidade fica no estoque mínimo ou abaixo dele.
- Mercadoria pode ser tirada de venda sem ser apagada, para manter o histórico.

**Pedidos**
- De 1 a 20 produtos, até 10 unidades de cada.
- O preço é sempre o do banco, nunca o enviado pelo app.
- O pedido inteiro roda em uma **transação**: se um item estiver esgotado ou sem quantidade suficiente, nada é gravado e o estoque não muda.

**IA**
- Cada usuário pode fazer até 10 consultas à IA a cada 10 minutos (429 depois disso).
- Orçamento válido, até 5 categorias e texto de até 200 caracteres.

## 5. Integração com o Gemini

### Assistente de compras (cliente)

1. O app envia `POST /ai/recommendations` com categorias, orçamento e o que o cliente procura.
2. A API busca no banco os produtos **à venda e com estoque** dessas categorias, dentro do orçamento.
3. Monta o pedido ao Gemini com uma instrução de sistema (assistente de compras da loja, só pode escolher produtos da lista) e a lista em JSON.
4. Chama `generateContent` pedindo **JSON com esquema definido** (`responseMimeType` e `responseSchema`).
5. Confere a resposta: descarta produtos que não existem na lista, tipos inválidos e repetições.
6. Devolve as recomendações com os dados atuais de cada produto, prontos para ir ao carrinho.

### Análise de relatórios (administrador)

1. O app envia `POST /ai/admin-report` com o período (7, 15 ou 30 dias).
2. A API calcula os números no SQLite: vendas por dia, entradas e saídas, mais vendidos, categorias e estoque baixo.
3. Envia esse resumo ao Gemini, que devolve `resumo`, `destaques`, `alertas` e `recomendacoes`.

### Chamada à API

```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent
x-goog-api-key: <GEMINI_API_KEY>

{
  "systemInstruction": { "parts": [{ "text": "Você é o assistente de compras da Acorde..." }] },
  "contents": [{ "role": "user", "parts": [{ "text": "Categorias... Produtos disponíveis: [...]" }] }],
  "generationConfig": {
    "temperature": 0.4,
    "responseMimeType": "application/json",
    "responseSchema": { "type": "OBJECT", "properties": { "resumo": {...}, "recomendacoes": {...} } }
  }
}
```

Se não houver chave, se o Gemini demorar mais de 30 segundos ou se responder com erro, a API usa o **modo local**: escolhe o mais barato, o de nível mais alto e o de melhor relação nível/preço, ou calcula a análise com regras fixas. O campo `source` da resposta diz se veio do `gemini` ou do modo `local`.

## 6. Rotas da API

| Método | Rota | Quem usa | Para quê |
| --- | --- | --- | --- |
| POST | `/auth/register` | público | criar conta de cliente com endereço e interesses |
| POST | `/auth/login` | público | entrar (`role`: `customer` ou `admin`) |
| GET | `/auth/me` | logado | conferir o token |
| GET | `/cep/:cep` | público | buscar endereço pelo CEP |
| GET | `/categories` | público | categorias e níveis |
| GET | `/products` | logado | listar com `search`, `category`, `sort`, `lowStock` |
| GET | `/products/:id` | logado | detalhar mercadoria |
| POST | `/products` | admin | cadastrar mercadoria |
| PUT | `/products/:id` | admin | editar ou tirar de venda |
| POST | `/products/:id/stock` | admin | registrar entrada de estoque |
| GET | `/products/:id/movements` | admin | histórico de movimentações |
| GET, POST, PUT, DELETE | `/clients` e `/clients/:id` | admin | CRUD de clientes |
| POST | `/orders` | cliente | finalizar compra |
| GET | `/orders` | logado | pedidos (cliente vê os dele; admin vê todos) |
| GET, PUT | `/me/profile` | cliente | ver e editar o próprio cadastro |
| GET | `/admin/dashboard?days=7` | admin | números dos relatórios |
| GET | `/ai/status` | logado | se o Gemini está ativo |
| POST | `/ai/recommendations` | cliente | assistente de compras |
| POST | `/ai/admin-report` | admin | análise dos relatórios |

Erros seguem sempre o mesmo formato, e o app mostra `message` em uma faixa e cada item de `errors` embaixo do campo:

```json
{ "message": "Confira os campos destacados.", "errors": { "cep": "Informe um CEP com 8 dígitos." } }
```

## 7. Conceitos de React Native usados

| Conceito | Onde ver |
| --- | --- |
| `useState` e `useEffect` | todas as telas; busca com espera em `ShopScreen.js` e `StockScreen.js` |
| Context API | `AuthContext.js` (login e perfil) e `CartContext.js` (carrinho) |
| Navegação por perfil | `RootNavigator.js` escolhe Auth, Customer ou Admin |
| Componentes reutilizáveis | `AddressFields`, `InterestPicker`, `BarChart`, `ProductCard` |
| Axios e camada de serviços | `services/api.js` e `services/storeApi.js` |
| AsyncStorage | token salvo em `AuthContext.js` |
| Listas | `FlatList` na loja, no estoque e nos clientes |
| Hook próprio | `utils/useFormErrors.js` limpa o erro do campo quando ele é editado |

## 8. Testes

```bash
cd backend
npm test
```

São 18 testes que sobem a API com banco em memória e cobrem: login por perfil, cadastro com endereço e interesses, CEP (com o serviço principal fora do ar), CRUD de clientes, catálogo com mais de 80 itens, cadastro de mercadoria, entrada de estoque, pedido com transação e falta de estoque, relatórios, as duas funções de IA com a resposta do Gemini simulada (incluindo produto inventado e erro do Gemini), limite de consultas e a migração do banco da versão anterior.

## 9. Problemas comuns

**O backend não inicia e fala em versão do Node.** O banco usa `node:sqlite`, disponível a partir do Node 22.13.

**O app mostra "Não foi possível conectar à API".** Abra o endereço mostrado na mensagem no navegador: deve aparecer `{"name":"Acorde API","status":"ok",...}`.

**Funciona no navegador, mas não no celular.** Os dois precisam estar na mesma rede; permita o Node.js no firewall do Windows. Em modo túnel, crie `app/.env` com `EXPO_PUBLIC_API_URL=http://SEU_IP:3333` e rode `npx expo start -c`.

**O assistente aparece em "modo local".** A chave do Gemini não está no `backend/.env`, ou o Gemini recusou a chamada. A faixa amarela na tela mostra o motivo.

**O CEP não é encontrado.** Confira a internet do computador que roda o backend. Se ViaCEP e BrasilAPI estiverem fora do ar, preencha o endereço à mão.

**Quero começar com o banco do zero.** Pare o backend, apague a pasta `backend/data` e inicie de novo.

Projeto educacional, pode ser modificado livremente.
