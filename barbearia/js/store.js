// Armazenamento dos agendamentos (localStorage) e regras de disponibilidade.
const Store = (() => {
  const KEY = 'barbearia.agendamentos.v1';
  let memoria = []; // fallback se o navegador bloquear o localStorage

  function listar() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : memoria;
    } catch (e) {
      return memoria;
    }
  }

  function salvarLista(lista) {
    memoria = lista;
    try { localStorage.setItem(KEY, JSON.stringify(lista)); } catch (e) { /* mantém em memória */ }
  }

  function gerarCodigo() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let c = '';
    for (let i = 0; i < 5; i++) c += chars[Math.floor(Math.random() * chars.length)];
    return c;
  }

  // ---------- utilidades de data/hora ----------
  const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const toHHMM = (min) => String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
  const dateKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const parseDate = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };
  const formatBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatData = (key, opts = { weekday: 'long', day: '2-digit', month: 'long' }) =>
    parseDate(key).toLocaleDateString('pt-BR', opts);
  const soDigitos = (s) => (s || '').replace(/\D/g, '');

  const servico = (id) => CONFIG.servicos.find((s) => s.id === id);
  const barbeiro = (id) => CONFIG.barbeiros.find((b) => b.id === id);

  function aberto(key) {
    return !!CONFIG.horarios[parseDate(key).getDay()];
  }

  function sobrepoe(ini1, dur1, ini2, dur2) {
    return ini1 < ini2 + dur2 && ini2 < ini1 + dur1;
  }

  // Retorna todos os horários do dia; barbeiroId === null significa ocupado.
  // Com barbeiroId 'qualquer', atribui o primeiro barbeiro livre.
  function horarios(data, barbeiroId, duracao) {
    const faixa = CONFIG.horarios[parseDate(data).getDay()];
    if (!faixa) return [];
    const [ini, fim] = faixa.map(toMin);
    const pausa = CONFIG.pausa ? CONFIG.pausa.map(toMin) : null;
    const agora = new Date();
    const ehHoje = dateKey(agora) === data;
    const minAgora = agora.getHours() * 60 + agora.getMinutes();
    const ocupados = listar().filter((a) => a.data === data && a.status !== 'cancelado');
    const candidatos = barbeiroId === 'qualquer' ? CONFIG.barbeiros.map((b) => b.id) : [barbeiroId];

    const out = [];
    for (let t = ini; t + duracao <= fim; t += CONFIG.intervaloMin) {
      if (pausa && sobrepoe(t, duracao, pausa[0], pausa[1] - pausa[0])) continue;
      const passado = ehHoje && t <= minAgora;
      const livre = passado ? null : candidatos.find((b) =>
        !ocupados.some((a) => a.barbeiroId === b && sobrepoe(t, duracao, toMin(a.hora), a.duracao)));
      out.push({ hora: toHHMM(t), barbeiroId: livre || null, passado });
    }
    return out;
  }

  function criar({ servicoId, barbeiroId, data, hora, nome, telefone, observacao }) {
    const s = servico(servicoId);
    // Revalida na hora de gravar, para evitar dois agendamentos no mesmo horário.
    const slot = horarios(data, barbeiroId, s.duracao).find((h) => h.hora === hora);
    if (!slot || !slot.barbeiroId) {
      return { erro: 'Esse horário acabou de ser ocupado. Escolha outro, por favor.' };
    }
    const ag = {
      id: gerarCodigo(),
      servicoId,
      servicoNome: s.nome,
      duracao: s.duracao,
      preco: s.preco,
      barbeiroId: slot.barbeiroId,
      data,
      hora,
      nome: nome.trim(),
      telefone: soDigitos(telefone),
      observacao: (observacao || '').trim(),
      status: 'confirmado',
      criadoEm: new Date().toISOString(),
    };
    salvarLista([...listar(), ag]);
    return { agendamento: ag };
  }

  function atualizarStatus(id, status) {
    salvarLista(listar().map((a) => (a.id === id ? { ...a, status } : a)));
  }

  function porTelefone(tel) {
    const d = soDigitos(tel);
    return listar().filter((a) => a.telefone === d);
  }

  const ordenar = (lista) => [...lista].sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));

  return {
    listar, criar, atualizarStatus, porTelefone, ordenar, horarios, aberto,
    toMin, toHHMM, dateKey, parseDate, formatBRL, formatData, soDigitos, servico, barbeiro,
  };
})();
