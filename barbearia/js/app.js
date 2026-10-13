// Site público: vitrine + fluxo de agendamento + "meus horários".
(() => {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const S = Store;
  const CANCELA_ATE_MIN = 120;

  const estado = { passo: 1, servicoId: null, barbeiroId: null, data: null, hora: null };

  // ---------- conteúdo institucional ----------
  const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  function textoFuncionamento() {
    const grupos = [];
    for (let d = 0; d < 7; d++) {
      const h = CONFIG.horarios[d];
      if (!h) continue;
      const faixa = h.join('–');
      const ult = grupos[grupos.length - 1];
      if (ult && ult.faixa === faixa && ult.fim === d - 1) ult.fim = d;
      else grupos.push({ ini: d, fim: d, faixa });
    }
    return grupos.map((g) => (g.ini === g.fim ? DIAS[g.ini] : DIAS[g.ini] + '–' + DIAS[g.fim]) + ' ' + g.faixa).join(' · ');
  }

  $$('[data-nome]').forEach((el) => (el.textContent = CONFIG.nome));
  $$('[data-slogan]').forEach((el) => (el.textContent = CONFIG.slogan));
  $$('[data-endereco]').forEach((el) => (el.textContent = CONFIG.endereco));
  $$('[data-telefone]').forEach((el) => (el.textContent = CONFIG.telefoneExibicao));
  $$('[data-funcionamento]').forEach((el) => (el.textContent = textoFuncionamento()));

  const iniciais = (nome) => nome.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  $('#lista-servicos').innerHTML = CONFIG.servicos.map((s) => `
    <article class="card-servico">
      <div><h3>${esc(s.nome)}</h3><p>${esc(s.descricao)}</p></div>
      <div class="card-servico__meta"><span>${s.duracao} min</span><strong>${S.formatBRL(s.preco)}</strong></div>
    </article>`).join('');

  $('#lista-equipe').innerHTML = CONFIG.barbeiros.map((b) => `
    <article class="card-barbeiro">
      <div class="avatar">${esc(iniciais(b.nome))}</div>
      <h3>${esc(b.nome)}</h3><p>${esc(b.especialidade)}</p>
    </article>`).join('');

  // ---------- passo 1: serviço ----------
  function renderServicos() {
    $('#opcoes-servico').innerHTML = CONFIG.servicos.map((s) => `
      <button type="button" class="opcao ${estado.servicoId === s.id ? 'is-sel' : ''}" data-servico="${s.id}">
        <span class="opcao__titulo">${esc(s.nome)}</span>
        <span class="opcao__meta">${s.duracao} min · ${S.formatBRL(s.preco)}</span>
      </button>`).join('');
  }
  $('#opcoes-servico').addEventListener('click', (e) => {
    const b = e.target.closest('[data-servico]');
    if (!b) return;
    estado.servicoId = b.dataset.servico;
    estado.data = null; estado.hora = null; // a duração mudou, a disponibilidade também
    renderServicos();
    atualizar();
    irPara(2);
  });

  // ---------- passo 2: barbeiro ----------
  function renderBarbeiros() {
    const opcoes = [{ id: 'qualquer', nome: 'Qualquer um', especialidade: 'Primeiro disponível' }, ...CONFIG.barbeiros];
    $('#opcoes-barbeiro').innerHTML = opcoes.map((b) => `
      <button type="button" class="opcao opcao--barbeiro ${estado.barbeiroId === b.id ? 'is-sel' : ''}" data-barbeiro="${b.id}">
        <span class="avatar avatar--sm">${b.id === 'qualquer' ? '★' : esc(iniciais(b.nome))}</span>
        <span><span class="opcao__titulo">${esc(b.nome)}</span><span class="opcao__meta">${esc(b.especialidade)}</span></span>
      </button>`).join('');
  }
  $('#opcoes-barbeiro').addEventListener('click', (e) => {
    const b = e.target.closest('[data-barbeiro]');
    if (!b) return;
    estado.barbeiroId = b.dataset.barbeiro;
    estado.data = null; estado.hora = null;
    renderBarbeiros();
    atualizar();
    irPara(3);
  });

  // ---------- passo 3: data e hora ----------
  function proximosDias() {
    const dias = [];
    const hoje = new Date();
    for (let i = 0; i < CONFIG.diasAntecedencia; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + i);
      dias.push(S.dateKey(d));
    }
    return dias;
  }

  function renderDias() {
    const dur = S.servico(estado.servicoId).duracao;
    const dias = proximosDias();
    if (!estado.data) estado.data = dias.find((d) => S.horarios(d, estado.barbeiroId, dur).some((h) => h.barbeiroId)) || null;
    $('#dias').innerHTML = dias.map((key) => {
      const d = S.parseDate(key);
      const livres = S.horarios(key, estado.barbeiroId, dur).filter((h) => h.barbeiroId).length;
      const fechado = !S.aberto(key);
      const desab = fechado || livres === 0;
      return `<button type="button" class="dia ${estado.data === key ? 'is-sel' : ''}" data-dia="${key}" ${desab ? 'disabled' : ''}>
        <span class="dia__sem">${DIAS[d.getDay()]}</span>
        <span class="dia__num">${d.getDate()}</span>
        <span class="dia__info">${fechado ? 'fechado' : livres === 0 ? 'lotado' : livres + ' vagas'}</span>
      </button>`;
    }).join('');
    const sel = $('#dias .is-sel');
    if (sel) sel.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function renderHoras() {
    const box = $('#horas');
    if (!estado.data) { box.innerHTML = '<p class="vazio">Nenhuma data disponível no período.</p>'; return; }
    const lista = S.horarios(estado.data, estado.barbeiroId, S.servico(estado.servicoId).duracao)
      .filter((h) => !h.passado);
    if (!lista.length) { box.innerHTML = '<p class="vazio">Sem horários neste dia.</p>'; return; }
    box.innerHTML = lista.map((h) => `
      <button type="button" class="hora ${estado.hora === h.hora ? 'is-sel' : ''}" data-hora="${h.hora}" ${h.barbeiroId ? '' : 'disabled'}>${h.hora}</button>`).join('');
  }

  $('#dias').addEventListener('click', (e) => {
    const b = e.target.closest('[data-dia]');
    if (!b) return;
    estado.data = b.dataset.dia;
    estado.hora = null;
    renderDias(); renderHoras(); atualizar();
  });
  $('#horas').addEventListener('click', (e) => {
    const b = e.target.closest('[data-hora]');
    if (!b) return;
    estado.hora = b.dataset.hora;
    renderHoras(); atualizar();
  });

  // ---------- passo 4: dados ----------
  function mascaraTelefone(v) {
    const d = S.soDigitos(v).slice(0, 11);
    if (d.length <= 2) return d.length ? '(' + d : '';
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  $$('input[type=tel]').forEach((inp) => inp.addEventListener('input', () => { inp.value = mascaraTelefone(inp.value); }));

  // Lembra o último nome/telefone usados neste navegador.
  try {
    const salvo = JSON.parse(localStorage.getItem('barbearia.cliente') || 'null');
    if (salvo) {
      $('#form-dados').nome.value = salvo.nome || '';
      $('#form-dados').telefone.value = mascaraTelefone(salvo.telefone || '');
      $('#form-busca').telefone.value = mascaraTelefone(salvo.telefone || '');
    }
  } catch (e) { /* ignora */ }

  // ---------- navegação ----------
  function podeAvancar(p) {
    if (p === 1) return !!estado.servicoId;
    if (p === 2) return !!estado.barbeiroId;
    if (p === 3) return !!estado.hora;
    return true;
  }

  function irPara(p) {
    estado.passo = p;
    $$('.painel').forEach((el) => { el.hidden = el.dataset.painel !== String(p); });
    $$('#passos li').forEach((li) => {
      const n = Number(li.dataset.passo);
      li.classList.toggle('is-atual', n === p);
      li.classList.toggle('is-feito', p === 'ok' || n < p);
    });
    if (p === 3) { renderDias(); renderHoras(); }
    $('#navegacao').hidden = p === 'ok';
    $('#resumo').hidden = p === 'ok';
    atualizar();
  }

  function atualizar() {
    const s = estado.servicoId && S.servico(estado.servicoId);
    const b = estado.barbeiroId && (estado.barbeiroId === 'qualquer' ? { nome: 'Primeiro disponível' } : S.barbeiro(estado.barbeiroId));
    const set = (k, v) => { $(`[data-r="${k}"]`).textContent = v || '—'; };
    set('servico', s && `${s.nome} (${s.duracao} min)`);
    set('barbeiro', b && b.nome);
    set('data', estado.data && estado.passo >= 3 && S.formatData(estado.data, { weekday: 'short', day: '2-digit', month: 'short' }));
    set('hora', estado.hora);
    set('preco', s && S.formatBRL(s.preco));

    if (typeof estado.passo === 'number') {
      $('#voltar').hidden = estado.passo === 1;
      $('#avancar').textContent = estado.passo === 4 ? 'Confirmar agendamento' : 'Continuar';
      $('#avancar').disabled = !podeAvancar(estado.passo);
    }
  }

  $$('#passos li').forEach((li) => li.addEventListener('click', () => {
    const n = Number(li.dataset.passo);
    if (typeof estado.passo !== 'number') return;
    // só permite pular para passos cujos anteriores estão completos
    for (let i = 1; i < n; i++) if (!podeAvancar(i)) return;
    irPara(n);
  }));

  $('#voltar').addEventListener('click', () => irPara(estado.passo - 1));
  $('#avancar').addEventListener('click', () => {
    if (estado.passo < 4) return irPara(estado.passo + 1);
    confirmar();
  });

  function confirmar() {
    const f = $('#form-dados');
    const erro = $('#erro-form');
    const nome = f.nome.value.trim();
    const tel = S.soDigitos(f.telefone.value);
    if (nome.length < 2) { erro.textContent = 'Informe seu nome.'; f.nome.focus(); return; }
    if (tel.length < 10) { erro.textContent = 'Informe um WhatsApp válido com DDD.'; f.telefone.focus(); return; }
    erro.textContent = '';

    const res = S.criar({ ...estado, nome, telefone: tel, observacao: f.observacao.value });
    if (res.erro) {
      erro.textContent = res.erro;
      estado.hora = null;
      setTimeout(() => irPara(3), 1200);
      return;
    }
    try { localStorage.setItem('barbearia.cliente', JSON.stringify({ nome, telefone: tel })); } catch (e) { /* ignora */ }
    mostrarSucesso(res.agendamento);
  }

  let ultimo = null;
  function mostrarSucesso(ag) {
    ultimo = ag;
    const b = S.barbeiro(ag.barbeiroId);
    $('#ok-codigo').textContent = ag.id;
    $('#ok-resumo').textContent = `${ag.servicoNome} com ${b.nome} — ${S.formatData(ag.data)} às ${ag.hora}.`;
    const msg = `Olá! Agendei pelo site:\n${ag.servicoNome} com ${b.nome}\n${S.formatData(ag.data)} às ${ag.hora}\nNome: ${ag.nome}\nCódigo: ${ag.id}`;
    $('#ok-whatsapp').href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
    irPara('ok');
    $('#agendar').scrollIntoView({ behavior: 'smooth' });
    buscarMeus();
  }

  $('#ok-ics').addEventListener('click', () => {
    if (!ultimo) return;
    const ag = ultimo;
    const ini = S.parseDate(ag.data);
    ini.setMinutes(S.toMin(ag.hora));
    const fim = new Date(ini.getTime() + ag.duracao * 60000);
    const fmt = (d) => d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') +
      'T' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0') + '00';
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Barbearia//Agendamento//PT', 'BEGIN:VEVENT',
      `UID:${ag.id}@barbearia`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(ini)}`, `DTEND:${fmt(fim)}`,
      `SUMMARY:${ag.servicoNome} — ${CONFIG.nome}`, `LOCATION:${CONFIG.endereco}`,
      `DESCRIPTION:Barbeiro: ${S.barbeiro(ag.barbeiroId).nome}. Código ${ag.id}.`,
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const a = document.createElement('a');
    a.href = url; a.download = `agendamento-${ag.id}.ics`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  $('#ok-novo').addEventListener('click', () => {
    Object.assign(estado, { servicoId: null, barbeiroId: null, data: null, hora: null });
    renderServicos(); renderBarbeiros();
    irPara(1);
  });

  // ---------- meus horários ----------
  function podeCancelar(ag) {
    const ini = S.parseDate(ag.data);
    ini.setMinutes(S.toMin(ag.hora));
    return ag.status === 'confirmado' && ini.getTime() - Date.now() > CANCELA_ATE_MIN * 60000;
  }

  const ROTULO = { confirmado: 'Confirmado', cancelado: 'Cancelado', concluido: 'Concluído', faltou: 'Não compareceu' };

  function buscarMeus() {
    const tel = S.soDigitos($('#form-busca').telefone.value);
    const box = $('#meus-lista');
    if (tel.length < 10) { box.innerHTML = ''; return; }
    const hoje = S.dateKey(new Date());
    const lista = S.ordenar(S.porTelefone(tel));
    const futuros = lista.filter((a) => a.data >= hoje && a.status === 'confirmado');
    const outros = lista.filter((a) => !futuros.includes(a)).reverse().slice(0, 5);
    if (!lista.length) { box.innerHTML = '<p class="vazio">Nenhum agendamento encontrado para esse número.</p>'; return; }
    const item = (a) => `
      <li class="meu meu--${a.status}">
        <div>
          <strong>${S.formatData(a.data, { weekday: 'short', day: '2-digit', month: 'short' })} · ${a.hora}</strong>
          <span>${esc(a.servicoNome)} com ${esc(S.barbeiro(a.barbeiroId)?.nome || '—')}</span>
          <span class="tag tag--${a.status}">${ROTULO[a.status]}</span>
        </div>
        ${podeCancelar(a) ? `<button class="btn btn--sm btn--perigo" data-cancelar="${a.id}">Cancelar</button>` : ''}
      </li>`;
    box.innerHTML =
      (futuros.length ? `<h3>Próximos</h3><ul class="meus">${futuros.map(item).join('')}</ul>` : '<p class="vazio">Você não tem horários marcados.</p>') +
      (outros.length ? `<h3>Histórico</h3><ul class="meus">${outros.map(item).join('')}</ul>` : '');
  }

  $('#form-busca').addEventListener('submit', (e) => { e.preventDefault(); buscarMeus(); });
  $('#meus-lista').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cancelar]');
    if (!b || !confirm('Cancelar este agendamento?')) return;
    S.atualizarStatus(b.dataset.cancelar, 'cancelado');
    buscarMeus();
    if (estado.passo === 3) { renderDias(); renderHoras(); }
  });

  // Mantém a disponibilidade em sincronia se outra aba alterar os dados.
  window.addEventListener('storage', (e) => {
    if (e.key !== 'barbearia.agendamentos.v1') return;
    if (estado.passo === 3) { renderDias(); renderHoras(); }
    buscarMeus();
  });

  renderServicos();
  renderBarbeiros();
  irPara(1);
  buscarMeus();
})();
