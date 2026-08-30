const AVITO_CATEGORIES = [
  {
    key: 'washing',
    label: 'Стиральные, сушильные машины',
    match: /стирал|стиральн|сушильн/i
  },
  {
    key: 'fridge',
    label: 'Холодильники, морозильные камеры',
    match: /холодиль|морозиль|морозил/i
  },
  {
    key: 'dishwasher',
    label: 'Посудомоечные машины',
    match: /посудомо/i
  }
];

function inferAvitoCategoryKey(service) {
  const template = service.template || {};
  const haystack = `${service.name || ''} ${template.title || ''}`;
  const found = AVITO_CATEGORIES.find((category) => category.match.test(haystack));
  return found ? found.key : AVITO_CATEGORIES[0].key;
}

function getAvitoCategoryKey(service) {
  return service.avitoCategoryKey || inferAvitoCategoryKey(service);
}
