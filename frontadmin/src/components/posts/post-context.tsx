"use client"

import * as React from "react"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/api"

interface PostContextType {
  content: string
  setContent: (content: string) => void
  selectedGroups: number[]
  setSelectedGroups: React.Dispatch<React.SetStateAction<number[]>>
  attachments: File[]
  setAttachments: React.Dispatch<React.SetStateAction<File[]>>
  isPublishing: boolean
  publishPosts: () => Promise<void>
}

const PostContext = React.createContext<PostContextType | undefined>(undefined)

export function PostProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = React.useState("")
  const [selectedGroups, setSelectedGroups] = React.useState<number[]>([])
  const [attachments, setAttachments] = React.useState<File[]>([])
  const [isPublishing, setIsPublishing] = React.useState(false)

  const publishPosts = async () => {
    if (!content.trim() && attachments.length === 0) {
      toast.error("Пост не может быть пустым")
      return
    }

    if (selectedGroups.length === 0) {
      toast.error("Выберите хотя бы одну группу для публикации")
      return
    }

    setIsPublishing(true)

    // Временная заглушка для токена (в проде он должен браться из сессии)
    // Но так как у нас бекенд теперь использует сессию, мы можем не передавать access_token в body явно
    // Однако старый vkPostHandler может требовать его, проверим это.
    // Пока передадим пустой токен, если бекенд берет из БД
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
      const formData = new FormData()
      formData.append("owner_id", `-${groupId}`)
      formData.append("message", content)
      formData.append("from_group", "1") // публиковать от имени группы
      
      attachments.forEach((file) => {
        formData.append("photos", file)
      })

      try {
        const response = await fetch(`${API_BASE_URL}/vk/post`, { 
          method: "POST",
          headers: {
            ...(adminToken ? { "Authorization": `Bearer ${adminToken}` } : {})
          },
          body: formData
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
      toast.success(`Пост успешно опубликован в ${successCount} групп`)
      // Очистка формы
      setContent("")
      setAttachments([])
      setSelectedGroups([])
    } else if (successCount > 0 && errorCount > 0) {
      toast.warning(`Опубликовано в ${successCount} групп, ошибок: ${errorCount}`)
    } else {
      toast.error("Не удалось опубликовать пост")
    }
  }

  return (
    <PostContext.Provider
      value={{
        content,
        setContent,
        selectedGroups,
        setSelectedGroups,
        attachments,
        setAttachments,
        isPublishing,
        publishPosts,
      }}
    >
      {children}
    </PostContext.Provider>
  )
}

export function usePostContext() {
  const context = React.useContext(PostContext)
  if (context === undefined) {
    throw new Error("usePostContext must be used within a PostProvider")
  }
  return context
}
