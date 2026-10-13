# Navalha & Cia — agendamento online para barbearia

Site estático (HTML + CSS + JavaScript puro, sem build) para clientes marcarem horário.

## Como rodar

Abra `index.html` no navegador, ou sirva a pasta:

```bash
cd barbearia
python3 -m http.server 8000   # http://localhost:8000
```

## O que tem

**Site do cliente (`index.html`)**
- Apresentação, horário de funcionamento, serviços com preço/duração e equipe.
- Agendamento em 4 passos: serviço → barbeiro (ou "qualquer um") → dia e horário → nome e WhatsApp.
- Só mostra horários livres: respeita funcionamento, pausa de almoço, duração do serviço,
  horários já passados e agenda de cada barbeiro (sem conflito de horário).
- Confirmação com código, botão para avisar no WhatsApp e arquivo `.ics` para a agenda do celular.
- "Meus horários": o cliente busca pelo WhatsApp e cancela até 2h antes.

**Painel do barbeiro (`admin.html`, PIN padrão `1234`)**
- Agenda do dia em colunas por barbeiro, navegação entre dias e filtro por barbeiro.
- Ações: concluir, marcar falta, cancelar (libera o horário) e desfazer.
- Resumo do dia: atendimentos, cancelamentos/faltas, faturamento previsto e realizado.

## Personalizar

Tudo fica em `js/config.js`: nome, endereço, WhatsApp, PIN, dias/horários de funcionamento,
pausa, intervalo entre horários, serviços e barbeiros.

## Limitação importante

Os agendamentos são salvos no `localStorage` **do navegador**. Isso serve para demonstração
ou para um único computador/tablet no balcão, mas clientes em celulares diferentes não enxergam
os horários uns dos outros, e o PIN do painel não é uma proteção real.

Para usar em produção, troque `js/store.js` por chamadas a um backend (ex.: Supabase/Firebase
ou uma API própria) mantendo as mesmas funções (`listar`, `criar`, `atualizarStatus`,
`porTelefone`, `horarios`) e com login de verdade no painel.
