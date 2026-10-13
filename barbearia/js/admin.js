// Painel do barbeiro: agenda do dia por barbeiro, com ações de status.
(() => {
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const S = Store;
  const SESSAO = 'barbearia.admin';

  document.querySelectorAll('[data-nome]').forEach((el) => (el.textContent = CONFIG.nome));

  function logado() {
    try { return sessionStorage.getItem(SESSAO) === '1'; } catch (e) { return window.__adm === true; }
  }
  function setLogado(v) {
    try { v ? sessionStorage.setItem(SESSAO, '1') : sessionStorage.removeItem(SESSAO); } catch (e) { window.__adm = v; }
  }

  function mostrar() {
    const ok = logado();
    $('#login').hidden = ok;
    $('#painel').hidden = !ok;
    $('#sair').hidden = !ok;
    if (ok) render();
  }

  $('#login').addEventListener('submit', (e) => {
    e.preventDefault();
    if (e.target.pin.value === CONFIG.adminPin) { setLogado(true); mostrar(); }
    else { $('#erro-login').textContent = 'PIN incorreto.'; e.target.pin.select(); }
  });
  $('#sair').addEventListener('click', () => { setLogado(false); mostrar(); });

  // ---------- filtros ----------
  const fData = $('#f-data');
  const fBarb = $('#f-barbeiro');
  fData.value = S.dateKey(new Date());
  fBarb.innerHTML = '<option value="">Todos</option>' +
    CONFIG.barbeiros.map((b) => `<option value="${b.id}">${esc(b.nome)}</option>`).join('');

  const moverDia = (n) => {
    const d = S.parseDate(fData.value || S.dateKey(new Date()));
    d.setDate(d.getDate() + n);
    fData.value = S.dateKey(d);
    render();
  };
  $('#f-anterior').addEventListener('click', () => moverDia(-1));
  $('#f-proximo').addEventListener('click', () => moverDia(1));
  $('#f-hoje').addEventListener('click', () => { fData.value = S.dateKey(new Date()); render(); });
  fData.addEventListener('change', render);
  fBarb.addEventListener('change', render);

  // ---------- render ----------
  const ROTULO = { confirmado: 'Confirmado', cancelado: 'Cancelado', concluido: 'Concluído', faltou: 'Não compareceu' };

  function fone(d) {
    return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }

  function render() {
    const data = fData.value;
    if (!data) return;
    $('#titulo-dia').textContent = S.formatData(data, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

    const doDia = S.ordenar(S.listar().filter((a) => a.data === data && (!fBarb.value || a.barbeiroId === fBarb.value)));
    const ativos = doDia.filter((a) => a.status === 'confirmado' || a.status === 'concluido');
    const receita = ativos.reduce((t, a) => t + a.preco, 0);
    const recebido = doDia.filter((a) => a.status === 'concluido').reduce((t, a) => t + a.preco, 0);

    $('#stats').innerHTML = [
      ['Agendamentos', ativos.length],
      ['Concluídos', doDia.filter((a) => a.status === 'concluido').length],
      ['Cancel./faltas', doDia.filter((a) => a.status === 'cancelado' || a.status === 'faltou').length],
      ['Previsto', S.formatBRL(receita)],
      ['Realizado', S.formatBRL(recebido)],
    ].map(([k, v]) => `<div class="stat"><span>${k}</span><strong>${v}</strong></div>`).join('');

    if (!S.aberto(data)) {
      $('#colunas').innerHTML = '<p class="vazio">A barbearia não abre neste dia.</p>';
      if (!doDia.length) return;
    }

    const barbeiros = CONFIG.barbeiros.filter((b) => !fBarb.value || b.id === fBarb.value);
    $('#colunas').innerHTML = barbeiros.map((b) => {
      const itens = doDia.filter((a) => a.barbeiroId === b.id);
      return `<section class="coluna">
        <h3><span class="avatar avatar--sm">${esc(b.nome[0])}</span>${esc(b.nome)}</h3>
        ${itens.length ? itens.map(item).join('') : '<p class="vazio">Agenda livre.</p>'}
      </section>`;
    }).join('');
  }

  function item(a) {
    const fim = S.toHHMM(S.toMin(a.hora) + a.duracao);
    const acoes = a.status === 'confirmado'
      ? `<button class="btn btn--sm btn--ok" data-acao="concluido" data-id="${a.id}">Concluir</button>
         <button class="btn btn--sm btn--ghost" data-acao="faltou" data-id="${a.id}">Faltou</button>
         <button class="btn btn--sm btn--perigo" data-acao="cancelado" data-id="${a.id}">Cancelar</button>`
      : `<button class="btn btn--sm btn--link" data-acao="confirmado" data-id="${a.id}">Desfazer</button>`;
    return `<div class="item item--${a.status}">
      <div class="item__topo">
        <span class="item__hora">${a.hora}–${fim}</span>
        <span class="tag tag--${a.status}">${ROTULO[a.status]}</span>
      </div>
      <strong>${esc(a.nome)}</strong>
      <p>${esc(a.servicoNome)} · ${S.formatBRL(a.preco)}</p>
      <p><a href="https://wa.me/55${a.telefone}" target="_blank" rel="noopener">${fone(a.telefone)}</a> · #${a.id}</p>
      ${a.observacao ? `<p>“${esc(a.observacao)}”</p>` : ''}
      <div class="item__acoes">${acoes}</div>
    </div>`;
  }

  $('#colunas').addEventListener('click', (e) => {
    const b = e.target.closest('[data-acao]');
    if (!b) return;
    if (b.dataset.acao === 'cancelado' && !confirm('Cancelar este agendamento? O horário volta a ficar livre.')) return;
    if (b.dataset.acao === 'confirmado') {
      // reabrir só se o horário não foi ocupado por outra pessoa nesse meio-tempo
      const a = S.listar().find((x) => x.id === b.dataset.id);
      const conflito = S.listar().some((x) => x.id !== a.id && x.data === a.data && x.barbeiroId === a.barbeiroId &&
        x.status !== 'cancelado' && S.toMin(a.hora) < S.toMin(x.hora) + x.duracao && S.toMin(x.hora) < S.toMin(a.hora) + a.duracao);
      if (conflito) { alert('Esse horário já foi ocupado por outro cliente.'); return; }
    }
    S.atualizarStatus(b.dataset.id, b.dataset.acao);
    render();
  });

  window.addEventListener('storage', () => { if (logado()) render(); });

  mostrar();
})();
