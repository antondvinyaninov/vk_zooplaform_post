import useSWR from "swr"
import { IconDotsVertical, IconPhoto, IconAlertCircle } from "@tabler/icons-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { fetcher } from "@/lib/api"

type PostStatus = "published" | "scheduled" | "error" | "pending" | "rejected" | string

interface ApiPost {
  id: number
  message: string
  status: PostStatus
  attachments?: string
  publish_date?: string
  created_at: string
  group?: {
    id: number
    name: string
    photo_200: string
  }
}

function PostStatusBadge({ status }: { status: PostStatus }) {
  switch (status) {
    case "published":
      return <Badge variant="default" className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-emerald-500/20">Опубликовано</Badge>
    case "scheduled":
      return <Badge variant="secondary" className="bg-blue-500/15 text-blue-600 hover:bg-blue-500/25 border-blue-500/20">Отложено</Badge>
    case "error":
      return <Badge variant="destructive" className="bg-destructive/15 text-destructive hover:bg-destructive/25 border-destructive/20">Ошибка</Badge>
    case "pending":
      return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/20">На модерации</Badge>
    case "rejected":
      return <Badge variant="destructive" className="bg-muted text-muted-foreground border-muted-foreground/20">Отклонено</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export function RecentPostsTable() {
  // Fetch pending posts for moderation/recent view
  const { data: posts, error, isLoading } = useSWR<ApiPost[]>("/app/posts", fetcher)

  const displayPosts = posts || []

  return (
    <div className="rounded-xl border border-muted-foreground/15 bg-card shadow-sm overflow-hidden mt-6 mb-8">
      <div className="p-5 border-b bg-muted/20">
        <h3 className="font-semibold text-lg">Недавние публикации</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent bg-muted/5 border-b-muted-foreground/10">
            <TableHead className="w-[400px]">Текст поста</TableHead>
            <TableHead>Группа</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead className="hidden md:table-cell">Дата</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[80%]" />
                  </div>
                </TableCell>
                <TableCell><Skeleton className="size-8 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="size-8 ml-auto" /></TableCell>
              </TableRow>
            ))
          ) : error ? (
            <TableRow>
              <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                <div className="flex flex-col items-center justify-center">
                  <IconAlertCircle className="size-6 text-destructive mb-2" />
                  <p>Ошибка загрузки постов</p>
                </div>
              </TableCell>
            </TableRow>
          ) : displayPosts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                Пока нет ни одного поста
              </TableCell>
            </TableRow>
          ) : (
            displayPosts.map((post) => (
              <TableRow key={post.id}>
                <TableCell>
                  <div className="flex items-start gap-2">
                    {post.attachments && post.attachments.length > 0 && (
                      <div className="mt-0.5 shrink-0 text-muted-foreground">
                        <IconPhoto className="size-4" />
                      </div>
                    )}
                    <p className="line-clamp-2 text-sm max-w-[400px]">
                      {post.message || "Без текста"}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  {post.group ? (
                    <div className="flex items-center gap-2">
                      <img src={post.group.photo_200} alt={post.group.name} className="size-6 rounded-full border bg-muted object-cover" />
                      <span className="text-xs font-medium truncate max-w-[150px]">{post.group.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Нет группы</span>
                  )}
                </TableCell>
                <TableCell>
                  <PostStatusBadge status={post.status} />
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground whitespace-nowrap">
                  {format(new Date(post.publish_date || post.created_at), "d MMM yyyy, HH:mm", { locale: ru })}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={
                      <Button variant="ghost" size="icon" className="size-8">
                        <IconDotsVertical className="size-4" />
                        <span className="sr-only">Меню действий</span>
                      </Button>
                    } />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="cursor-pointer">Редактировать</DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer">Повторить публикацию</DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
                        Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
