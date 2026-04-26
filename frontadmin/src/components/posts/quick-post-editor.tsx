import * as React from "react"
import { IconCalendarTime, IconPaperclip, IconPhoto, IconSend, IconVideo } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function QuickPostEditor() {
  const [content, setContent] = React.useState("")

  return (
    <Card className="h-full flex flex-col shadow-md border-muted-foreground/15 overflow-hidden transition-all hover:shadow-lg bg-card">
      <CardHeader className="pb-3 border-b bg-muted/30 px-6 py-4">
        <CardTitle className="text-lg flex items-center gap-2 font-semibold">
          Быстрый пост
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 relative bg-background/50">
        <Textarea
          placeholder="О чем хотите рассказать аудитории?"
          className="min-h-[250px] resize-none border-0 focus-visible:ring-0 rounded-none bg-transparent p-6 text-base shadow-none leading-relaxed"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        
        {/* Placeholder for media attachments preview */}
        <div className="px-4 lg:px-6 pb-4 flex gap-2 empty:hidden">
          {/* Example of how an attachment would look:
          <div className="relative size-20 rounded-md border bg-muted overflow-hidden group">
             <img src="..." className="object-cover size-full" />
          </div>
          */}
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t border-muted-foreground/10 bg-muted/20 px-6 py-4">
        <TooltipProvider>
          <div className="flex items-center gap-1.5 bg-background/50 p-1 rounded-md border shadow-sm">
            <Tooltip>
              <TooltipTrigger render={
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground hover:bg-muted">
                  <IconPhoto className="size-4" />
                  <span className="sr-only">Прикрепить фото</span>
                </Button>
              } />
              <TooltipContent>Добавить фото</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger render={
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground hover:bg-muted">
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

        <Button className="gap-2 px-6 shadow-sm hover:shadow-md transition-shadow" disabled={!content.trim()}>
          <IconSend className="size-4" />
          Опубликовать
        </Button>
      </CardFooter>
    </Card>
  )
}
