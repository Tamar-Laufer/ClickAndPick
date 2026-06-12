import AddItem    from '../../shared/AddItem';
import Edit       from '../../shared/Edit';
import DeleteItem from '../../shared/DeleteItem';

const PostItem = ({post, page }) => {
  const {
    user, getUserName,
    expanded, toggleBody,
    editingPostId, editData, changeEditPost, startEditPost, cancelEditPost, savePost, deletePost,
    activePostId, comments, toggleComments,
    newComment, setNewComment, addComment,
    editingComment, startEditComment, cancelEditComment, changeEditComment, saveComment, deleteComment
  } = page;

  const isExpanded        = !!expanded[post.id];
  const isEditing         = editingPostId == post.id;
  const isShowingComments = activePostId  == post.id;
  const isOwn             = post.userId   == user?.id;

  return (
    <div className={`post-item ${isExpanded ? 'selected' : ''}`}>

      {isEditing ? (
        <div className="post-edit-form">
          <input value={editData.title} onChange={(e) => changeEditPost('title', e.target.value)} placeholder="Post title" />
          <Edit
            value={editData.body}
            setValue={(val) => changeEditPost('body', val)}
            onSave={() => savePost(post)}
            onCancel={cancelEditPost}
            placeholder="Post content"
            multiline
          />
        </div>
      ) : (
        <>
          <div className="post-header">
            <span>#{post.id}</span>
            <span>{post.title}</span>
            <span>by {getUserName(post.userId)}</span>
            <button onClick={() => toggleBody(post.id)}>{isExpanded ? 'Hide' : 'Show'}</button>
            {isOwn && (
              <>
                <button onClick={() => startEditPost(post)}>Edit</button>
                <DeleteItem onDelete={() => deletePost(post.id)} />
              </>
            )}
          </div>
          {isExpanded && (
            <div className="post-content">
              <p>{post.body}</p>
              <button onClick={() => toggleComments(post.id)}>
                {isShowingComments ? 'Hide Comments' : 'Show Comments'}
              </button>
            </div>
          )}
        </>
      )}

      {isExpanded && isShowingComments && (
        <div className="comments-section">
          <AddItem value={newComment} setValue={setNewComment} onAdd={addComment} placeholder="Comment..." buttonText="Add" />

          {comments.map(comment => (
            <div key={comment.id} className="comment-item">
              {editingComment?.id == comment.id ? (
                <Edit
                  value={editingComment.body}
                  setValue={changeEditComment}
                  onSave={saveComment}
                  onCancel={cancelEditComment}
                  multiline
                />
              ) : (
                <div>
                  <div className="comment-header"><strong>{comment.email}</strong></div>
                  <div>{comment.body}</div>
                  {comment.email === user?.email && (
                    <div>
                      <button onClick={() => startEditComment(comment)}>Edit</button>
                      <DeleteItem onDelete={() => deleteComment(comment)} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default PostItem;
