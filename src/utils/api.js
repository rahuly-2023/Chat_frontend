const API_URL = import.meta.env.VITE_API_URL;
import toast from 'react-hot-toast'

export const login = async (identifier, password) => {
  const payload = { identifier, password };

  const response = await fetch(`${API_URL}/api/auth/local`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorResponse = await response.json(); // Get the error response
    throw new Error(`Network response was not ok: ${errorResponse.message}`);
  }

  return response.json();
};

export const register = async (username, email, password) => {
  const payload = { username, email, password };

  const response = await fetch(`${API_URL}/api/auth/local/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorResponse = await response.json(); // Get the error response
    throw new Error(`Network response was not ok: ${errorResponse.message}`);
  }

  return response.json();
};

export const getSessions = async () => {
  const token = localStorage.getItem('token'); // Retrieve the token
  const response = await fetch(`${API_URL}/api/users/me?populate=sessions`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`, // Include the token in the headers
    },
  });

  if (!response.ok) {
    const errorResponse = await response.json(); // Get the error response
    throw new Error(`Network response was not ok: ${errorResponse.error}`);
  }

  return response.json(); // Return the entire response object
};

export const getMessages = async (sessionId) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/api/sessions/${sessionId}?populate=messages`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`, // Include the token in the headers
    },
  });

  if (!response.ok) {
    const errorResponse = await response.json(); // Get the error response
    throw new Error(`Network response was not ok: ${errorResponse.message}`);
  }

  return response.json();
};

export const createSession = async () => {
  const UserId = JSON.parse(localStorage.getItem('user')).documentId;
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/api/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({"data":{"user":UserId, "sessionName":`Session - ${new Date().toLocaleString()}`}})
  });


  if (!response.ok) {
    const errorResponse = await response.json(); // Get the error response
    throw new Error(`Network response was not ok: ${errorResponse.message}`);
  }

  return response.json();
};









export const sendMessage = async (msg) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/api/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({"data":{"session":msg.session, "content":msg.content, type:msg.type}})
  });


  if (!response.ok) {
    const errorResponse = await response.json(); // Get the error response
    throw new Error(`Network response was not ok: ${errorResponse.message}`);
  }

  return response.json();
};








export const getLastMessageForSession = async(sessionId)=>{
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/api/messages?filters[session][documentId][$eq]=${sessionId}&sort=createdAt:desc&pagination[limit]=1`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  });


  if (!response.ok) {
    const errorResponse = await response.json(); // Get the error response
    throw new Error(`Network response was not ok: ${errorResponse.message}`);
  }
  return response.json();
}














export default { login, register, getSessions, getMessages ,createSession, sendMessage, getLastMessageForSession};
