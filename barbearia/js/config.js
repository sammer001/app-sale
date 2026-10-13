// Configuração da barbearia — edite aqui nome, horários, serviços e barbeiros.
const CONFIG = {
  nome: 'Navalha & Cia',
  slogan: 'Barbearia clássica, atendimento sem pressa.',
  endereco: 'Rua das Tesouras, 123 — Centro',
  telefoneExibicao: '(11) 99999-9999',
  whatsapp: '5511999999999', // DDI + DDD + número, só dígitos
  adminPin: '1234',          // PIN do painel (proteção apenas de fachada, ver README)

  intervaloMin: 30,          // de quanto em quanto tempo começam os horários
  diasAntecedencia: 21,      // até quantos dias à frente é possível agendar

  // 0 = domingo ... 6 = sábado. null = fechado.
  horarios: {
    0: null,
    1: null,
    2: ['09:00', '19:00'],
    3: ['09:00', '19:00'],
    4: ['09:00', '19:00'],
    5: ['09:00', '20:00'],
    6: ['08:00', '17:00'],
  },
  pausa: ['12:00', '13:00'], // almoço; use null para não ter pausa

  servicos: [
    { id: 'corte',       nome: 'Corte',               descricao: 'Tesoura ou máquina, lavagem e finalização.', duracao: 30, preco: 45 },
    { id: 'barba',       nome: 'Barba',               descricao: 'Toalha quente, navalha e hidratação.',        duracao: 30, preco: 35 },
    { id: 'combo',       nome: 'Corte + Barba',       descricao: 'O pacote completo.',                           duracao: 60, preco: 70 },
    { id: 'degrade',     nome: 'Degradê navalhado',   descricao: 'Fade com acabamento na navalha.',              duracao: 60, preco: 55 },
    { id: 'sobrancelha', nome: 'Sobrancelha',         descricao: 'Limpeza e alinhamento na navalha.',            duracao: 30, preco: 20 },
    { id: 'pigmentacao', nome: 'Pigmentação de barba', descricao: 'Preenche falhas e uniformiza a cor.',         duracao: 60, preco: 60 },
  ],

  barbeiros: [
    { id: 'rafael', nome: 'Rafael', especialidade: 'Cortes clássicos e tesoura' },
    { id: 'diego',  nome: 'Diego',  especialidade: 'Degradê e desenhos' },
    { id: 'bruno',  nome: 'Bruno',  especialidade: 'Barba e navalha' },
  ],
};
