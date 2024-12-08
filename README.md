# 🇺🇸 Civenro (Frontend)

**Civenro** is a community-driven platform that enhances transparency and civic engagement in the legislative process. This repository now contains only the **frontend** code, providing the user interface and client-side logic. The backend code and data fetching logic have been moved to a separate repository, ensuring clear separation of concerns and easier independent development.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Government Bills Feed:** Explore a continuously updated feed of current bills with summaries and statuses.
- **User Voting:** Cast votes (For, Against, or Abstain) on each bill and see aggregate public opinion.
- **Comment Discussions:** Engage in threaded comment discussions to deliberate on legislation.
- **Representative Votes:** See how senators voted on each bill to foster accountability.
- **Personalized Experience:** Input your state to highlight relevant senators and bills affecting your region.

## Tech Stack

### Frontend

- **React.js** with **TypeScript**
- **Material-UI (MUI)** for responsive UI components
- **React Router** for client-side routing
- **Axios** for API requests to the backend

**Note:** The backend services and database are now in [civenro-backend](https://github.com/liamitus/civenro-backend) repository. Please refer to that repository for backend-specific details.

### Deployment

- **Frontend:** Deployed on Vercel for rapid iteration and continuous deployment.
- **Backend:** For backend deployment details, see the [civenro-backend](https://github.com/liamitus/civenro-backend) repository.

## Installation

### Prerequisites

- **Node.js** and **npm** installed
- **Git** installed

### Clone the Repository

```bash
git clone https://github.com/liamitus/civenro.git
cd civenro
```

### Install Dependencies

```bash
npm install
```

## Usage

1. Run the Development Server:

   ```bash
   npm start
   ```

   The app will be available at http://localhost:3000.

2. Connect to the Backend:

   - Ensure the backend is running separately. Refer to [civenro-backend](https://github.com/liamitus/civenro-backend) for instructions.
   - Update environment variables or .env files as needed to point the frontend to the backend API URL.

Follow the [civenro-backend README](https://github.com/liamitus/civenro-backend)

## Contributing

We welcome community contributions! To get started:

1. **Fork the Repository**
2. **Create a Feature Branch**

```bash
git checkout -b feature/YourFeature
```

3. **Commit Your Changes**

```bash
git commit -m "Add some feature"
```

4. **Push to the Branch**

```bash
git push origin feature/YourFeature
```

5. **Open a Pull Request**

Please ensure your code adheres to the project's coding standards and includes relevant tests.

## License

This project is licensed under the [MIT License](LICENSE).
