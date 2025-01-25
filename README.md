
# Chat Frontend
This is the frontend of the chat application built using React and Vite. It offers real-time communication features and utilizes WebSocket for bi-directional messaging between server and the user.
## Features

- Real-time messaging using WebSockets
- User authentication and profile management
- Chat history to retrieve past conversations
- Responsive UI for smooth user experience on multiple devices <br/> <br/>


## Tech Stack

**Client:** React, Vite, Tailwind CSS

**Server:** Strapi

**Real-Time Communication:** WebSockets  <br/> <br/>



## Installation

Clone the project

```bash
  git clone https://github.com/rahuly-2023/Chat_frontend.git
```

Go to the project directory

```bash
  cd Chat_frontend
```

Install dependencies

```bash
  npm install
```

Start the server

```bash
  npm run dev
```
    
## Environment Variables

To run this project, you will need to add the following environment variables to your .env file

`VITE_API_URL` <br/> <br/>



## API Reference

### Authentication APIs

#### Login

```http
  POST /api/auth/local
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `identifier` | `string` | **Required**. User identifier |
| `password` | `string` | **Required**. User password |


#### Register

```http
  POST /api/auth/local/register
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `username` | `string` | **Required**. User username |
| `email` | `string` | **Required**. User email |
| `password` | `string` | **Required**. User password |










### Session Management APIs

#### Get Sessions

```http
  GET /api/user/me?populate=sessions
```

| Header | Value     | Description                |
| :-------- | :------- | :------------------------- |
| `Authorization` | `Bearer token` | **Required**. User access token |

#### Create Sessions

```http
  POST /api/sessions
```

| Header | Value     | Description                |
| :-------- | :------- | :------------------------- |
| `Authorization` | `Bearer token` | **Required**. User access token |

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `user` | `string` | **Required**. User ID |
| `sessionName` | `string` | **Optional**. Custom name for session |













### Messaging APIs

#### Get Messages

```http
  GET /api/sessions/${sessionId}?populate=messages
```

| Header | Value     | Description                |
| :-------- | :------- | :------------------------- |
| `Authorization` | `Bearer token` | **Required**. User access token |


#### Send Message

```http
  POST /api/messages
```

| Header | Value     | Description                |
| :-------- | :------- | :------------------------- |
| `Authorization` | `Bearer token` | **Required**. User access token |

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `session` | `string` | **Required**. Session ID |
| `content` | `string` | **Required**. Message content |
| `type` | `string` | **Optional**. Message type (sent, received) |


#### Get Last Message for Session

```http
  GET /api/messages?filters[session][documentId][$eq]=${sessionId}&sort=createdAt:desc&pagination[limit]=1

```

| Header | Value     | Description                |
| :-------- | :------- | :------------------------- |
| `Authorization` | `Bearer token` | **Required**. User access token |
