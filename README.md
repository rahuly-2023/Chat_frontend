# Chat Frontend

This is the frontend of the chat application built using React and Vite. It offers real-time communication features and utilizes WebSocket for bi-directional messaging between server and the user.

## Features

- **Real-time messaging** using WebSockets
- **User authentication** and profile management
- **Chat history** to retrieve past conversations
- **Responsive UI** for smooth user experience on multiple devices

## Technologies Used

- **Frontend**: React, Vite, Tailwind CSS
- **Real-Time Communication**: WebSockets
- **Backend**: Strapi

## Setup Instructions

### Prerequisites

- Node.js (v16 or above)
- npm (or Yarn)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/rahuly-2023/Chat_frontend.git

2. Navigate into the project directory:

   ```bash
   cd Chat_frontend
   
3. Install the dependencies:

   ```bash
   npm install

5. Create a .env file in the root of the project and add the backend Endpoint:

   ```bash
   VITE_API_URL=<Backend_URL>
   
7. Start the development server:

   ```bash
   npm run dev
