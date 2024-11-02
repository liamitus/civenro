# VoxPup

VoxPup is a community-driven platform designed to enhance transparency and civic engagement in the legislative process. Modeled after Reddit, VoxPup allows users to browse government bills, vote on them, and participate in discussions, all while providing insights into how their elected representatives have voted.

## **Table of Contents**

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## **Features**

- **Senate Bills Feed:** Browse a continuously updated feed of current Senate bills with summaries and statuses.
- **User Voting:** Cast your vote on each bill—For, Against, or Abstain—and see aggregate user opinions.
- **Discussion Forums:** Engage in conversations with other users through threaded comments and discussions.
- **Senator Vote Tracking:** View detailed voting records of your senators on each bill, promoting accountability.
- **Personalized Experience:** Input your state to highlight relevant senators and bills affecting your region.

## **Tech Stack**

### **Front-End**

- **React.js** with **TypeScript**: For building a dynamic and type-safe user interface.
- **Material-UI (MUI)**: Utilized for pre-built, responsive UI components.
- **React Router**: Manages client-side routing and navigation.
- **Axios**: Handles HTTP requests to the back-end API.

### **Back-End**

- **Node.js** with **Express.js** and **TypeScript**: Serves as the foundation for the server-side application.
- **Prisma ORM**: Simplifies database interactions with a type-safe ORM.
- **PostgreSQL**: Robust relational database for storing user data, bills, votes, and comments.
- **GovTrack.us API**: Integrates official government data for bills and voting records.

### **Deployment**

- **Front-End:** Deployed on **Vercel** for seamless integration and continuous deployment.
- **Back-End:** Hosted on **Heroku**, providing easy scalability and management.
- **Database:** **Heroku Postgres** for reliable and scalable database hosting.

## **Installation**

### **Prerequisites**

- **Node.js** and **npm** installed
- **Git** installed
- **PostgreSQL** database setup
- **GitHub** account for version control

### **Clone the Repository**

```bash
git clone https://github.com/yourusername/voxpup.git
cd voxpup
```

### **Front-End Setup**

```bash
cd frontend
npm install
npm start
```

### **Back-End Setup**

```bash
cd backend
npm install
# Set up environment variables in a .env file
npx prisma migrate dev --name init
npm run dev
```

## **Usage**

1. **Explore Bills:** Visit the home feed to see the latest Senate bills.
2. **Vote:** Cast your vote on any bill and see how others have voted.
3. **Discuss:** Join conversations by commenting on bills.
4. **Track Senators:** Input your state to view how your senators have voted on each bill.

## **Contributing**

We welcome contributions from the community! To get started:

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

## **License**

This project is licensed under the [MIT License](LICENSE).
