import { useCallback, useState, useEffect, useRef } from "react"
import { CommentHighlights } from "./components/CommentHighlights"
import { CommentList } from "./components/CommentList"
import { Editor } from "./components/Editor"
import { PresenceAvatars } from "./components/PresenceAvatars"
import { RemoteCursors } from "./components/RemoteCursors"
import { ReviewHighlights } from "./components/ReviewHighlights"
import { ReviewList } from "./components/ReviewList"
import { Toolbar } from "./components/Toolbar"
import { VersionList } from "./components/VersionList"
import { WordCount } from "./components/WordCount"
import { REVIEW_STATUS } from "./constants/review"
import { STORAGE_KEYS } from "./constants/storageKeys"
import { UI_LABEL, UI_PROMPT } from "./constants/ui"
import { useActiveFormats } from "./hooks/useActiveFormats"
import { useCollab } from "./hooks/useCollab"
import { useComments } from "./hooks/useComments"
import { useLocalStorage } from "./hooks/useLocalStorage"
import { useLocalUser } from "./hooks/useLocalUser"
import { useReviews } from "./hooks/useReviews"
import { useVersions } from "./hooks/useVersions"
import { selectionRangeOffsets } from "./utils/caretOffset"
import "./App.css"

export default function App() {
  const [content, setContent] = useLocalStorage<string>(
    STORAGE_KEYS.CONTENT,
    ""
  )
  const { versions, saveVersion, deleteVersion } = useVersions()
  const editorRef = useRef<HTMLDivElement | null>(null)
  const activeFormats = useActiveFormats(editorRef)
  const localUser = useLocalUser()
  const collab = useCollab(localUser)
  const reviewsApi = useReviews(localUser)
  const commentsApi = useComments(localUser)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle")
  const [showSavedToast, setShowSavedToast] = useState(false)

  const handleLocalChange = useCallback(
    (next: string) => {
      setContent(next)
      collab.broadcastContent(next)
    },
    [setContent, collab],
  )

  const handleCaretChange = useCallback(
    (offset: number) => collab.broadcastCaret(offset),
    [collab],
  )

  const clear = useCallback(() => {
    setContent("")
    collab.broadcastContent("")
  }, [setContent, collab])

  const restore = useCallback(
    (next: string) => {
      setContent(next)
      collab.broadcastContent(next)
    },
    [setContent, collab],
  )

  const handleMarkReview = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    const range = selectionRangeOffsets(editor)
    if (!range) return
    reviewsApi.markForReview(range.start, range.end)
  }, [reviewsApi])

  const handleCompleteReview = useCallback(
    (id: string) => {
      reviewsApi.completeReview(id)
      const completedAfter = reviewsApi.reviews
        .map((r) =>
          r.id === id
            ? { ...r, status: REVIEW_STATUS.COMPLETED, completedAt: Date.now() }
            : r,
        )
        .filter((r) => r.status === REVIEW_STATUS.COMPLETED)
      collab.broadcastReviews(completedAfter)
    },
    [reviewsApi, collab],
  )

  const handleDeleteReview = useCallback(
    (id: string) => {
      const review = reviewsApi.reviews.find((r) => r.id === id)
      reviewsApi.deleteReview(id)
      if (review?.status === REVIEW_STATUS.COMPLETED) {
        const completedAfter = reviewsApi.reviews
          .filter((r) => r.id !== id && r.status === REVIEW_STATUS.COMPLETED)
        collab.broadcastReviews(completedAfter)
      }
    },
    [reviewsApi, collab],
  )

  const handleAddComment = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    const range = selectionRangeOffsets(editor)
    if (!range || range.start === range.end) return
    const body = window.prompt(UI_PROMPT.ASK_COMMENT_BODY, "")
    if (body === null) return
    const created = commentsApi.addComment(range.start, range.end, body)
    if (!created) return
    collab.broadcastComments([...commentsApi.comments, created])
  }, [commentsApi, collab])

  const handleAddReply = useCallback(
    (commentId: string, body: string) => {
      const reply = commentsApi.addReply(commentId, body)
      if (!reply) return
      const next = commentsApi.comments.map((c) =>
        c.id === commentId ? { ...c, replies: [...c.replies, reply] } : c,
      )
      collab.broadcastComments(next)
    },
    [commentsApi, collab],
  )

  const handleToggleResolveComment = useCallback(
    (commentId: string) => {
      commentsApi.toggleResolve(commentId)
      const next = commentsApi.comments.map((c) =>
        c.id === commentId
          ? {
              ...c,
              resolved: !c.resolved,
              resolvedAt: !c.resolved ? Date.now() : undefined,
            }
          : c,
      )
      collab.broadcastComments(next)
    },
    [commentsApi, collab],
  )

  const handleDeleteComment = useCallback(
    (commentId: string) => {
      commentsApi.deleteComment(commentId)
      const next = commentsApi.comments.filter((c) => c.id !== commentId)
      collab.broadcastComments(next)
    },
    [commentsApi, collab],
  )

  // Apply remote content updates from peers.
  useEffect(() => {
    return collab.onRemoteContent((html) => {
      setContent(html)
    })
  }, [collab, setContent])

  // Apply remote review updates (completed reviews) from peers.
  useEffect(() => {
    return collab.onRemoteReviews((incoming) => {
      reviewsApi.applyRemoteCompleted(incoming)
    })
  }, [collab, reviewsApi])

  // Apply remote comment updates from peers.
  useEffect(() => {
    return collab.onRemoteComments((incoming) => {
      commentsApi.applyRemoteComments(incoming)
    })
  }, [collab, commentsApi])

  // Show "All changes saved" toast 1.5s after the user stops typing
  useEffect(() => {
    if (!content && content !== "") return
    setSaveStatus("idle")
    const idleTimer = setTimeout(() => {
      setSaveStatus("saved")
      setShowSavedToast(true)
      const hideTimer = setTimeout(() => {
        setShowSavedToast(false)
        setSaveStatus("idle")
      }, 2000)
      return () => clearTimeout(hideTimer)
    }, 1500)
    return () => clearTimeout(idleTimer)
  }, [content])

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__header-left">
          <h1 className="app__title">{UI_LABEL.APP_TITLE}</h1>
          <span className="app__badge">Collaborative</span>
        </div>
        <div className="app__header-right">
          <PresenceAvatars localUser={localUser} peers={collab.peers} />
          <div className="app__divider" />
          <div
            className={`app__status ${saveStatus === "saved" ? "app__status--saved" : ""}`}
          >
            <span className="app__status-dot" />
            <span
              className={`app__status-text ${showSavedToast ? "app__status-text--visible" : ""}`}
            >
              {showSavedToast ? "All changes saved" : "Ready"}
            </span>
          </div>
        </div>
      </header>
      <main className="app__main">
        <section className="app__editor-section">
          <Toolbar
            onClear={clear}
            activeFormats={activeFormats}
            editorRef={editorRef}
            onMarkReview={handleMarkReview}
            onAddComment={handleAddComment}
          />
          <div className="editor-wrapper">
            <Editor
              ref={editorRef}
              content={content}
              onChange={handleLocalChange}
              onCaretChange={handleCaretChange}
            />
            <ReviewHighlights
              editorRef={editorRef}
              reviews={reviewsApi.reviews}
              content={content}
            />
            <CommentHighlights
              editorRef={editorRef}
              comments={commentsApi.comments}
              content={content}
            />
            <RemoteCursors
              editorRef={editorRef}
              carets={collab.remoteCarets}
              peers={collab.peers}
              content={content}
            />
            <WordCount content={content} />
          </div>
        </section>
        <aside className="app__side">
          <ReviewList
            reviews={reviewsApi.reviews}
            content={content}
            onComplete={handleCompleteReview}
            onDelete={handleDeleteReview}
          />
          <CommentList
            comments={commentsApi.comments}
            content={content}
            onAddReply={handleAddReply}
            onToggleResolve={handleToggleResolveComment}
            onDelete={handleDeleteComment}
          />
          <VersionList
            versions={versions}
            currentContent={content}
            onSave={saveVersion}
            onRestore={restore}
            onDelete={deleteVersion}
          />
          <p className="app__hint" data-testid="review-hint">{UI_LABEL.REVIEW_HINT}</p>
          <p className="app__hint" data-testid="comment-hint">{UI_LABEL.COMMENT_HINT}</p>
        </aside>
      </main>
    </div>
  )
}
