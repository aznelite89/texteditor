import { useCallback, useState, useEffect, useRef } from "react"
import { Editor } from "./components/Editor"
import { PresenceAvatars } from "./components/PresenceAvatars"
import { RemoteCursors } from "./components/RemoteCursors"
import { Toolbar } from "./components/Toolbar"
import { VersionList } from "./components/VersionList"
import { WordCount } from "./components/WordCount"
import { STORAGE_KEYS } from "./constants/storageKeys"
import { UI_LABEL } from "./constants/ui"
import { useActiveFormats } from "./hooks/useActiveFormats"
import { useCollab } from "./hooks/useCollab"
import { useLocalStorage } from "./hooks/useLocalStorage"
import { useLocalUser } from "./hooks/useLocalUser"
import { useVersions } from "./hooks/useVersions"
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

  // Apply remote content updates from peers.
  useEffect(() => {
    return collab.onRemoteContent((html) => {
      setContent(html)
    })
  }, [collab, setContent])

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
          />
          <div className="editor-wrapper">
            <Editor
              ref={editorRef}
              content={content}
              onChange={handleLocalChange}
              onCaretChange={handleCaretChange}
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
        <VersionList
          versions={versions}
          currentContent={content}
          onSave={saveVersion}
          onRestore={restore}
          onDelete={deleteVersion}
        />
      </main>
    </div>
  )
}
