import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type PageId = 'home' | 'log' | 'note' | 'blog' | 'x' | 'threads' | 'memo'
type Status = '候補' | '執筆中' | '予約投稿' | '投稿完了'
type Channel = 'note' | 'blog' | 'x' | 'threads'

type PostItem = {
  id: number
  channel: Channel
  title: string
  body: string
  memo: string
  series: string
  status: Status
  publishDate: string
  publicUrl: string
}

type MemoItem = {
  id: number
  memo: string
  note: string
}

const statuses: Status[] = ['候補', '執筆中', '予約投稿', '投稿完了']

const pageLabels: Record<PageId, string> = {
  home: 'トップ',
  log: 'ログ一覧',
  note: 'note',
  blog: 'ブログ',
  x: 'X投稿',
  threads: 'Threads投稿',
  memo: '仮メモ',
}

const channelLabels: Record<Channel, string> = {
  note: 'note',
  blog: 'ブログ',
  x: 'X投稿',
  threads: 'Threads投稿',
}

const statusTone: Record<Status, string> = {
  候補: 'candidate',
  執筆中: 'writing',
  予約投稿: 'scheduled',
  投稿完了: 'published',
}

const initialPosts: PostItem[] = [
  {
    id: 1,
    channel: 'note',
    title: '回復期に整える朝の小さな習慣',
    body: '',
    memo: '導入に「無理なく続く」を入れる',
    series: '回復期の生活リズム',
    status: '候補',
    publishDate: '',
    publicUrl: '',
  },
  {
    id: 2,
    channel: 'x',
    title: '',
    body: '今日の回復メモ。小さく整えるだけでも、次の一歩の足場になる。',
    memo: '短く、読後に残る言葉を先頭へ。',
    series: '',
    status: '執筆中',
    publishDate: '',
    publicUrl: '',
  },
  {
    id: 3,
    channel: 'threads',
    title: '',
    body: '焦らない日を、ただの停滞ではなく整える時間として記録する。',
    memo: 'Threadsでは少しやわらかい言い回しにする。',
    series: '',
    status: '予約投稿',
    publishDate: '2026-06-01',
    publicUrl: '',
  },
]

const initialMemos: MemoItem[] = [
  {
    id: 1,
    memo: '読者に届けたい言葉を先に集めておく',
    note: 'note化できそうな断片',
  },
]

const postsStorageKey = 'kaihukuki-labo-posts'
const memosStorageKey = 'kaihukuki-labo-memos'
const storageBackupSuffix = ':backup'
const appBasePath = '/kaihukuki-Labo/'

const getPostHeading = (post: PostItem) =>
  post.channel === 'note' || post.channel === 'blog'
    ? post.title
    : post.body || '本文未入力'

const sortPostsByPublishDate = (posts: PostItem[]) =>
  posts.slice().sort((a, b) => {
    if (!a.publishDate && !b.publishDate) return b.id - a.id
    if (!a.publishDate) return 1
    if (!b.publishDate) return -1
    return b.publishDate.localeCompare(a.publishDate)
  })

const loadItems = <T,>(storageKey: string, fallback: T[]) => {
  try {
    const savedItems = window.localStorage.getItem(storageKey)
    if (!savedItems) return fallback

    const parsedItems = JSON.parse(savedItems)
    return Array.isArray(parsedItems) ? (parsedItems as T[]) : fallback
  } catch {
    return fallback
  }
}

const persistItems = <T,>(storageKey: string, items: T[]) => {
  const nextValue = JSON.stringify(items)
  const previousValue = window.localStorage.getItem(storageKey)

  if (previousValue && previousValue !== nextValue) {
    window.localStorage.setItem(
      `${storageKey}${storageBackupSuffix}`,
      previousValue,
    )
  }

  window.localStorage.setItem(storageKey, nextValue)
}

const clearAppServiceWorkerCaches = async () => {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    const currentPageUrl = window.location.href

    await Promise.all(
      registrations
        .filter(
          (registration) =>
            registration.scope.includes(appBasePath) ||
            currentPageUrl.startsWith(registration.scope) ||
            registration.active?.scriptURL.includes(appBasePath) ||
            registration.installing?.scriptURL.includes(appBasePath) ||
            registration.waiting?.scriptURL.includes(appBasePath),
        )
        .map((registration) => registration.unregister()),
    )
  }

  if ('caches' in window) {
    const cacheKeys = await window.caches.keys()

    await Promise.all(
      cacheKeys
        .filter((cacheKey) => cacheKey.toLowerCase().includes('kaihukuki'))
        .map((cacheKey) => window.caches.delete(cacheKey)),
    )
  }
}

function App() {
  const [activePage, setActivePage] = useState<PageId>('home')
  const [posts, setPosts] = useState<PostItem[]>(() =>
    loadItems(postsStorageKey, initialPosts),
  )
  const [memos, setMemos] = useState<MemoItem[]>(() =>
    loadItems(memosStorageKey, initialMemos),
  )
  const [editingPostId, setEditingPostId] = useState<number | null>(null)
  const [editingMemoId, setEditingMemoId] = useState<number | null>(null)

  const editingPost = posts.find((post) => post.id === editingPostId) ?? null
  const editingMemo = memos.find((memo) => memo.id === editingMemoId) ?? null

  useEffect(() => {
    clearAppServiceWorkerCaches().catch((error: unknown) => {
      console.warn('Failed to clear app service worker caches', error)
    })
  }, [])

  const exportStorageData = () => {
    const backupData = {
      exportedAt: new Date().toISOString(),
      storageKeys: {
        posts: postsStorageKey,
        postsBackup: `${postsStorageKey}${storageBackupSuffix}`,
        memos: memosStorageKey,
        memosBackup: `${memosStorageKey}${storageBackupSuffix}`,
      },
      posts,
      memos,
      rawStorage: {
        posts: window.localStorage.getItem(postsStorageKey),
        postsBackup: window.localStorage.getItem(
          `${postsStorageKey}${storageBackupSuffix}`,
        ),
        memos: window.localStorage.getItem(memosStorageKey),
        memosBackup: window.localStorage.getItem(
          `${memosStorageKey}${storageBackupSuffix}`,
        ),
      },
    }
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `kaihukuki-labo-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const statusCounts = useMemo(
    () =>
      statuses.map((status) => ({
        status,
        count: posts.filter((post) => post.status === status).length,
      })),
    [posts],
  )

  const nextItems = useMemo(
    () =>
      posts
        .filter((post) => post.status !== '投稿完了')
        .slice()
        .sort((a, b) => {
          if (!a.publishDate) return 1
          if (!b.publishDate) return -1
          return a.publishDate.localeCompare(b.publishDate)
        })
        .slice(0, 4),
    [posts],
  )

  const savePost = (event: FormEvent<HTMLFormElement>, channel: Channel) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const title = String(formData.get('title') ?? '').trim()
    const body = String(formData.get('body') ?? '').trim()
    const memo = String(formData.get('memo') ?? '').trim()
    const series = String(formData.get('series') ?? '').trim()
    const isEditingCurrentChannel = editingPost?.channel === channel

    if ((channel === 'note' || channel === 'blog') && !title) return
    if (channel !== 'note' && channel !== 'blog' && !body) return

    const item: PostItem = {
      id: isEditingCurrentChannel ? editingPost.id : Date.now(),
      channel,
      title,
      body,
      memo,
      series,
      status: (String(formData.get('status') ?? '投稿完了') || '投稿完了') as Status,
      publishDate: String(formData.get('publishDate') ?? ''),
      publicUrl: String(formData.get('publicUrl') ?? '').trim(),
    }

    const nextPosts = isEditingCurrentChannel
      ? posts.map((post) => (post.id === editingPost.id ? item : post))
      : [item, ...posts]

    persistItems(postsStorageKey, nextPosts)
    setPosts(nextPosts)
    setEditingPostId(null)
    event.currentTarget.reset()
  }

  const updatePostStatus = (id: number, status: Status) => {
    const nextPosts = posts.map((post) =>
      post.id === id ? { ...post, status } : post,
    )

    persistItems(postsStorageKey, nextPosts)
    setPosts(nextPosts)
  }

  const editPost = (item: PostItem) => {
    setEditingPostId(item.id)
    setActivePage(item.channel)
  }

  const deletePost = (id: number) => {
    const nextPosts = posts.filter((post) => post.id !== id)

    persistItems(postsStorageKey, nextPosts)
    setPosts(nextPosts)
    if (editingPostId === id) setEditingPostId(null)
  }

  const saveMemo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const memo = String(formData.get('memo') ?? '').trim()

    if (!memo) return

    const item: MemoItem = {
      id: editingMemo?.id ?? Date.now(),
      memo,
      note: String(formData.get('note') ?? '').trim(),
    }

    const nextMemos = editingMemo
      ? memos.map((currentMemo) =>
          currentMemo.id === editingMemo.id ? item : currentMemo,
        )
      : [item, ...memos]

    persistItems(memosStorageKey, nextMemos)
    setMemos(nextMemos)
    setEditingMemoId(null)
    event.currentTarget.reset()
  }

  const deleteMemo = (id: number) => {
    const nextMemos = memos.filter((memo) => memo.id !== id)

    persistItems(memosStorageKey, nextMemos)
    setMemos(nextMemos)
    if (editingMemoId === id) setEditingMemoId(null)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="ページ">
        <div>
          <p className="eyebrow">Recovery content lab</p>
          <h1>回復期Labo</h1>
        </div>

        <nav>
          {(Object.keys(pageLabels) as PageId[]).map((page) => (
            <button
              className={activePage === page ? 'active' : ''}
              key={page}
              onClick={() => setActivePage(page)}
              type="button"
            >
              {pageLabels[page]}
            </button>
          ))}
        </nav>

        <div className="sidebar-actions">
          <button onClick={exportStorageData} type="button">
            データを書き出し
          </button>
        </div>
      </aside>

      <main>
        {activePage === 'home' && (
          <HomePage
            memos={memos}
            nextItems={nextItems}
            posts={posts}
            setActivePage={setActivePage}
            statusCounts={statusCounts}
          />
        )}
        {activePage === 'log' && (
          <LogPage
            onDelete={deletePost}
            onEdit={editPost}
            onStatusChange={updatePostStatus}
            posts={posts}
          />
        )}
        {activePage === 'note' && (
          <PostPage
            channel="note"
            editingPost={editingPost?.channel === 'note' ? editingPost : null}
            onCancelEdit={() => setEditingPostId(null)}
            onDelete={deletePost}
            onEdit={editPost}
            onStatusChange={updatePostStatus}
            onSubmit={savePost}
            posts={posts.filter((post) => post.channel === 'note')}
          />
        )}
        {activePage === 'blog' && (
          <PostPage
            channel="blog"
            editingPost={editingPost?.channel === 'blog' ? editingPost : null}
            onCancelEdit={() => setEditingPostId(null)}
            onDelete={deletePost}
            onEdit={editPost}
            onStatusChange={updatePostStatus}
            onSubmit={savePost}
            posts={posts.filter((post) => post.channel === 'blog')}
          />
        )}
        {activePage === 'x' && (
          <PostPage
            channel="x"
            editingPost={editingPost?.channel === 'x' ? editingPost : null}
            onCancelEdit={() => setEditingPostId(null)}
            onDelete={deletePost}
            onEdit={editPost}
            onStatusChange={updatePostStatus}
            onSubmit={savePost}
            posts={posts.filter((post) => post.channel === 'x')}
          />
        )}
        {activePage === 'threads' && (
          <PostPage
            channel="threads"
            editingPost={
              editingPost?.channel === 'threads' ? editingPost : null
            }
            onCancelEdit={() => setEditingPostId(null)}
            onDelete={deletePost}
            onEdit={editPost}
            onStatusChange={updatePostStatus}
            onSubmit={savePost}
            posts={posts.filter((post) => post.channel === 'threads')}
          />
        )}
        {activePage === 'memo' && (
          <MemoPage
            editingMemo={editingMemo}
            memos={memos}
            onCancelEdit={() => setEditingMemoId(null)}
            onDelete={deleteMemo}
            onEdit={setEditingMemoId}
            onSubmit={saveMemo}
          />
        )}
      </main>
    </div>
  )
}

type HomePageProps = {
  memos: MemoItem[]
  nextItems: PostItem[]
  posts: PostItem[]
  setActivePage: (page: PageId) => void
  statusCounts: { status: Status; count: number }[]
}

function HomePage({
  memos,
  nextItems,
  posts,
  setActivePage,
  statusCounts,
}: HomePageProps) {
  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">まとめ</p>
          <h2>発信の全体ハブ</h2>
        </div>
        <p>
          note、X、Threads、仮メモをひとつの場所で見渡して、次に書くものを選べます。
        </p>
      </div>

      <div className="summary-grid">
        <SummaryCard label="投稿アイデア" value={`${posts.length}件`} />
        <SummaryCard label="仮メモ" value={`${memos.length}件`} />
        <SummaryCard
          label="投稿完了"
          value={`${posts.filter((post) => post.status === '投稿完了').length}件`}
        />
      </div>

      <div className="status-row">
        {statusCounts.map((item) => (
          <div className="status-card" key={item.status}>
            <span>{item.status}</span>
            <strong>{item.count}</strong>
          </div>
        ))}
      </div>

      <div className="content-grid">
        <section className="panel">
          <div className="panel-heading">
            <h3>次に進める投稿</h3>
            <button onClick={() => setActivePage('note')} type="button">
              noteへ
            </button>
          </div>
          <ItemList items={nextItems} />
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h3>仮メモ</h3>
            <button onClick={() => setActivePage('memo')} type="button">
              メモへ
            </button>
          </div>
          <div className="memo-list compact">
            {memos.slice(0, 4).map((memo) => (
              <article key={memo.id}>
                <p>{memo.memo}</p>
                {memo.note && <small>{memo.note}</small>}
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function LogPage({
  onDelete,
  onEdit,
  onStatusChange,
  posts,
}: {
  onDelete: (id: number) => void
  onEdit: (item: PostItem) => void
  onStatusChange: (id: number, status: Status) => void
  posts: PostItem[]
}) {
  const sortedPosts = sortPostsByPublishDate(posts)

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">ログ</p>
          <h2>投稿ログ一覧</h2>
        </div>
        <p>note、X投稿、Threads投稿をまとめて確認できます。</p>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <h3>全投稿</h3>
          <span>{posts.length}件</span>
        </div>
        <ItemList
          items={sortedPosts}
          onDelete={onDelete}
          onEdit={onEdit}
          onStatusChange={onStatusChange}
        />
      </section>
    </section>
  )
}

type PostPageProps = {
  channel: Channel
  editingPost: PostItem | null
  onCancelEdit: () => void
  onDelete: (id: number) => void
  onEdit: (item: PostItem) => void
  onStatusChange: (id: number, status: Status) => void
  onSubmit: (event: FormEvent<HTMLFormElement>, channel: Channel) => void
  posts: PostItem[]
}

function PostPage({
  channel,
  editingPost,
  onCancelEdit,
  onDelete,
  onEdit,
  onStatusChange,
  onSubmit,
  posts,
}: PostPageProps) {
  const isShortPost = channel !== 'note'
  const isBlogPost = channel === 'blog'
  const sortedPosts = sortPostsByPublishDate(posts)

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">投稿管理</p>
          <h2>{channelLabels[channel]}ページ</h2>
        </div>
        <p>
          {isBlogPost
            ? 'タイトル、公開日、公開URL、メモを管理します。'
            : isShortPost
            ? 'ステータス、公開日、公開URLとあわせて、投稿本文とメモを残せます。'
            : 'タイトル、シリーズ、メモ、ステータス、公開日、公開URLを管理します。'}
        </p>
      </div>

      <form
        className={`entry-form ${
          isBlogPost ? 'blog-form' : isShortPost ? 'social-form' : 'note-form'
        }`}
        key={editingPost?.id ?? `new-${channel}`}
        onSubmit={(event) => onSubmit(event, channel)}
      >
        {isBlogPost ? (
          <>
            <div className="form-controls">
              <label>
                タイトル
                <input
                  defaultValue={editingPost?.title}
                  name="title"
                  placeholder="ブログタイトル"
                  required
                />
              </label>
              <label>
                公開日
                <input
                  defaultValue={editingPost?.publishDate}
                  name="publishDate"
                  type="date"
                />
              </label>
              <label>
                公開URL
                <input
                  defaultValue={editingPost?.publicUrl}
                  name="publicUrl"
                  placeholder="https://..."
                  type="url"
                />
              </label>
            </div>
            <label>
              メモ
              <textarea
                defaultValue={editingPost?.memo}
                name="memo"
                placeholder="公開後の補足、直したい点、反応など"
              />
            </label>
            <FormActions isEditing={Boolean(editingPost)} onCancel={onCancelEdit} />
          </>
        ) : isShortPost ? (
          <>
            <div className="form-controls">
              <label>
                ステータス
                <select defaultValue={editingPost?.status ?? statuses[0]} name="status">
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                公開日
                <input
                  defaultValue={editingPost?.publishDate}
                  name="publishDate"
                  type="date"
                />
              </label>
              <label>
                公開URL
                <input
                  defaultValue={editingPost?.publicUrl}
                  name="publicUrl"
                  placeholder="https://..."
                  type="url"
                />
              </label>
            </div>
            <div className="writing-fields">
              <label>
                本文
                <textarea
                  defaultValue={editingPost?.body}
                  name="body"
                  placeholder="投稿本文を書く"
                  required
                />
              </label>
              <label>
                メモ
                <textarea
                  defaultValue={editingPost?.memo}
                  name="memo"
                  placeholder="補足、狙い、あとで直す点など"
                />
              </label>
            </div>
            <FormActions isEditing={Boolean(editingPost)} onCancel={onCancelEdit} />
          </>
        ) : (
          <>
            <div className="form-controls">
              <label>
                タイトル
                <input
                  defaultValue={editingPost?.title}
                  name="title"
                  placeholder="投稿タイトル"
                  required
                />
              </label>
              <label>
                シリーズ
                <input
                  defaultValue={editingPost?.series}
                  name="series"
                  placeholder="シリーズ名"
                />
              </label>
              <label>
                ステータス
                <select defaultValue={editingPost?.status ?? statuses[0]} name="status">
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                公開日
                <input
                  defaultValue={editingPost?.publishDate}
                  name="publishDate"
                  type="date"
                />
              </label>
              <label>
                公開URL
                <input
                  defaultValue={editingPost?.publicUrl}
                  name="publicUrl"
                  placeholder="https://..."
                  type="url"
                />
              </label>
            </div>
            <label>
              メモ
              <textarea
                defaultValue={editingPost?.memo}
                name="memo"
                placeholder="構成、狙い、残しておきたい補足など"
              />
            </label>
            <FormActions isEditing={Boolean(editingPost)} onCancel={onCancelEdit} />
          </>
        )}
      </form>

      <section className="panel">
        <div className="panel-heading">
          <h3>{channelLabels[channel]}一覧</h3>
          <span>{posts.length}件</span>
        </div>
        <ItemList
          items={sortedPosts}
          onDelete={onDelete}
          onEdit={onEdit}
          onStatusChange={onStatusChange}
        />
      </section>
    </section>
  )
}

function FormActions({
  isEditing,
  onCancel,
}: {
  isEditing: boolean
  onCancel: () => void
}) {
  return (
    <div className="form-actions">
      <button type="submit">{isEditing ? '更新' : '追加'}</button>
      {isEditing && (
        <button onClick={onCancel} type="button">
          取消
        </button>
      )}
    </div>
  )
}

function ItemList({
  items,
  onDelete,
  onEdit,
  onStatusChange,
}: {
  items: PostItem[]
  onDelete?: (id: number) => void
  onEdit?: (item: PostItem) => void
  onStatusChange?: (id: number, status: Status) => void
}) {
  if (items.length === 0) {
    return <p className="empty">まだ登録がありません。</p>
  }

  return (
    <div className="item-list">
      {items.map((item) => (
        <article
          className={item.channel === 'note' ? '' : 'social-item'}
          key={item.id}
        >
          <div>
            <span className="channel">{channelLabels[item.channel]}</span>
            <h4>{getPostHeading(item)}</h4>
            {item.channel === 'note' && item.series && (
              <p className="post-detail">シリーズ: {item.series}</p>
            )}
            {item.memo && <p className="post-memo">{item.memo}</p>}
          </div>
          <div className="meta">
            {onStatusChange && item.channel !== 'blog' ? (
              <label className="inline-field">
                <span>ステータス</span>
                <select
                  className={`status-select status-${statusTone[item.status]}`}
                  onChange={(event) =>
                    onStatusChange(item.id, event.target.value as Status)
                  }
                  value={item.status}
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            ) : item.channel !== 'blog' ? (
              <span className={`badge status-${statusTone[item.status]}`}>
                {item.status}
              </span>
            ) : null}
            <span>{item.publishDate || '公開日未定'}</span>
            {item.publicUrl ? (
              <a href={item.publicUrl} rel="noreferrer" target="_blank">
                公開URL
              </a>
            ) : (
              <span>URL未登録</span>
            )}
            {(onEdit || onDelete) && (
              <div className="item-actions">
                {onEdit && (
                  <button onClick={() => onEdit(item)} type="button">
                    編集
                  </button>
                )}
                {onDelete && (
                  <button onClick={() => onDelete(item.id)} type="button">
                    削除
                  </button>
                )}
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}

function MemoPage({
  editingMemo,
  memos,
  onCancelEdit,
  onDelete,
  onEdit,
  onSubmit,
}: {
  editingMemo: MemoItem | null
  memos: MemoItem[]
  onCancelEdit: () => void
  onDelete: (id: number) => void
  onEdit: (id: number) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">下書き前の置き場</p>
          <h2>仮メモページ</h2>
        </div>
        <p>思いついた断片と補足を、まだ整えずに残せます。</p>
      </div>

      <form
        className="entry-form memo-form"
        key={editingMemo?.id ?? 'new-memo'}
        onSubmit={onSubmit}
      >
        <label>
          メモ
          <textarea
            defaultValue={editingMemo?.memo}
            name="memo"
            placeholder="浮かんだことを書く"
            required
          />
        </label>
        <label>
          補足
          <textarea
            defaultValue={editingMemo?.note}
            name="note"
            placeholder="背景、使い道、関連する投稿案など"
          />
        </label>
        <FormActions isEditing={Boolean(editingMemo)} onCancel={onCancelEdit} />
      </form>

      <section className="panel">
        <div className="panel-heading">
          <h3>メモ一覧</h3>
          <span>{memos.length}件</span>
        </div>
        <div className="memo-list">
          {memos.map((memo) => (
            <article key={memo.id}>
              <div>
                <p>{memo.memo}</p>
                {memo.note && <small>{memo.note}</small>}
              </div>
              <div className="item-actions">
                <button onClick={() => onEdit(memo.id)} type="button">
                  編集
                </button>
                <button onClick={() => onDelete(memo.id)} type="button">
                  削除
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}

export default App
