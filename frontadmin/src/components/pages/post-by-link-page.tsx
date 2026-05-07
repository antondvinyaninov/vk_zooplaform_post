import { GroupSelector } from "@/components/posts/group-selector"
import { PostProvider } from "@/components/posts/post-context"
import { PostByLinkForm } from "@/components/posts/post-by-link-form"

export function PostByLinkPage() {
  return (
    <PostProvider>
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-6 py-4 md:py-6 px-4 lg:px-6 h-full">
          
          {/* Header */}
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight">Пост по ссылке</h1>
            <p className="text-muted-foreground">
              Скопируйте оригинальный пост по ссылке и опубликуйте от имени вашей группы с указанием источника.
            </p>
          </div>

          {/* Top Grid: Form & Group Selector */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left Side: Form (spans 2 columns on large screens) */}
            <div className="lg:col-span-2 h-full min-h-[350px]">
              <PostByLinkForm />
            </div>
            
            {/* Right Side: Group Selector (spans 1 column) */}
            <div className="lg:col-span-1 h-[400px] lg:h-[450px]">
              <GroupSelector />
            </div>
          </div>
        </div>
      </div>
    </PostProvider>
  )
}
