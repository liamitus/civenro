// cypress/e2e/auth.cy.ts

const seedEmail = 'seed@example.com';
const seedUsername = 'seeduser';
const seedPassword = 'password';
const tokenKey = 'token';

describe('Auth Tests', () => {
  beforeEach(() => {
    cy.intercept(
      { method: 'POST', url: '/api/auth/*', middleware: true },
      (req) => {
        req.on('before:response', (res) => {
          res.headers['cache-control'] = 'no-store';
        });
      }
    ).as('authRequest');
    cy.clearLocalStorage();
  });

  it('allows a user to register', () => {
    // Randomize the email and username to avoid conflicts
    const randomEmail = Math.random().toString(36).substring(7);
    const randomUsername = Math.random().toString(36).substring(7);
    cy.visit('/');
    cy.get('[data-testid="register-button"]').click();
    cy.get('[data-testid="register-username"]').type(randomUsername);
    cy.get('[data-testid="register-email"]').type(randomEmail);
    cy.get('[data-testid="register-password"]').type(seedPassword);
    cy.get('[data-testid="register-submit"]').click();
    cy.wait('@authRequest').then((interception) => {
      expect(interception.request.url).to.contain('/auth/register');
      expect(interception.response?.statusCode).to.eq(201);
    });
    cy.wait('@authRequest').then((interception) => {
      expect(interception.request.url).to.contain('/auth/login');
      expect(interception.response?.statusCode).to.eq(200);
      expect(localStorage.getItem(tokenKey)).to.exist;
    });
  });

  it('allows a user to log in', () => {
    cy.visit('/');
    cy.get('[data-testid="login-button"]').click();
    cy.get('[data-testid="login-email"]').type(seedEmail);
    cy.get('[data-testid="login-password"]').type(seedPassword);
    cy.get('[data-testid="login-submit"]').click();
    cy.wait('@authRequest').then((interception) => {
      expect(interception.response?.statusCode).to.eq(200);
      expect(localStorage.getItem(tokenKey)).to.exist;
    });
    cy.get('[data-testid="logout-button"]').should('be.visible');
  });

  it('shows an error when login fails', () => {
    cy.visit('/');
    cy.get('[data-testid="login-button"]').click();
    cy.get('[data-testid="login-email"]').type('invalid@example.com');
    cy.get('[data-testid="login-password"]').type('wrongpassword');
    cy.get('[data-testid="login-submit"]').click();
    cy.wait('@authRequest').then((interception) => {
      expect(interception.response?.statusCode).to.not.eq(200);
    });
    cy.contains('Invalid email or password').should('be.visible');
  });

  it('allows a user to log out', () => {
    // Ensure the user is logged in first
    cy.visit('/');
    cy.get('[data-testid="login-button"]').click();
    cy.get('[data-testid="login-email"]').type(seedEmail);
    cy.get('[data-testid="login-password"]').type(seedPassword);
    cy.get('[data-testid="login-submit"]').click();
    cy.wait('@authRequest').then((interception) => {
      expect(interception.response?.statusCode).to.eq(200);
      expect(localStorage.getItem(tokenKey)).to.exist;
    });

    // Now log out
    cy.get('[data-testid="logout-button"]').should('be.visible').click();
    expect(localStorage.getItem(tokenKey)).to.be.null;
  });
});
