'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp,
  DocumentData 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { PaperAirplaneIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  text: string;
  sender: string;
  senderName: string;
  timestamp: any;
  groupId: string;
}

interface GroupChatProps {
  groupId: string;
  groupName: string;
}

export default function GroupChat({ groupId, groupName }: GroupChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { user, userData } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Scroll to the bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (!user || !isOpen) return;

    // Query the messages for this group
    const messagesQuery = query(
      collection(db, 'messages'),
      where('groupId', '==', groupId),
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const newMessages: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        newMessages.push({
          id: doc.id,
          text: data.text,
          sender: data.sender,
          senderName: data.senderName,
          timestamp: data.timestamp,
          groupId: data.groupId
        });
      });
      setMessages(newMessages);
      setIsLoading(false);
    });

    // Cleanup on unmount
    return () => unsubscribe();
  }, [groupId, user, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !newMessage.trim()) return;
    
    try {
      // Add new message to Firestore
      await addDoc(collection(db, 'messages'), {
        text: newMessage.trim(),
        sender: user.uid,
        senderName: userData?.displayName || user.displayName || 'User',
        timestamp: serverTimestamp(),
        groupId
      });
      
      // Clear the input
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Format timestamp
  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  // Get message display classes
  const getMessageClasses = (senderId: string) => {
    const isMine = user?.uid === senderId;
    return {
      container: isMine 
        ? 'flex justify-end mb-2' 
        : 'flex justify-start mb-2',
      bubble: isMine 
        ? 'bg-blue-500 text-white rounded-lg py-2 px-4 max-w-xs' 
        : 'bg-gray-200 text-gray-800 rounded-lg py-2 px-4 max-w-xs'
    };
  };

  // Toggle chat panel
  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {/* Chat toggle button */}
      <button 
        onClick={toggleChat}
        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg flex items-center justify-center"
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        <ChatBubbleLeftRightIcon className="h-6 w-6" />
      </button>
      
      {/* Chat panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 md:w-96 bg-white rounded-lg shadow-xl flex flex-col overflow-hidden border border-gray-200">
          {/* Chat header */}
          <div className="bg-blue-600 text-white px-4 py-3 flex justify-between items-center">
            <h3 className="font-semibold truncate">{groupName} Chat</h3>
            <button 
              onClick={toggleChat}
              className="text-white hover:bg-blue-700 rounded p-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          {/* Chat messages */}
          <div className="flex-1 p-4 overflow-y-auto" style={{ maxHeight: '350px' }}>
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-4">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              <>
                {messages.map((message) => {
                  const messageClasses = getMessageClasses(message.sender);
                  return (
                    <div key={message.id} className={messageClasses.container}>
                      <div>
                        <div className={messageClasses.bubble}>
                          <p>{message.text}</p>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex justify-between">
                          <span>{message.senderName}</span>
                          <span>{formatMessageTime(message.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
          
          {/* Chat input */}
          <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-4 flex">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!user}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || !user}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};