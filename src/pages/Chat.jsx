import { useState, useEffect, useRef } from 'react'
import { getSessions, getMessages, createSession, sendMessage, getLastMessageForSession } from '../utils/api'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { io } from "socket.io-client";

const socket = io(`${import.meta.env.VITE_API_URL}`); // Connect to the WebSocket server

function Chat() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [messages, setMessages] = useState([])
  const [currentSession, setCurrentSession] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState('newest');
  
  const [Sessionloading, setSessionLoading] = useState(false); // Loading state
  const [Msgloading, setMsgLoading] = useState(false); // Loading state
  const [buttonLoading, setButtonLoading] = useState(false); // Button-specific loading state
  const [SendingbuttonLoading, setSendingButtonLoading] = useState(false); // Button-specific loading state
  const [scrollBehavior, setScrollBehavior] = useState('auto');
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [ServerTyping, setServerTyping] = useState(false);
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);


  // Detect scroll position in the chat container
  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setIsScrolledUp(!isAtBottom); // Show the button if not at the bottom
    }
  };



  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: scrollBehavior });   //auto, smooth
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  

  useEffect(() => {
    loadSessionsFromCache()

    // Listen for incoming messages
    socket.on('receiveMessage', (message) => {
        SendMsg(message);
    });

    return () => {
      socket.off('receiveMessage'); // Clean up the listener on unmount
    };
  }, [])

  const loadSessions = async () => {
    setSessionLoading(true);
    try {
      const response = await getSessions(); 
      // const sortedSessions = response.sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort sessions by createdAt
      
      
      // Update sessions with last message
      if(response.sessions){
        let sessionsWithLastMessage = await Promise.all(response.sessions.map(async (session) => {
          let lastMessage = await getLastMessageForSession(session.documentId); // Call your function here
          if(lastMessage.data[0]==undefined){
            lastMessage="";
          }
          else{
            lastMessage=lastMessage.data[0];
          }
          return { ...session, lastMessage};
        }));
        
        // Sort sessions based on `sortOrder`
        sessionsWithLastMessage = sortSessions(sessionsWithLastMessage, sortOrder);
  
        setSessions(sessionsWithLastMessage) // Set sorted sessions
        
        // Cache sessions in localStorage
        localStorage.setItem("sessions", JSON.stringify(sessionsWithLastMessage));

        
        
        
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
            localStorage.setItem("currentSession",JSON.stringify(sessionsWithLastMessage[0]))
          }
        } else if (sessionsWithLastMessage.length > 0) {
          setCurrentSession(sessionsWithLastMessage[0]);
          loadMessages(sessionsWithLastMessage[0].documentId);
        }
      }
      else{
        toast.success('No active session')
      }
    } catch (error) {
      toast.error('Failed to load sessions')
    } finally {
      setSessionLoading(false); // Stop loading
    }
    
  }
  
  const loadMessages = async (sessionId) => {
    setMsgLoading(true); // Start loading
    try {
      const cachedMessages = localStorage.getItem(`messages-${sessionId}`);
      if (cachedMessages) {
        setMessages(JSON.parse(cachedMessages));
        setScrollBehavior("auto");
      } else {

        const response = await getMessages(sessionId)
        setMessages(response.data.messages)
        setScrollBehavior('auto');
        localStorage.setItem(`messages-${sessionId}`, JSON.stringify(response.data.messages));
      }
      
    } catch (error) {
      toast.error('Failed to load messages')
    } finally {
      setMsgLoading(false); // Stop loading
    }
  }

  const handleSessionClick = (session) => {
    let CurrentSessionId=localStorage.getItem('currentSessionId');
    if(CurrentSessionId!=session.id){
      setScrollBehavior('auto');
      setCurrentSession(session);
      loadMessages(session.documentId);
      localStorage.setItem("currentSession",JSON.stringify(session))
      localStorage.setItem('currentSessionId', session.id);
    }
    setSidebarOpen(false)
  }


  const clearMessagesCache = () => {
    sessions.forEach((session) => {
      localStorage.removeItem(`messages-${session.documentId}`);
    });
  };

  const handleLogout = () => {
    clearMessagesCache();
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('currentSessionId')
    localStorage.removeItem("sessions")
    localStorage.removeItem("currentSession")
    navigate('/login')
  }

  const sortSessions = (sessions, order) => {
    return sessions.sort((a, b) => {
      if (order === 'newest') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      } else if (order === 'oldest') {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }
      return 0;
    });
  };
  

  const CreateNewSession = async ()=>{
    setButtonLoading(true); // Start button loading
    try {
      const response = await createSession();
        const updatedSessions = [...sessions, response.data];
        const sortedSessions = updatedSessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort sessions by createdAt
        setSessions(sortedSessions) // Set sorted sessions
        localStorage.setItem("currentSession",JSON.stringify(response.data))
        setCurrentSession(response.data)
        loadMessages(response.data.documentId)
        localStorage.setItem('currentSessionId', response.data.id);
      } catch (error) {
        console.error(error);
        toast.error('Failed to create new session')
      } finally {
        setButtonLoading(false); // Stop button loading
      }
    }

  const handleNewSession = () => {
    CreateNewSession();
  }

  const SendMsg = async (msg)=>{
    try {
        const response = await sendMessage(msg);
        setMessages((prevMessages) => [...prevMessages, response.data]);
        const currentSession=localStorage.getItem('currentSession');

        const CurrentSessionDocumentId=JSON.parse(currentSession).documentId;
        const currentSessionMsg= JSON.parse(localStorage.getItem(`messages-${CurrentSessionDocumentId}`));
        const updatedMessages = [...currentSessionMsg, response.data];
        localStorage.setItem(`messages-${CurrentSessionDocumentId}`, JSON.stringify(updatedMessages));


        let CurrentSessionID=localStorage.getItem("currentSessionId");

        let updatedsessionWithLastMessage=JSON.parse(localStorage.getItem('sessions'));
        updatedsessionWithLastMessage = updatedsessionWithLastMessage.map((session)=>{
            if (session.id == CurrentSessionID) {
              return { ...session, lastMessage: response.data }; // Update last message
            }
            return session;
        })
        
        localStorage.setItem('sessions',JSON.stringify(updatedsessionWithLastMessage));


        setSessions((prevSessions) => {
          return prevSessions.map((session) => {
            if (session.id == CurrentSessionID) {
              return { ...session, lastMessage: response.data }; // Update last message
            }
            return session;
          });
        });
      } catch (error) {
        toast.error('Failed to send message')
      }
      finally{
        setServerTyping(false);
      }
  }

  const  handleSendMessage = async () => {
    setSendingButtonLoading(true);
    if (!newMessage.trim()) {
      toast.error("Message can't be empty");
      setSendingButtonLoading(false);
      return;
    }
    const message = { content: newMessage, type: 'sent', session: currentSession.documentId}; // Create message object
    setScrollBehavior('smooth');
    // setMessages((prevMessages) => [...prevMessages, message]);
    await SendMsg(message);
    setNewMessage(''); // Clear input
    try{
      setServerTyping(true);
      socket.emit('sendMessage', message); // Send message to server
    }
    catch{
      toast.error("Uh Oh! Server is sleeping. Failed to send message")
    } finally{
      setSendingButtonLoading(false);
    }
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









  const loadSessionsFromCache = async () => {
    const cachedSessions = localStorage.getItem("sessions");
    if (cachedSessions) {
      const parsedSessions = JSON.parse(cachedSessions);
      setSessions(parsedSessions);
  
      const storedSessionId = localStorage.getItem("currentSessionId");
      const foundSession = parsedSessions.find(session => session.id == storedSessionId);
      setCurrentSession(foundSession || parsedSessions[0]);
  
      if (foundSession || parsedSessions.length > 0) {
        loadMessages((foundSession || parsedSessions[0]).documentId);
      }
    } else {
      await loadSessions(); // Fallback to API call if no cache
    }
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
        <div className={`flex flex-col fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:static md:translate-x-0 md:w-1/4 min-w-64 h-screen `}>
        {/* md:w-2/6 */}
            
            
            <div className=" flex items-center justify-evenly gap-2 h-16 border-b px-4 ">
                
                {sidebarOpen && 
                  <button
                    className="pt-0 mt-2 text-gray-500 md:hidden content-center text-2xl"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                  >
                    ☰
                  </button>
                }
                
                
                
                <button
                  onClick={handleLogout}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 border rounded p-2 bg-blue-100"
                >
                  Logout
                </button>

                <button
                  // className="mt-2 text-sm text-blue-600 hover:text-blue-800 rounded p-2 bg-gray-200"
                  onClick={handleNewSession}
                  className={` flex-none mt-2 text-sm text-blue-600 hover:text-blue-800 rounded p-2 bg-gray-200 flex items-center ${
                    buttonLoading ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                  disabled={buttonLoading} // Disable the button while loading
                >
                  {buttonLoading && (
                    <svg
                      className="animate-spin h-4 w-4 mr-2 text-blue-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291l1.707-1.707L6 14l-4 4 4 4 1.707-1.707L6 18.293z"
                      ></path>
                    </svg>
                  )}
                  New Session
                </button>
            </div>



            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-stone-100 scrollbar-track-slate-300 scroll-auto">
                <div className="p-4">
                    <h2 className="text-2xl font-semibold mb-4 text-center">Chat Sessions</h2>
                    <div className="mb-4 flex gap-2 justify-center align-middle items-center">
                        <div className="text-gray-500 flex-none ">Sort by</div>

                        <div className="relative w-32 h-8 bg-gray-200 rounded-full overflow-hidden">
                          {/* Sliding Background */}
                          <div
                            className={`absolute top-0 h-full w-1/2 bg-blue-500 rounded-full transform transition-transform duration-300 ${
                              sortOrder === "newest" ? "translate-x-0" : "translate-x-full"
                            }`}
                          ></div>

                          {/* Buttons */}
                          <div className="relative z-10 flex items-center justify-between h-full text-sm font-medium text-gray-700">
                            <button
                              className={`w-1/2 h-full ${
                                sortOrder === "newest" ? "text-white" : "text-gray-700"
                              }`}
                              onClick={() => {
                                setSortOrder('newest')
                                setSessions(sortSessions([...sessions], 'newest'));
                              }}
                            >
                              Newest
                            </button>
                            <button
                              className={`w-1/2 h-full ${
                                sortOrder === "oldest" ? "text-white" : "text-gray-700"
                              }`}
                              onClick={() => {
                                setSortOrder('oldest');
                                setSessions(sortSessions([...sessions], 'oldest'));
                              }}
                            >
                              Oldest
                            </button>
                          </div>
                        </div>






                    </div>














                    



                          



                  {Sessionloading ? (
                    <div className="flex justify-center items-center h-16">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600"></div>
                    </div>
                  ) : (

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
                            <img className="w-10 h-10 rounded-full" src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQXGY9PJvj1zV3UIDnLBY_fDh9SpEByAUjg5w&s" alt="John Doe's profile picture" width="40" height="40" />
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
                  )}
                </div>
            </div>
        </div>





        {/* <!-- Main Chat Area --> */}
        <div className="relative flex-1 flex flex-col">
            
            
            <div className=" flex items-center justify-start p-3 bg-white border-b">
                
                
                
                {/* Add toggle button */}
                <button
                  className=" text-2xl text-gray-500 md:hidden mr-2"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  ☰
                </button>
                
                
                
                
                
                <div className="flex items-center space-x-4">
                    <img className="w-10 h-10 rounded-full" src="https://i.pinimg.com/736x/45/fc/04/45fc047a4d037ea0e090b341a46ff4e9.jpg" alt="Travis Barker's profile picture" width="40" height="40" />
                    <div className='flex flex-col'>
                      <div>
                          <h2 className="text-lg font-semibold">
                            {currentSession ? currentSession.sessionName : 'Select a session'}
                          </h2>
                      </div>
                      {ServerTyping ? 


                      <div className='flex flex-row gap-0.5 justify-start'>
                        <div className="text-green-500">
                          Typing
                        </div>

                        <div className='flex space-x-1 justify-center items-end bg-white mb-0.5'>
                          {/* <span class='sr-only'>Loading...</span> */}
                          <div class='h-1 w-1 text-green-500 bg-green-500 rounded-full animate-bounce [animation-delay:-0.3s]'></div>
                          <div class='h-1 w-1 text-green-500 bg-green-500 rounded-full animate-bounce [animation-delay:-0.15s]'></div>
                          <div class='h-1 w-1 text-green-500 bg-green-500 rounded-full animate-bounce'></div>
                        </div>
                          
                      </div>


                        : <div className="text-green-500 flex-none">Online</div>
                      }
                    </div>
                </div>


          

            </div>



            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-stone-100 scrollbar-track-slate-300"
              ref={chatContainerRef}
              onScroll={handleScroll} 
            >


                    



                <div className="relative space-y-4">
                    {/* <!-- Chat Messages --> */}


                    {Msgloading ? (
                      <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-600"></div>
                      </div>
                    ) : (
                      <>

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
                      </>)}

                      
                </div>

                <div ref={messagesEndRef} />
          

          {/* "Scroll to Bottom" Arrow */}
        {isScrolledUp && (
          <div
            onClick={() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }}
            title="scroll to bottom"
            className="absolute top-20 left-1/2 transform -translate-x-1/2 cursor-pointer flex items-center justify-center bg-slate-300  text-blue-500 w-8 h-8 rounded-full shadow-lg border hover:bg-blue-600 hover:text-slate-300 transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        )}
          
          

            </div>


            <div className="p-4 bg-white border-t flex items-center gap-4">
                <input 
                    className="flex-1 p-2 border rounded"
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message here..."
                />
                {/* <button
                  onClick={handleSendMessage}
                  className="ml-4 text-green-500"
                >
                  Send
                </button> */}


                <button
                  // className="mt-2 text-sm text-blue-600 hover:text-blue-800 rounded p-2 bg-gray-200"
                  onClick={handleSendMessage}
                  className={`mr-1 h-11 flex-none green-500 content-center align-middle text-sm text-blue-600 hover:text-blue-800 rounded p-2 bg-gray-200 flex items-center ${
                    SendingbuttonLoading ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                  disabled={SendingbuttonLoading} // Disable the button while loading
                >
                  {SendingbuttonLoading ? (
                    <svg
                      className="animate-spin h-4 w-4 mr-2 ml-2 text-blue-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291l1.707-1.707L6 14l-4 4 4 4 1.707-1.707L6 18.293z"
                      ></path>
                    </svg>
                  ): 

                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                    </svg>
                  
                  }

                </button>
            </div>
            
        </div>
    </div>
    </>
  )
}

export default Chat
