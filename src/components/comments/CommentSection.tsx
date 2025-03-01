// src/components/comments/CommentSection.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { formatDistanceToNow } from 'date-fns';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';

interface Comment {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  timestamp: any;
}

interface CommentSectionProps {
  entityType: 'group' | 'plan' | 'task';
  entityId: string;
  entityName: string;
}

export default function CommentSection({ entityType, entityId, entityName }: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom of comments when new ones are added
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);
  
  // Set up real-time listener for comments
  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'comments'),
      where('entityType', '==', entityType),
      where('entityId', '==', entityId),
      orderBy('timestamp', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsList: Comment[] = [];
      snapshot.forEach((doc) => {
        commentsList.push({
          id: doc.id,
          ...doc.data()
        } as Comment);
      });
      
      setComments(commentsList);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [user, entityType, entityId]);
  
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !newComment.trim()) return;
    
    setSubmitting(true);
    
    try {
      // Add comment to Firestore
      await addDoc(collection(db, 'comments'), {
        text: newComment.trim(),
        userId: user.uid,
        userName: user.displayName || 'User',
        userPhotoURL: user.photoURL || null,
        timestamp: serverTimestamp(),
        entityType,
        entityId,
        entityName
      });
      
      // Log activity
      await addDoc(collection(db, 'activities'), {
        type: 'comment_added',
        entityType,
        entityId,
        entityName,
        userId: user.uid,
        userName: user.displayName || 'User',
        timestamp: serverTimestamp()
      });
      
      // Clear input
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  // Find mentions in comment text
  const findMentions = (text: string) => {
    const mentionRegex = /@(\w+)/g;
    let mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    
    return mentions;
  };
  
  // Format timestamp
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true });
  };
  
  // Render comment text with mentions highlighted
  const renderCommentText = (text: string) => {
    const parts = text.split(/@(\w+)/g);
    
    return parts.map((part, index) => {
      // Every odd index is a mention
      if (index % 2 === 1) {
        return <span key={index} className="text-blue-600 font-medium">@{part}</span>;
      }
      
      return part;
    });
  };
  
  if (!user) {
    return (
      <div className="text-center py-4 text-gray-500">
        Sign in to view and add comments
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-lg font-medium mb-4">Comments</h3>
      
      {/* Comments list */}
      <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex space-x-3">
              <div className="flex-shrink-0">
                {comment.userPhotoURL ? (
                  <img
                    src={comment.userPhotoURL}
                    alt={comment.userName}
                    className="h-10 w-10 rounded-full"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-medium">
                      {comment.userName ? comment.userName[0].toUpperCase() : '?'}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <div className="bg-gray-100 p-3 rounded-lg">
                  <div className="flex items-center mb-1">
                    <p className="font-medium text-gray-900">{comment.userName}</p>
                    <span className="ml-2 text-xs text-gray-500">
                      {formatTime(comment.timestamp)}
                    </span>
                  </div>
                  <p className="text-gray-700">
                    {renderCommentText(comment.text)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={commentsEndRef} />
      </div>
      
      {/* Comment form */}
      <form onSubmit={handleSubmitComment} className="mt-4">
        <div className="flex space-x-3">
          <div className="flex-shrink-0">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="h-10 w-10 rounded-full"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-medium">
                  {user.displayName ? user.displayName[0].toUpperCase() : '?'}
                </span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="relative">
              <textarea
                id="comment"
                name="comment"
                rows={3}
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm resize-none"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || submitting}
                className="absolute bottom-2 right-2 inline-flex items-center p-1.5 border border-transparent rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <PaperAirplaneIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Use @username to mention someone
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}