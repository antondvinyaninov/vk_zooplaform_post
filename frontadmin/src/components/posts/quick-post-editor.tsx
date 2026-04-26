"use client"

import * as React from "react"
import { IconCalendarTime, IconPaperclip, IconPhoto, IconSend, IconVideo, IconX } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { usePostContext } from "./post-context"
import { Loader2 } from "lucide-react"

export function QuickPostEditor() {
  const { content, setContent, attachments, setAttachments, isPublishing, publishPosts, selectedGroups } = usePostContext()
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files as FileList)])
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <Card className="h-full flex flex-col shadow-md border-muted-foreground/15 overflow-hidden transition-all hover:shadow-lg bg-card relative">
      {isPublishing && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center flex-col gap-2">
          <Loader2 className="size-8 animate-spin text-primary" />
          <span className="font-medium">Публикация...</span>
        </div>
      )}
      
      <CardHeader className="pb-3 border-b bg-muted/30 px-6 py-4">
        <CardTitle className="text-lg flex items-center gap-2 font-semibold">
          Быстрый пост
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 flex flex-col bg-background/50">
        <Textarea
          placeholder="О чем хотите рассказать аудитории?"
          className="flex-1 min-h-[200px] resize-none border-0 focus-visible:ring-0 rounded-none bg-transparent p-6 text-base shadow-none leading-relaxed"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        
        {/* Превью прикрепленных файлов */}
        <div className="px-4 lg:px-6 pb-4 flex gap-2 flex-wrap empty:hidden">
          {attachments.map((file, index) => {
            const isImage = file.type.startsWith("image/")
            const isVideo = file.type.startsWith("video/")
            const url = URL.createObjectURL(file)
            return (
              <div key={index} className="relative size-20 rounded-md border bg-muted overflow-hidden group shrink-0">
                {isImage ? (
                  <img src={url} className="object-cover size-full" alt="preview" />
                ) : isVideo ? (
                  <video src={url} className="object-cover size-full" />
                ) : (
                  <div className="flex items-center justify-center size-full bg-secondary text-xs p-1 text-center truncate">
                    {file.name}
                  </div>
                )}
                <button 
                  onClick={() => removeAttachment(index)}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <IconX className="size-3" />
                </button>
              </div>
            )
          })}
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t border-muted-foreground/10 bg-muted/20 px-6 py-4">
        <TooltipProvider>
          <div className="flex items-center gap-1.5 bg-background/50 p-1 rounded-md border shadow-sm">
            
            <input 
              type="file" 
              multiple 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange}
              accept="image/*,video/*"
            />
            
            <Tooltip>
              <TooltipTrigger render={
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground hover:bg-muted" onClick={handleFileClick}>
                  <IconPhoto className="size-4" />
                  <span className="sr-only">Прикрепить фото</span>
                </Button>
              } />
              <TooltipContent>Добавить фото</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger render={
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground hover:bg-muted" onClick={handleFileClick}>
                  <IconVideo className="size-4" />
                  <span className="sr-only">Прикрепить видео</span>
                </Button>
              } />
              <TooltipContent>Добавить видео</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger render={
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground hover:bg-muted">
                  <IconPaperclip className="size-4" />
                  <span className="sr-only">Прикрепить файл</span>
                </Button>
              } />
              <TooltipContent>Добавить документ</TooltipContent>
            </Tooltip>
            
            <div className="w-px h-5 bg-border mx-1" />

            <Tooltip>
              <TooltipTrigger render={
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground hover:bg-muted">
                  <IconCalendarTime className="size-4" />
                  <span className="sr-only">Отложенный постинг</span>
                </Button>
              } />
              <TooltipContent>Запланировать публикацию</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        <Button 
          className="gap-2 px-6 shadow-sm hover:shadow-md transition-shadow" 
          disabled={(!content.trim() && attachments.length === 0) || isPublishing || selectedGroups.length === 0}
          onClick={publishPosts}
        >
          {isPublishing ? <Loader2 className="size-4 animate-spin" /> : <IconSend className="size-4" />}
          Опубликовать
        </Button>
      </CardFooter>
    </Card>
  )
}
