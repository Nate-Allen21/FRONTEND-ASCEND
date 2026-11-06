const missions = [
  { id: 'study', title: 'Revisão de matemática', description: 'Revise um capítulo.', type: 'estudo', experienceReward: 25, coinReward: 15, actionable: true, cadence: 'DAILY' },
  { id: 'training', title: 'Treino de força', description: 'Complete seu treino.', type: 'treino', experienceReward: 30, coinReward: 20, actionable: true, cadence: 'DAILY' },
];

function installApiInterception() {
  let completed = ['training'];
  const status = () => ({
    name: 'Hunter Cypress',
    handle: '@hunter',
    level: 3,
    rank: 'E',
    experience: 250,
    nextLevelExperience: 500,
    streakDays: 4,
    coins: 300,
    stats: [],
    dailyMissions: missions,
    completedMissionIds: completed,
  });

  cy.intercept('**/api/**', (request) => {
    const path = new URL(request.url).pathname;
    let body = {};

    if (path.endsWith('/health')) body = { status: 'UP', application: 'ascend-api' };
    else if (path.endsWith('/auth/login')) body = { token: 'cypress-test-token' };
    else if (path.endsWith('/complete')) {
      completed = ['training', 'study'];
      body = status();
    } else if (path.endsWith('/player/status')) body = status();
    else if (path.endsWith('/planner')) {
      body = {
        headline: 'Seu plano de evolução',
        summary: 'Um passo por dia.',
        insights: [],
        dailyMissions: missions,
        weeklyMissions: [],
        monthlyMissions: [],
        completedMissionIds: completed,
      };
    } else if (path.endsWith('/shop')) body = { coins: 300, purchases: [], offers: [] };
    else if (path.endsWith('/ranking')) body = { players: [] };
    else if (path.endsWith('/ai/chat')) body = { reply: 'Comece com uma missão de estudo.', provider: 'local' };

    request.reply({ statusCode: 200, body });
  });
}

describe('ASCEND browser flows', () => {
  beforeEach(installApiInterception);

  it('authenticates and opens the player dashboard', () => {
    cy.visit('/');
    cy.get('#login-email').type('hunter@example.com');
    cy.get('#login-password').type('test-password');
    cy.get('#login-form button[type=submit]').click();

    cy.get('.evolution-hero').should('be.visible');
    cy.get('#daily-progress-label').should('have.text', '1/2 missões concluídas');
    cy.screenshot('cypress-dashboard');
  });

  it('filters missions and confirms completion', () => {
    cy.visit('/', {
      onBeforeLoad(window) {
        window.localStorage.setItem('ascend.auth.token.2026-04-27-reset-1', 'cypress-test-token');
      },
    });

    cy.get('[data-navigate=missions]').click();
    cy.get('#mission-search').type('revisao');
    cy.get('#missions-list .mission-card:visible').should('have.length', 1);
    cy.get('#mission-search').clear().type('not-found');
    cy.get('#mission-empty').should('be.visible');
    cy.get('#mission-clear').click();
    cy.get('#mission-filter').select('pending');
    cy.get('#missions-list .mission-card:visible button').click();
    cy.get('#mission-results').should('have.text', '0 de 2 missões · 2 concluídas');
  });
});
