// cypress/e2e/homepage.spec.ts

describe('Home Page', () => {
  it('loads and displays expected content', () => {
    cy.visit('/');
    cy.contains('Home').should('be.visible');
  });

  it('displays a list of bills', () => {
    // Ensure your front page displays bills fetched from the backend
    // Add data-testid attributes to elements for reliable selectors.
    cy.get('[data-testid="bill-card"]').should('have.length.greaterThan', 0);
  });
});
