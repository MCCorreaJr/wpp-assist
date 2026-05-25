function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
    .format(Number(value || 0))
    .replace(/\u00a0/g, ' ');
}

module.exports = {
  formatBRL,
};
