import { useState, useEffect } from 'react'
import { getSessions, getMessages, createSession, sendMessage, getLastMessageForSession } from '../utils/api'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { io } from "socket.io-client";

const socket = io('http://localhost:1337'); // Connect to the WebSocket server

function Chat() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [messages, setMessages] = useState([])
  const [currentSession, setCurrentSession] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // const messagesEndRef = useRef(null);
  // const scrollToBottom = () => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  // };

  useEffect(() => {
    loadSessions()

    // Listen for incoming messages
    socket.on('receiveMessage', (message) => {
      SendMsg(message);
      // scrollToBottom();
    });

    return () => {
      socket.off('receiveMessage'); // Clean up the listener on unmount
    };
  }, [])

  const loadSessions = async () => {
    try {
      const response = await getSessions(); 
      const sortedSessions = response.sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort sessions by createdAt
      
      
      // Update sessions with last message
      const sessionsWithLastMessage = await Promise.all(sortedSessions.map(async (session) => {
        let lastMessage = await getLastMessageForSession(session.documentId); // Call your function here
        if(lastMessage.data[0]==undefined){
          lastMessage="";
        }
        else{
          lastMessage=lastMessage.data[0];
        }
        return { ...session, lastMessage};
      }));
      

      setSessions(sessionsWithLastMessage) // Set sorted sessions
      const storedSessionId = localStorage.getItem('currentSessionId');
      
      if (storedSessionId) {
        const foundSession = sessionsWithLastMessage.find(session => session.id == storedSessionId);
        if (foundSession) {
          setCurrentSession(foundSession);
          loadMessages(foundSession.documentId);
        } else {
          // If the stored session is not found, default to the first session
          setCurrentSession(sessionsWithLastMessage[0]);
          loadMessages(sessionsWithLastMessage[0].documentId);
        }
      } else if (sessionsWithLastMessage.length > 0) {
        setCurrentSession(sessionsWithLastMessage[0]);
        loadMessages(sessionsWithLastMessage[0].documentId);
      }
    } catch (error) {
      toast.error('Failed to load sessions')
    }
  }
  
  const loadMessages = async (sessionId) => {
    try {
      const response = await getMessages(sessionId)
      setMessages(response.data.messages)

    } catch (error) {
      toast.error('Failed to load messages')
    }
  }

  const handleSessionClick = (session) => {
    setCurrentSession(session)
    loadMessages(session.documentId);
    localStorage.setItem('currentSessionId', session.id); // Store the session ID
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('currentSessionId')
    navigate('/login')
  }

  const CreateNewSession = async ()=>{
    try {
        const response = await createSession();
        const updatedSessions = [...sessions, response.data];
        const sortedSessions = updatedSessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort sessions by createdAt
        setSessions(sortedSessions) // Set sorted sessions
        setCurrentSession(response.data)
        loadMessages(response.data.documentId)
      } catch (error) {
        toast.error('Failed to create new session')
      }
    }

  const handleNewSession = () => {
    CreateNewSession();
  }

  const SendMsg = async (msg)=>{
    try {
        const response = await sendMessage(msg);
        setMessages((prevMessages) => [...prevMessages, response.data]);
      } catch (error) {
        toast.error('Failed to send message')
      }
  }

  const handleSendMessage = () => {
    if (!newMessage.trim()) {
      toast.error("Message can't be empty");
      return;
    }
    const message = { content: newMessage, type: 'sent', session: currentSession.documentId}; // Create message object
    SendMsg(message);
    socket.emit('sendMessage', message); // Send message to server
    setNewMessage(''); // Clear input
    setSessions((prevSessions) => {
      return prevSessions.map((session) => {
        if (session.id == currentSession.id) {
          return { ...session, lastMessage: message }; // Update last message
        }
        return session;
      });
    });
  };


  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSendMessage(); // Call the send message function
    }
  };

  const formatDate = (dateString) => {
    const options = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleString('en-GB', options); // Format date
  };

  return (
    <>

    <div className="flex h-screen relative">


      {/* Overlay (visible only when sidebar is open) */}
      {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}



          



        {/* <!-- Sidebar --> */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:static md:translate-x-0 md:w-1/4 min-w-64 h-screen overflow-y-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-stone-100 scrollbar-track-slate-300 scroll-auto`}>
        {/* md:w-2/6 */}
            <div className="flex items-center justify-evenly h-16 border-b px-4 ">
                <button
                  onClick={handleLogout}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 border rounded p-2 bg-blue-100"
                >
                  Logout
                </button>

                <button
                  onClick={handleNewSession}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 rounded p-2 bg-gray-200"
                >
                  Start New Session
                </button>
            </div>
            <div className="flex-1 overflow-y-auto">
                <div className="p-4">
                    <h2 className="text-2xl font-semibold mb-4">Chat Sessions</h2>
                    <div className="relative mb-4">
                        <input className="w-full p-2 border rounded" type="text" placeholder="Search" />
                        <i className="fas fa-search absolute right-3 top-3 text-gray-400"></i>
                    </div>
                    <div className="mb-4">
                        <span className="text-gray-500">Sort by</span>
                        <select className="ml-2 border rounded">
                            <option>Newest</option>
                        </select>
                    </div>
                    <div className="space-y-4">
                        {/* <!-- Contact List --> */}
                        {sessions.map((session) => (
                          <div
                            key={session.id}
                            onClick={() => handleSessionClick(session)}
                            className={`flex items-center p-2 rounded space-x-4 cursor-pointer hover:bg-gray-50 ${
                              currentSession?.id === session.id ? 'bg-gray-100' : ''
                            }`}
                          >
                            <img className="w-10 h-10 rounded-full" src="https://storage.googleapis.com/a1aa/image/VDITCKRe3FRJJapQ121lNyfXgMDDwfLZCbEY445YaTw3uzQoA.jpg" alt="John Doe's profile picture" width="40" height="40" />
                            <div className="flex-1 min-w-0">
                                <span className="block font-semibold truncate" title={formatDate(session.sessionName)}>Session {formatDate(session.sessionName)}</span>
                              <div className="flex justify-between items-center">
                                <span className="block text-gray-500 truncate max-w-[70%]"
                                  title={session.lastMessage ? session.lastMessage.content : ''}>
                                      {session.lastMessage ? session.lastMessage.content : ''}
                                </span>
                                <span className="text-gray-500 text-sm whitespace-nowrap">
                                {session.lastMessage? new Date(session.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                </span>
                              </div >
                            </div>
                          </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
        {/* <!-- Main Chat Area --> */}
        <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-start p-4 bg-white border-b">
                
                
                
                {/* Add toggle button */}
                <button
                  className="text-gray-500 md:hidden mr-10"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  ☰
                </button>
                
                
                
                
                
                <div className="flex items-center space-x-4">
                    <img className="w-10 h-10 rounded-full" src="https://storage.googleapis.com/a1aa/image/Q7U8GLyJPt7iIFk5JkqkKJ34Lamyd9ErhNgsSeDC1Cur7MEKA.jpg" alt="Travis Barker's profile picture" width="40" height="40" />
                    <div>
                        <h2 className="text-lg font-semibold">
                          {currentSession ? currentSession.sessionName : 'Select a session'}
                        </h2>
                        {/* <span className="text-green-500">Online</span> */}
                    </div>
                </div>
                <i className="fas fa-video text-gray-500"></i>
            </div>
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-stone-100 scrollbar-track-slate-300">
                <div className="space-y-4">
                    {/* <!-- Chat Messages --> */}
                        {messages.map((message)=>(
                            <div
                              key={message.id}
                              className={`flex  ${
                                message.type === 'sent' ? 'justify-end' : 'justify-start'
                              }`}
                              style={{
                                wordBreak: "break-word",
                                overflowWrap: "break-word",
                              }}
                            >
                                <div
                                    className={` p-2 rounded-lg max-w-[70%] ${
                                      message.type === 'sent'
                                        ? 'bg-green-100'
                                        : 'bg-gray-100'
                                    }`}
                                >
                                    <p className=" text-gray-800">{message.content}</p>
                                    <span className="text-gray-500 text-sm">
                                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}

                </div>
            </div>
            <div className="p-4 bg-white border-t flex items-center">
                <input 
                    className="flex-1 p-2 border rounded"
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message here..."
                />
                <button
                  onClick={handleSendMessage}
                  className="ml-4 text-green-500"
                >
                  Send
                </button>
            </div>
        </div>
    </div>










          

















    </>
  )
}

export default Chat
