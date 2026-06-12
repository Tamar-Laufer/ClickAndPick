import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import useResource from '../../hooks/useResource';

const useComments = () => {
  const { user } = useAuth();
  const { items: comments, load, add, save, del } = useResource('/comments');

  const [activePostId,   setActivePostId]   = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [newComment,     setNewComment]     = useState('');

  const toggleComments = async (postId) => {
    if (activePostId == postId) { setActivePostId(null); return; }
    setActivePostId(postId);
    setNewComment('');
    setEditingComment(null);
    await load(`?postId=${postId}`);
  };

  const addComment = () => {
    if (!newComment.trim()) return;
    add({ postId: activePostId, email: user.email, body: newComment },
      () => setNewComment(''));
  };

  const startEditComment  = (comment) => setEditingComment({ ...comment });
  const cancelEditComment = ()        => setEditingComment(null);
  const changeEditComment = (val)     => setEditingComment(prev => ({ ...prev, body: val }));

  const saveComment   = () => save(editingComment.id, editingComment, () => setEditingComment(null));
  const deleteComment = (comment) => del(comment.id, { email: user.email });

  return {
    comments: comments || [],
    activePostId, toggleComments,
    newComment, setNewComment, addComment,
    editingComment, startEditComment, cancelEditComment, changeEditComment, saveComment, deleteComment
  };
};

export default useComments;
