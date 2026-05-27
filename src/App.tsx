import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type PageId = 'home' | 'note' | 'x' | 'threads' | 'memo'
type Status = '候補' | '執筆中' | '予約投稿' | '投稿完了'
type Channel = Exclude<PageId, 'home' | 'memo'>

type PostItem = {
  id: number
  channel: Channel
  title: string
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
  note: 'note',
  x: 'X投稿',
  threads: 'Threads投稿',
  memo: '仮メモ',
}

const channelLabels: Record<Channel, string> = {
  note: 'note',
  x: 'X投稿',
  threads: 'Threads投稿',
}

const initialPosts: PostItem[] = [
  {
    id: 1,
    channel: 'note',
    title: '回復期に整える朝の小さな習慣',
    status: '候補',
    publishDate: '',
    publicUrl: '',
  },
  {
    id: 2,
    channel: 'x',
    title: '今日の回復メモを短く投稿',
    status: '執筆中',
    publishDate: '',
    publicUrl: '',
  },
  {
    id: 3,
    channel: 'threads',
    title: '焦らない日の記録',
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

function App() {
  const [activePage, setActivePage] = useState<PageId>('home')
  const [posts, setPosts] = useState<PostItem[]>(initialPosts)
  const [memos, setMemos] = useState<MemoItem[]>(initialMemos)

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

  const addPost = (event: FormEvent<HTMLFormElement>, channel: Channel) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const title = String(formData.get('title') ?? '').trim()

    if (!title) return

    const item: PostItem = {
      id: Date.now(),
      channel,
      title,
      status: String(formData.get('status')) as Status,
      publishDate: String(formData.get('publishDate') ?? ''),
      publicUrl: String(formData.get('publicUrl') ?? '').trim(),
    }

    setPosts((current) => [item, ...current])
    event.currentTarget.reset()
  }

  const addMemo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const memo = String(formData.get('memo') ?? '').trim()

    if (!memo) return

    setMemos((current) => [
      {
        id: Date.now(),
        memo,
        note: String(formData.get('note') ?? '').trim(),
      },
      ...current,
    ])
    event.currentTarget.reset()
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
        {activePage === 'note' && (
          <PostPage
            channel="note"
            onSubmit={addPost}
            posts={posts.filter((post) => post.channel === 'note')}
          />
        )}
        {activePage === 'x' && (
          <PostPage
            channel="x"
            onSubmit={addPost}
            posts={posts.filter((post) => post.channel === 'x')}
          />
        )}
        {activePage === 'threads' && (
          <PostPage
            channel="threads"
            onSubmit={addPost}
            posts={posts.filter((post) => post.channel === 'threads')}
          />
        )}
        {activePage === 'memo' && <MemoPage memos={memos} onSubmit={addMemo} />}
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
          <h2>発信の全体像</h2>
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

type PostPageProps = {
  channel: Channel
  onSubmit: (event: FormEvent<HTMLFormElement>, channel: Channel) => void
  posts: PostItem[]
}

function PostPage({ channel, onSubmit, posts }: PostPageProps) {
  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">投稿管理</p>
          <h2>{channelLabels[channel]}ページ</h2>
        </div>
        <p>タイトル、ステータス、公開日、公開URLを管理します。</p>
      </div>

      <form className="entry-form" onSubmit={(event) => onSubmit(event, channel)}>
        <label>
          タイトル
          <input name="title" placeholder="投稿タイトル" required />
        </label>
        <label>
          ステータス
          <select defaultValue="候補" name="status">
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label>
          公開日
          <input name="publishDate" type="date" />
        </label>
        <label className="wide">
          公開URL
          <input name="publicUrl" placeholder="https://..." type="url" />
        </label>
        <button type="submit">追加</button>
      </form>

      <section className="panel">
        <div className="panel-heading">
          <h3>{channelLabels[channel]}一覧</h3>
          <span>{posts.length}件</span>
        </div>
        <ItemList items={posts} />
      </section>
    </section>
  )
}

function ItemList({ items }: { items: PostItem[] }) {
  if (items.length === 0) {
    return <p className="empty">まだ登録がありません。</p>
  }

  return (
    <div className="item-list">
      {items.map((item) => (
        <article key={item.id}>
          <div>
            <span className="channel">{channelLabels[item.channel]}</span>
            <h4>{item.title}</h4>
          </div>
          <div className="meta">
            <span className={`badge status-${item.status}`}>{item.status}</span>
            <span>{item.publishDate || '公開日未定'}</span>
            {item.publicUrl ? (
              <a href={item.publicUrl} rel="noreferrer" target="_blank">
                公開URL
              </a>
            ) : (
              <span>URL未登録</span>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}

function MemoPage({
  memos,
  onSubmit,
}: {
  memos: MemoItem[]
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

      <form className="entry-form memo-form" onSubmit={onSubmit}>
        <label>
          メモ
          <textarea name="memo" placeholder="浮かんだことを書く" required />
        </label>
        <label>
          補足
          <textarea name="note" placeholder="背景、使い道、関連する投稿案など" />
        </label>
        <button type="submit">追加</button>
      </form>

      <section className="panel">
        <div className="panel-heading">
          <h3>メモ一覧</h3>
          <span>{memos.length}件</span>
        </div>
        <div className="memo-list">
          {memos.map((memo) => (
            <article key={memo.id}>
              <p>{memo.memo}</p>
              {memo.note && <small>{memo.note}</small>}
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}

export default App
