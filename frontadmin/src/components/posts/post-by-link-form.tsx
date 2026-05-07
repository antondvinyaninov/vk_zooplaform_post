"use client"

import * as React from "react"
import { toast } from "sonner"
import { IconLink, IconDownload, IconSend } from "@tabler/icons-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { API_BASE_URL } from "@/lib/api"
import { usePostContext } from "./post-context"

interface PreviewAttachment {
  type: string
  url: string
}

interface PostPreview {
  text: string
  attachments: string
  preview: PreviewAttachment[]
}

export function PostByLinkForm() {
  const [link, setLink] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [isPublishing, setIsPublishing] = React.useState(false)
  const [preview, setPreview] = React.useState<PostPreview | null>(null)
  
  // Мы используем PostContext только для получения выбранных групп
  const { selectedGroups } = usePostContext()
  
  // Текст поста, который администратор может редактировать перед отправкой
  const [editedText, setEditedText] = React.useState("")

  const handleLoad = async () => {
    if (!link.trim()) {
      toast.error("Введите ссылку на пост")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/admin/vk/post-by-link?link=${encodeURIComponent(link)}`)
      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.error || "Ошибка загрузки поста")
      }

      setPreview(data.post)
      setEditedText(data.post.text)
      toast.success("Пост успешно загружен")
    } catch (error: any) {
      toast.error(error.message || "Не удалось загрузить пост")
      setPreview(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePublish = async () => {
    if (!preview) return

    if (selectedGroups.length === 0) {
      toast.error("Выберите хотя бы одну группу для публикации (справа)")
      return
    }

    setIsPublishing(true)

    // Токен для запросов в админке
    const authData = localStorage.getItem("admin_user")
    let adminToken = ""
    if (authData) {
      try {
        const parsed = JSON.parse(authData)
        adminToken = parsed.token || ""
      } catch (e) {}
    }

    let successCount = 0
    let errorCount = 0

    for (const groupId of selectedGroups) {
      try {
        const payload = {
          owner_id: `-${groupId}`,
          message: editedText,
          attachments: preview.attachments,
          from_group: 1
        }

        const response = await fetch(`${API_BASE_URL}/vk/copy-post`, { 
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(adminToken ? { "Authorization": `Bearer ${adminToken}` } : {})
          },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          throw new Error("API error")
        }

        const data = await response.json()
        if (data.error) {
           throw new Error(data.error)
        }
        
        successCount++
      } catch (error) {
        console.error(`Failed to post to group ${groupId}:`, error)
        errorCount++
      }
    }

    setIsPublishing(false)

    if (successCount > 0 && errorCount === 0) {
      toast.success(`Успешно опубликовано в ${successCount} групп! 🎉`)
      setLink("")
      setPreview(null)
      setEditedText("")
    } else if (successCount > 0 && errorCount > 0) {
      toast.warning(`Опубликовано в ${successCount} групп, ошибок: ${errorCount}`)
    } else {
      toast.error("Не удалось опубликовать пост")
    }
  }

  return (
    <Card className="h-full flex flex-col shadow-md border-muted-foreground/15">
      <CardHeader className="pb-4 border-b bg-muted/30">
        <CardTitle className="text-lg">Загрузка поста</CardTitle>
        <CardDescription>Вставьте ссылку на запись, которую хотите разместить.</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <IconLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="https://vk.com/wall-165434330_16254" 
              className="pl-9"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
            />
          </div>
          <Button onClick={handleLoad} disabled={isLoading || !link.trim()}>
            {isLoading ? <span className="animate-spin mr-2 border-2 border-current border-t-transparent rounded-full size-4" /> : <IconDownload className="mr-2 size-4" />}
            Загрузить
          </Button>
        </div>

        {preview && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-2">
              <label className="text-sm font-medium">Текст поста (можно редактировать)</label>
              <Textarea 
                className="min-h-[200px] resize-y"
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
              />
            </div>
            
            {preview.preview && preview.preview.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Вложения ({preview.preview.length})</label>
                <div className="flex flex-wrap gap-2">
                  {preview.preview.map((att, idx) => (
                    <div key={idx} className="relative size-24 md:size-32 rounded-md overflow-hidden border bg-muted">
                      {att.type === "photo" && (
                        <img src={att.url} alt="preview" className="object-cover w-full h-full" />
                      )}
                      {att.type === "video" && (
                        <div className="flex items-center justify-center w-full h-full bg-slate-900 text-white flex-col gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                          <span className="text-[10px]">Видео</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {preview && (
        <CardFooter className="border-t bg-muted/10 p-6">
          <Button 
            className="w-full" 
            size="lg"
            onClick={handlePublish}
            disabled={isPublishing}
          >
            {isPublishing ? (
              <span className="animate-spin mr-2 border-2 border-current border-t-transparent rounded-full size-4" />
            ) : (
              <IconSend className="mr-2 size-4" />
            )}
            Опубликовать от имени группы
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
