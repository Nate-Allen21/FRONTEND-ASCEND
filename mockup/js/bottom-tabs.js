(() => {
  const desktopNavigation = document.querySelector('.sidebar');
  if (!desktopNavigation) return;

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const activePage = currentPage === 'cadastro.html'
    ? 'index.html'
    : currentPage === 'level-up.html'
      ? 'dashboard.html'
      : currentPage;
  const iconsByPage = {
    'dashboard.html': 'bi-house-door',
    'missoes.html': 'bi-heart',
    'progresso.html': 'bi-grid-3x3-gap',
    'personagem.html': 'bi-person-vcard',
    'index.html': 'bi-person'
  };
  const navigationByPage = new Map(
    [...desktopNavigation.querySelectorAll('.nav-link')]
      .map((link) => [link.getAttribute('href'), link])
  );
  const tabOrder = ['dashboard.html', 'missoes.html', 'progresso.html', 'personagem.html', 'index.html'];

  const tabBar = document.createElement('nav');
  tabBar.className = 'bottom-tab-bar';
  tabBar.setAttribute('aria-label', 'Navegacao principal');

  tabOrder.forEach((destination) => {
    const sourceLink = navigationByPage.get(destination);
    if (!sourceLink) return;

    const label = sourceLink.textContent.trim();
    const link = document.createElement('a');
    link.className = 'bottom-tab';
    link.href = destination;
    link.setAttribute('aria-label', label);
    link.title = label;

    if (destination === activePage) {
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'page');
    }

    const icon = document.createElement('i');
    icon.className = 'bi ' + (iconsByPage[destination] || 'bi-circle');
    icon.setAttribute('aria-hidden', 'true');

    const accessibleLabel = document.createElement('span');
    accessibleLabel.className = 'visually-hidden';
    accessibleLabel.textContent = label;
    link.append(icon, accessibleLabel);
    tabBar.appendChild(link);
  });

  document.body.appendChild(tabBar);
})();
