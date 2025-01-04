// cypress/e2e/homepage.cy.ts

describe('Home Page', () => {
  beforeEach(() => {
    cy.intercept(
      { method: 'GET', url: '/api/bills*', middleware: true },
      (req) => {
        req.on('before:response', (res) => {
          res.headers['cache-control'] = 'no-store';
        });
      }
    ).as('getBills');
  });

  it('loads and displays expected content', () => {
    cy.visit('/');
    cy.contains(/bills/i).should('be.visible');
  });

  it('displays a list of bills', () => {
    cy.visit('/');
    // Wait for that single request
    cy.wait('@getBills').then((interception) => {
      // Ensure the response is correct
      expect(interception.response?.statusCode).to.eq(200);
      expect(interception.response?.body).to.have.property('bills');
      expect(interception.response?.body.bills).to.have.length.above(0);
    });

    // Check that the UI renders at least one bill card
    cy.get('[data-testid="bill-card"]', { timeout: 10000 }).should(
      'have.length.greaterThan',
      0
    );
  });
});
