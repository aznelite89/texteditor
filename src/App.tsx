import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { CommentHighlights } from "./components/CommentHighlights"
import { Editor } from "./components/Editor"
import { PresenceAvatars } from "./components/PresenceAvatars"
import { RemoteCursors } from "./components/RemoteCursors"
import { ReviewHighlights } from "./components/ReviewHighlights"
import { Toolbar } from "./components/Toolbar"
import { WordCount } from "./components/WordCount"
import { REVIEW_STATUS } from "./constants/review"
import { SAVE_STATUS, type SaveStatus } from "./constants/saveStatus"
import { STORAGE_KEY_CONTENT } from "./constants/storageKeys"
import { UI_LABEL, UI_PROMPT } from "./constants/ui"
import { useActiveFormats } from "./hooks/useActiveFormats"
import { useCollab } from "./hooks/useCollab"
import { useComments } from "./hooks/useComments"
import { useLocalStorage } from "./hooks/useLocalStorage"
import { useLocalUser } from "./hooks/useLocalUser"
import { useReviews } from "./hooks/useReviews"
import { useVersions } from "./hooks/useVersions"
import { selectionRangeOffsets } from "./utils/caretOffset"
import { rafThrottle } from "./utils/rafThrottle"
import "./App.css"

// Side panel mounts late and isn't on the critical typing path — code-split it.
// `.then(m => ({ default: m.* }))` so `import()` types satisfy `React.lazy` (see tsconfig
// `verbatimModuleSyntax` / `erasableSyntaxOnly`).
const ReviewList = lazy(() =>
  import("./components/ReviewList").then((m) => ({ default: m.ReviewList })),
)
const CommentList = lazy(() =>
  import("./components/CommentList").then((m) => ({ default: m.CommentList })),
)
const VersionList = lazy(() =>
  import("./components/VersionList").then((m) => ({ default: m.VersionList })),
)

const SAVED_FLASH_MS = 2000

export default function App() {
  const [content, setContent, contentSaveStatus, contentSavedAt] =
    useLocalStorage<string>(STORAGE_KEY_CONTENT, "")
  const { versions, saveVersion, deleteVersion } = useVersions()
  const editorRef = useRef<HTMLDivElement | null>(null)
  const activeFormats = useActiveFormats(editorRef)
  const localUser = useLocalUser()
  const collab = useCollab(localUser)
  const reviewsApi = useReviews(localUser)
  const commentsApi = useComments(localUser)

  // Transient flash badge: defaults to IDLE (grey). After a real save event
  // we flip to SAVED for SAVED_FLASH_MS, then return to IDLE. ERROR sticks
  // until the next save attempt so the user sees the failure.
  const [statusBadge, setStatusBadge] = useState<SaveStatus>(SAVE_STATUS.IDLE)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (contentSavedAt === 0) return
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    setStatusBadge(contentSaveStatus)
    if (contentSaveStatus === SAVE_STATUS.SAVED) {
      flashTimerRef.current = setTimeout(() => {
        setStatusBadge(SAVE_STATUS.IDLE)
      }, SAVED_FLASH_MS)
    }
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    }
  }, [contentSaveStatus, contentSavedAt])

  const statusLabel =
    statusBadge === SAVE_STATUS.SAVED
      ? UI_LABEL.STATUS_SAVED
      : statusBadge === SAVE_STATUS.ERROR
        ? UI_LABEL.STATUS_ERROR
        : UI_LABEL.STATUS_READY
  const statusModifier =
    statusBadge === SAVE_STATUS.SAVED
      ? "app__status--saved"
      : statusBadge === SAVE_STATUS.ERROR
        ? "app__status--error"
        : ""

  // Latest-value refs so handlers can stay stable across renders.
  const collabRef = useRef(collab)
  collabRef.current = collab
  const reviewsRef = useRef(reviewsApi)
  reviewsRef.current = reviewsApi
  const commentsRef = useRef(commentsApi)
  commentsRef.current = commentsApi
  const setContentRef = useRef(setContent)
  setContentRef.current = setContent

  // rAF-throttled broadcasts: callers can fire them every keystroke /
  // selectionchange — at most one BroadcastChannel.postMessage per frame.
  const broadcastContentThrottled = useMemo(
    () => rafThrottle((html: string) => collabRef.current.broadcastContent(html)),
    [],
  )
  const broadcastCaretThrottled = useMemo(
    () => rafThrottle((offset: number) => collabRef.current.broadcastCaret(offset)),
    [],
  )
  useEffect(
    () => () => {
      broadcastContentThrottled.cancel()
      broadcastCaretThrottled.cancel()
    },
    [broadcastContentThrottled, broadcastCaretThrottled],
  )

  const handleLocalChange = useCallback(
    (next: string) => {
      setContentRef.current(next)
      broadcastContentThrottled(next)
    },
    [broadcastContentThrottled],
  )

  const handleCaretChange = useCallback(
    (offset: number) => broadcastCaretThrottled(offset),
    [broadcastCaretThrottled],
  )

  const clear = useCallback(() => {
    setContentRef.current("")
    broadcastContentThrottled.cancel()
    collabRef.current.broadcastContent("")
  }, [broadcastContentThrottled])

  const restore = useCallback(
    (next: string) => {
      setContentRef.current(next)
      broadcastContentThrottled.cancel()
      collabRef.current.broadcastContent(next)
    },
    [broadcastContentThrottled],
  )

  const handleMarkReview = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    const range = selectionRangeOffsets(editor)
    if (!range) return
    reviewsRef.current.markForReview(range.start, range.end)
  }, [])

  const handleCompleteReview = useCallback((id: string) => {
    const reviews = reviewsRef.current
    reviews.completeReview(id)
    const completedAfter = reviews.reviews
      .map((r) =>
        r.id === id
          ? { ...r, status: REVIEW_STATUS.COMPLETED, completedAt: Date.now() }
          : r,
      )
      .filter((r) => r.status === REVIEW_STATUS.COMPLETED)
    collabRef.current.broadcastReviews(completedAfter)
  }, [])

  const handleDeleteReview = useCallback((id: string) => {
    const reviews = reviewsRef.current
    const review = reviews.reviews.find((r) => r.id === id)
    reviews.deleteReview(id)
    if (review?.status === REVIEW_STATUS.COMPLETED) {
      const completedAfter = reviews.reviews.filter(
        (r) => r.id !== id && r.status === REVIEW_STATUS.COMPLETED,
      )
      collabRef.current.broadcastReviews(completedAfter)
    }
  }, [])

  const handleAddComment = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    const range = selectionRangeOffsets(editor)
    if (!range || range.start === range.end) return
    const body = window.prompt(UI_PROMPT.ASK_COMMENT_BODY, "")
    if (body === null) return
    const comments = commentsRef.current
    const created = comments.addComment(range.start, range.end, body)
    if (!created) return
    collabRef.current.broadcastComments([...comments.comments, created])
  }, [])

  const handleAddReply = useCallback((commentId: string, body: string) => {
    const comments = commentsRef.current
    const reply = comments.addReply(commentId, body)
    if (!reply) return
    const next = comments.comments.map((c) =>
      c.id === commentId ? { ...c, replies: [...c.replies, reply] } : c,
    )
    collabRef.current.broadcastComments(next)
  }, [])

  const handleToggleResolveComment = useCallback((commentId: string) => {
    const comments = commentsRef.current
    comments.toggleResolve(commentId)
    const next = comments.comments.map((c) =>
      c.id === commentId
        ? {
            ...c,
            resolved: !c.resolved,
            resolvedAt: !c.resolved ? Date.now() : undefined,
          }
        : c,
    )
    collabRef.current.broadcastComments(next)
  }, [])

  const handleDeleteComment = useCallback((commentId: string) => {
    const comments = commentsRef.current
    comments.deleteComment(commentId)
    const next = comments.comments.filter((c) => c.id !== commentId)
    collabRef.current.broadcastComments(next)
  }, [])

  // Subscribe to remote messages exactly once per collab instance. Since
  // useCollab's return is memoized, this effect only re-runs when the
  // underlying transport actually changes — not on every parent render.
  useEffect(() => {
    return collab.onRemoteContent((html) => setContentRef.current(html))
  }, [collab])

  useEffect(() => {
    return collab.onRemoteReviews((incoming) => {
      reviewsRef.current.applyRemoteCompleted(incoming)
    })
  }, [collab])

  useEffect(() => {
    return collab.onRemoteComments((incoming) => {
      commentsRef.current.applyRemoteComments(incoming)
    })
  }, [collab])

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
            className={`app__status ${statusModifier}`}
            data-status={statusBadge}
          >
            <span className="app__status-dot" />
            <span
              className={`app__status-text ${statusBadge !== SAVE_STATUS.IDLE ? "app__status-text--visible" : ""}`}
            >
              {statusLabel}
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
          <Suspense fallback={<div className="app__side-fallback" />}>
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
          </Suspense>
          <p className="app__hint" data-testid="review-hint">{UI_LABEL.REVIEW_HINT}</p>
          <p className="app__hint" data-testid="comment-hint">{UI_LABEL.COMMENT_HINT}</p>
        </aside>
      </main>
    </div>
  )
}
