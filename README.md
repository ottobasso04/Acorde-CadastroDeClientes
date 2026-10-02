# Acorde Cadastro: React Native com Expo e backend próprio

Aplicação didática para a **área de cadastro de uma loja online de instrumentos e produtos de música**. Um funcionário da loja cria uma conta, entra e passa a cadastrar, consultar, editar e excluir clientes.

O projeto tem duas partes:

- `app/`: o aplicativo, feito com **React Native**, **Expo**, **React Navigation** e **Axios**.
- `backend/`: uma **API REST em Node.js** com banco de dados **SQLite** próprio. Ela substitui as APIs de demonstração (ReqRes e MockAPI) usadas no tutorial de referência.

Este README explica como rodar e como cada parte funciona.

## 1. O que a aplicação faz

1. O usuário cria uma conta ou informa e-mail e senha na tela de login.
2. O app envia os dados para a API do projeto (`backend/`).
3. A API confere a senha e devolve um token, que é salvo no aparelho.
4. O usuário acessa a tela inicial, que mostra um resumo do cadastro.
5. Na tela de clientes, pode buscar por nome, editar e excluir registros.
6. No formulário, pode cadastrar nome, e-mail, telefone, endereço e a categoria de instrumento de interesse.

Os dados ficam no arquivo `backend/data/acorde.db`. Eles continuam lá quando o app e o servidor são fechados.

## 2. Tecnologias utilizadas

| Parte | Tecnologia | Para que serve |
| --- | --- | --- |
| App | React Native | telas para Android, iOS e Web |
| App | Expo (SDK 57) | executar e testar o aplicativo |
| App | React Navigation | navegação entre telas |
| App | Axios | requisições HTTP |
| App | AsyncStorage | guardar o token de login no aparelho |
| Backend | Node.js (`node:http`) | servidor da API |
| Backend | SQLite (`node:sqlite`) | banco de dados em um arquivo |
| Backend | `node:crypto` | hash das senhas e assinatura do token (JWT) |

O backend não tem dependências externas: usa só módulos que já vêm com o Node. Por isso ele não precisa de `npm install`.

## 3. Preparando o ambiente

É necessário ter **Node.js 22.13 ou mais novo** (o módulo de SQLite só existe a partir dessa versão). Confira com `node -v`.

Abra **dois terminais**, um para cada parte.

**Terminal 1: API**

```bash
cd backend
npm start
```

O terminal mostra o endereço da API (porta 3333). Na primeira execução, o banco é criado com uma conta de demonstração e quatro clientes de exemplo.

**Terminal 2: aplicativo**

```bash
cd app
npm install
npm run web
```

`npm run web` abre o app no navegador. Para usar o celular, rode `npm start` e leia o QR Code com o Expo Go. O celular e o computador precisam estar na mesma rede Wi-Fi.

O app descobre sozinho o endereço da API (o mesmo computador que está rodando o Expo, porta 3333). Só é preciso configurar algo se a API estiver em outro lugar: veja `app/.env.example`.

## 4. Conta de demonstração

```
E-mail: demo@acorde.com
Senha:  acorde123
```

Ela é criada pelo backend na primeira execução. Também é possível criar contas novas pela tela **Criar uma conta**: elas são gravadas no banco, com a senha protegida por hash.

## 5. Estrutura do projeto

```
.
├── app/                               # aplicativo Expo
│   ├── App.js                         # ponto de entrada do aplicativo
│   ├── index.js                       # inicialização do Expo
│   ├── .env.example                   # modelo da variável com a URL da API
│   └── src/
│       ├── components/
│       │   ├── AppButton.js           # botão com estado de carregamento
│       │   ├── ClientItem.js          # visual de um cliente da lista
│       │   ├── ConfirmModal.js        # janela de confirmação
│       │   ├── FormField.js           # rótulo + campo + mensagem de erro
│       │   ├── InstrumentPicker.js    # escolha da categoria de instrumento
│       │   ├── MessageBanner.js       # mensagem de sucesso ou erro na tela
│       │   └── ScreenScroll.js        # estrutura comum das telas com formulário
│       ├── contexts/
│       │   └── AuthContext.js         # estado global de autenticação
│       ├── navigation/
│       │   ├── AppNavigator.js        # telas disponíveis após o login
│       │   ├── AuthNavigator.js       # telas disponíveis sem login
│       │   └── RootNavigator.js       # escolhe o navegador correto
│       ├── screens/
│       │   ├── ClientFormScreen.js    # cadastro e edição de cliente
│       │   ├── ClientsListScreen.js   # consulta, busca e exclusão
│       │   ├── HomeScreen.js          # tela inicial com o resumo
│       │   ├── LoginScreen.js         # formulário de login
│       │   └── RegisterScreen.js      # criação de conta
│       ├── services/
│       │   ├── api.js                 # cliente Axios, URL da API e erros
│       │   ├── authApi.js             # requisições de conta
│       │   └── clientsApi.js          # operações com clientes
│       ├── styles/
│       │   └── theme.js               # cores, espaçamentos e bordas
│       └── utils/
│           ├── instruments.js         # categorias de instrumento
│           └── validators.js          # validações e máscara de telefone
└── backend/                           # API REST
    ├── .env.example                   # modelo das variáveis de ambiente
    ├── src/
    │   ├── server.js                  # ponto de entrada da API
    │   ├── config.js                  # porta, chave do token e arquivo do banco
    │   ├── database.js                # conexão, tabelas e dados iniciais
    │   ├── router.js                  # roteador HTTP (rotas, JSON, CORS, erros)
    │   ├── security.js                # hash de senha e token JWT
    │   ├── validators.js              # validação dos dados recebidos
    │   ├── middleware/
    │   │   └── requireAuth.js         # exige token nas rotas protegidas
    │   └── routes/
    │       ├── authRoutes.js          # criar conta, login e usuário atual
    │       └── clientRoutes.js        # CRUD de clientes
    └── test/
        └── api.test.js                # testes automatizados da API
```

## 6. Como o login funciona

### 6.1 Entrada da aplicação

Em `App.js`, o `AuthProvider` envolve o `RootNavigator`:

```jsx
<AuthProvider>
  <RootNavigator />
</AuthProvider>
```

O provider disponibiliza `token`, `user`, `loading`, `signIn`, `signUp` e `signOut` para qualquer tela, através do hook `useAuth()`.

### 6.2 Escolha da navegação

`RootNavigator.js` olha para o token:

- enquanto confere o armazenamento local: mostra um indicador de carregamento;
- sem token: mostra o `AuthNavigator` (login e criação de conta);
- com token: mostra o `AppNavigator` (área de cadastro).

Nenhuma tela "navega para o login". Quando o token muda no contexto, a navegação troca sozinha. Isso impede que a área de clientes apareça antes da autenticação.

### 6.3 O caminho do token no app

Quando o usuário toca em **Entrar**:

1. `LoginScreen` valida os campos e chama `signIn` do contexto;
2. `AuthContext` chama `login`, de `authApi.js`;
3. `authApi.js` faz `POST /auth/login` na API;
4. o token devolvido é configurado no Axios (`setAuthToken`), para ir em todas as próximas requisições;
5. token e usuário são salvos com `AsyncStorage.setItem`;
6. o estado muda com `setToken` e o `RootNavigator` mostra a área logada.

Ao reabrir o app, o `AuthContext` lê o token salvo e chama `GET /auth/me` para confirmar que ele ainda vale. Ao tocar em **Sair**, o token é removido do estado e do `AsyncStorage`.

Se a API responder `401` durante o uso (token vencido), um interceptor do Axios em `api.js` chama o `signOut` e o usuário volta para o login.

### 6.4 O que acontece no servidor

- **Senha**: nunca é salva em texto puro. `security.js` gera um hash com `scrypt` e um sal aleatório; no login, o hash da senha digitada é comparado com o hash guardado.
- **Token**: é um JWT assinado com HMAC-SHA256 e válido por 7 dias. A assinatura usa uma chave que só o servidor conhece (`JWT_SECRET`), então um token alterado é recusado.
- **Rotas protegidas**: `requireAuth.js` lê o cabeçalho `Authorization: Bearer <token>`, confere o token e só então deixa a rota executar.

## 7. Como os clientes são armazenados

As requisições ficam separadas das telas. `src/services/api.js` cria o cliente Axios com a URL base; `clientsApi.js` tem uma função para cada operação.

| Operação | Método | URL | Objetivo |
| --- | --- | --- | --- |
| Listar | `GET` | `/clients` | Busca todos os clientes |
| Buscar | `GET` | `/clients?search=ana` | Filtra por nome ou e-mail |
| Detalhar | `GET` | `/clients/:id` | Busca um cliente pelo id |
| Criar | `POST` | `/clients` | Insere um novo cliente |
| Editar | `PUT` | `/clients/:id` | Atualiza um cliente |
| Excluir | `DELETE` | `/clients/:id` | Remove um cliente |

Rotas de conta: `POST /auth/register`, `POST /auth/login` e `GET /auth/me`.

O corpo enviado no cadastro tem este formato:

```json
{
  "name": "Ana Souza",
  "email": "ana.souza@example.com",
  "phone": "16991230001",
  "address": "Rua das Palmeiras, 120 - Araraquara/SP",
  "instrument": "Cordas"
}
```

O banco cria o `id` e as datas de criação e de atualização. A tabela é definida em `database.js`:

```sql
CREATE TABLE clients (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  phone       TEXT NOT NULL,
  address     TEXT NOT NULL DEFAULT '',
  instrument  TEXT NOT NULL DEFAULT '',
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Quando a API recusa um pedido, responde com um status de erro e um JSON explicando o motivo:

```json
{
  "message": "Já existe um cliente com este e-mail.",
  "errors": { "email": "Este e-mail já está cadastrado." }
}
```

O app mostra `message` em uma faixa e cada item de `errors` embaixo do campo correspondente.

## 8. Cadastro e edição de um cliente

`ClientFormScreen.js` serve para as duas operações. Se a rota recebe `clientId`, a tela busca o cliente com `GET /clients/:id`, preenche os campos e salva com `PUT`. Sem `clientId`, salva com `POST`.

Cada campo tem o seu estado:

```js
const [name, setName] = useState("");
const [email, setEmail] = useState("");
const [phone, setPhone] = useState("");
const [address, setAddress] = useState("");
const [instrument, setInstrument] = useState("");
```

Ao salvar:

1. a tela valida os campos com `validateClient` (nome, formato do e-mail, tamanho do telefone);
2. chama `createClient` ou `updateClient`;
3. espera a resposta da API com `await`;
4. mostra a mensagem de sucesso, ou os erros devolvidos pelo servidor;
5. permite voltar para a lista de clientes.

O `await` é importante: a mensagem de sucesso só aparece depois que o servidor confirma a gravação. Enquanto a requisição está em andamento, o botão fica desabilitado e mostra um indicador, para evitar cadastro em dobro.

A validação existe nos dois lados. No app ela dá resposta imediata ao usuário; no servidor ela protege o banco, porque qualquer programa pode chamar a API sem passar pelas telas.

## 9. Lista, busca e exclusão

`ClientsListScreen.js` chama `listClients()` dentro de um `useEffect` quando a tela aparece. A resposta fica no estado `clients` e é exibida por um `FlatList`. Durante a primeira carga aparece um `ActivityIndicator`, e a lista pode ser puxada para baixo para atualizar.

**Busca.** O texto digitado fica no estado `search`. O mesmo `useEffect` depende desse estado e espera 400 ms depois da última tecla antes de chamar a API (debounce). A função de limpeza do efeito cancela a espera se o usuário continuar digitando. No servidor, a busca ignora maiúsculas e acentos: "jose" encontra "José".

**Itens.** Cada cliente é renderizado pelo componente `ClientItem.js`, que recebe:

- `client`: os dados do cliente;
- `onEdit`: função chamada ao tocar em **Editar**;
- `onDelete`: função chamada ao tocar em **Excluir**.

**Exclusão.** Antes de excluir, a tela mostra o `ConfirmModal` com as opções **Cancelar** e **Excluir**. O `DELETE` só acontece depois da confirmação. Se a API responder com sucesso:

1. o cliente é retirado do estado local;
2. a lista se atualiza sem nova requisição;
3. aparece a mensagem `Cliente excluído com sucesso.`

## 10. Conceitos importantes e onde encontrá-los

| Conceito | O que é | Onde ver |
| --- | --- | --- |
| Estado (`useState`) | valores que mudam durante o uso: campos, listas, mensagens | todas as telas; comece por `LoginScreen.js` |
| Efeitos (`useEffect`) | ações ligadas ao ciclo de vida, com função de limpeza | `ClientsListScreen.js`, `ClientFormScreen.js`, `AuthContext.js` |
| Context API | estado compartilhado sem passar props de tela em tela | `AuthContext.js` e o hook `useAuth()` |
| Promises e `async/await` | requisições assíncronas com `try/catch/finally` | `handleSave` em `ClientFormScreen.js` |
| Componentes reutilizáveis | peças usadas em várias telas, configuradas por props | pasta `components/` |
| Navegação | pilhas de telas e passagem de parâmetros | pasta `navigation/` |
| Camada de serviços | URLs e Axios fora das telas | pasta `services/` |
| Armazenamento local | dados que permanecem no aparelho | `AsyncStorage` em `AuthContext.js` |
| API REST | métodos HTTP, status e JSON | `backend/src/routes/` |
| Banco de dados | tabelas, SQL e parâmetros seguros | `backend/src/database.js` e `clientRoutes.js` |
| Autenticação | hash de senha, token e rotas protegidas | `backend/src/security.js` e `requireAuth.js` |

### CRUD completo

- **Create**: cadastrar cliente (`POST /clients`);
- **Read**: listar, buscar e detalhar (`GET /clients`, `GET /clients/:id`);
- **Update**: editar cliente (`PUT /clients/:id`);
- **Delete**: excluir cliente (`DELETE /clients/:id`).

## 11. Exercícios do tutorial de referência

Os oito exercícios propostos no tutorial original já estão resolvidos aqui:

| Exercício | Onde está |
| --- | --- |
| 1. Campo de endereço no formulário e no payload | `ClientFormScreen.js`, coluna `address` no banco |
| 2. Edição de cliente com `PUT` | `ClientFormScreen.js`, `updateClient`, `PUT /clients/:id` |
| 3. Busca por nome na lista | `ClientsListScreen.js`, `GET /clients?search=` |
| 4. Botão de salvar desabilitado durante a requisição | prop `loading` de `AppButton.js` |
| 5. Estilos com `StyleSheet.create` | todos os componentes e telas, com `styles/theme.js` |
| 6. Validação de e-mail e tamanho do telefone | `utils/validators.js` e `backend/src/validators.js` |
| 7. Indicador de carregamento na busca de clientes | `ActivityIndicator` em `ClientsListScreen.js` |
| 8. URL da API em variável de ambiente | `EXPO_PUBLIC_API_URL` em `services/api.js` |

Sugestões para continuar praticando:

1. Adicione um campo de CPF, com máscara e validação.
2. Crie um filtro por categoria de instrumento na lista.
3. Mostre a data de cadastro em `ClientItem`.
4. Crie uma tela de perfil para trocar o nome do usuário.
5. Crie a tabela `products` e um CRUD de produtos da loja.

## 12. Testes automatizados

O backend tem testes que sobem a API com um banco em memória e chamam as rotas de verdade:

```bash
cd backend
npm test
```

Eles cobrem login, criação de conta, proteção por token, o CRUD de clientes, a busca, as validações e o CORS.

## 13. Problemas comuns

### O backend não inicia e fala em versão do Node

O banco usa o módulo `node:sqlite`, disponível a partir do Node 22.13. Instale a versão LTS atual em https://nodejs.org.

### O app mostra "Não foi possível conectar à API"

Confira se o terminal do backend está aberto e rodando. A mensagem mostra o endereço que o app tentou usar; abra esse endereço no navegador: deve aparecer `{"name":"Acorde Cadastro API","status":"ok"}`.

### Funciona no navegador, mas não no celular

O celular precisa alcançar o computador pela rede:

- os dois devem estar na mesma rede Wi-Fi;
- o firewall do Windows pode bloquear a porta 3333: permita o acesso do Node.js em redes privadas quando o aviso aparecer;
- se o Expo estiver em modo túnel (`--tunnel`), o app não consegue descobrir o IP do computador. Crie o arquivo `app/.env` com `EXPO_PUBLIC_API_URL=http://SEU_IP:3333` e reinicie com `npx expo start -c`.

### O Expo Go diz que a versão do SDK é incompatível

O projeto usa o Expo SDK 57. Se o seu Expo Go for mais novo, atualize o projeto:

```bash
cd app
npx expo install expo@latest --fix
```

### A tela não abre ou fica com erro de módulo

Confira os nomes de arquivos e pastas (maiúsculas e minúsculas fazem diferença). Depois limpe o cache:

```bash
npx expo start -c
```

### Quero começar com o banco vazio de novo

Pare o backend, apague a pasta `backend/data` e inicie de novo. O banco é recriado com os dados iniciais.

## 14. Próximos passos

- publicar a API em um servidor e apontar o app para ela com `EXPO_PUBLIC_API_URL`;
- trocar o SQLite por PostgreSQL ou MySQL;
- adicionar perfis de acesso (administrador e vendedor);
- cadastrar produtos e pedidos da loja;
- adicionar testes para os componentes e telas do app.

Este projeto é educacional e pode ser modificado livremente.
