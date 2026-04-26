import { QuickPostEditor } from "@/components/posts/quick-post-editor"
import { GroupSelector } from "@/components/posts/group-selector"
import { RecentPostsTable } from "@/components/posts/recent-posts-table"
import { PostProvider } from "@/components/posts/post-context"

export function PostsPage() {
  return (
    <PostProvider>
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-6 py-4 md:py-6 px-4 lg:px-6 h-full">
          
          {/* Header */}
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight">Посты</h1>
            <p className="text-muted-foreground">
              Создание новых публикаций и история отправки.
            </p>
          </div>

          {/* Top Grid: Editor & Group Selector */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left Side: Editor (spans 2 columns on large screens) */}
            <div className="lg:col-span-2 h-full min-h-[350px]">
              <QuickPostEditor />
            </div>
            
            {/* Right Side: Group Selector (spans 1 column) */}
            <div className="lg:col-span-1 h-[400px] lg:h-[450px]">
              <GroupSelector />
            </div>
          </div>

          {/* Bottom Section: Recent Posts */}
          <div className="mt-2">
            <RecentPostsTable />
          </div>
        </div>
      </div>
    </PostProvider>
  )
}
