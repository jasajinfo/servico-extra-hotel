# API de Serviços Extras do Hotel

Microsserviço REST em **Fastify + MySQL 8** para cadastrar serviços extras,
controlar períodos de disponibilidade e realizar agendamentos vinculados a uma
reserva de hospedagem.

## Funcionalidades

- cadastro, consulta e atualização de serviços `SPA`, `PASSEIO` e `REFEICAO`;
- ativação, inativação e atualização de preço;
- cadastro de disponibilidades de segunda a quinta ou de sexta a domingo;
- cálculo automático do horário final pela duração do serviço;
- controle de capacidade em horários simultâneos;
- status `PENDENTE`, `CONFIRMADO`, `CONCLUIDO` e `CANCELADO`;
- autenticação JWT e autorização por perfil;
- integração opcional com o microsserviço de reservas;
- documentação OpenAPI/Swagger;
- interface web responsiva inspirada em um site hoteleiro premium;
- transação e bloqueio para impedir excesso de capacidade em concorrência.

## Execução rápida com Docker

Requisitos: Docker e Docker Compose.

```bash
docker compose up --build
```

Depois, acesse:

- Aplicativo web: `http://localhost:3000`
- Saúde: `http://localhost:3000/health`
- Swagger: `http://localhost:3000/docs`

## Interface web

A página inicial utiliza cabeçalho, hero fotográfico, filtros por categoria,
cartões de serviços, seção explicativa e rodapé. Sem autenticação, ela apresenta
três cartões demonstrativos para preservar a visualização do layout. Após o
login, os cartões são substituídos pelos serviços ativos cadastrados no banco.

O botão **Agendar** abre um formulário conectado a
`POST /api/v1/agendamentos`. As imagens são carregadas do Unsplash; por isso, a
exibição das fotografias exige conexão com a internet.

## Execução local

Requisitos: Node.js 20 ou superior e MySQL 8.

```bash
cp .env.example .env
npm install
mysql -u root -p < sql/schema.sql
npm run dev
```

## Autenticação local

O endpoint `POST /api/v1/auth/login` gera um JWT. Usuário inicial definido em
`.env.example`:

```json
{
  "username": "admin",
  "password": "admin123"
}
```

Copie o token e use no cabeçalho:

```http
Authorization: Bearer SEU_TOKEN
```

Os usuários locais existem apenas para facilitar a execução acadêmica. Em
produção, substitua esse login por um provedor de identidade e nunca armazene
senhas em texto simples.

## Principais endpoints

| Método | Endpoint | Perfis |
|---|---|---|
| `POST` | `/api/v1/servicos` | ADMIN |
| `GET` | `/api/v1/servicos` | autenticado |
| `PUT` | `/api/v1/servicos/:id` | ADMIN |
| `PATCH` | `/api/v1/servicos/:id/preco` | ADMIN |
| `PATCH` | `/api/v1/servicos/:id/situacao` | ADMIN |
| `POST` | `/api/v1/servicos/:id/disponibilidades` | ADMIN |
| `GET` | `/api/v1/servicos/:id/disponibilidades` | autenticado |
| `POST` | `/api/v1/servicos/:id/verificar-disponibilidade` | autenticado |
| `POST` | `/api/v1/agendamentos` | ADMIN, RECEPCAO, HOSPEDE |
| `GET` | `/api/v1/agendamentos` | autenticado |
| `PUT` | `/api/v1/agendamentos/:id` | ADMIN, RECEPCAO, HOSPEDE |
| `PATCH` | `/api/v1/agendamentos/:id/confirmar` | ADMIN, RECEPCAO |
| `PATCH` | `/api/v1/agendamentos/:id/cancelar` | todos |
| `PATCH` | `/api/v1/agendamentos/:id/concluir` | ADMIN, RECEPCAO |

## Exemplo de cadastro de serviço

```json
{
  "nome": "Massagem relaxante",
  "descricao": "Sessão individual de massagem",
  "categoria": "SPA",
  "preco": 180,
  "duracaoMinutos": 60,
  "capacidade": 2,
  "ativo": true
}
```

## Exemplo de disponibilidade

```json
{
  "horaInicio": "09:00",
  "horaFim": "18:00",
  "segundaQuinta": true,
  "sextaDomingo": true
}
```

## Exemplo de agendamento

```json
{
  "servicoExtraId": "UUID-DO-SERVICO",
  "reservaId": "UUID-DA-RESERVA",
  "dataAgendamento": "2026-09-20",
  "horaInicio": "10:00",
  "quantidadePessoas": 2
}
```

O cliente não informa `horaFim`: a API calcula esse campo utilizando
`duracaoMinutos`, evitando divergências.

## Integração com reservas

Defina no `.env`:

```env
RESERVA_VALIDATION_ENABLED=true
RESERVA_SERVICE_URL=http://reservas:3001/api/v1
```

A API consultará `GET /reservas/:reservaId`, encaminhando o token recebido. O
banco do microsserviço de reservas não é acessado diretamente.

## Testes e verificação

```bash
npm test
npm run check
```
